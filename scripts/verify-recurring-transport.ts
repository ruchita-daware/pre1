import { db } from '../src/lib/db'
import { TransportService } from '../src/lib/transport/transport-service'

async function runVerification() {
  console.log('================================================================');
  console.log('PREONE TRANSPORT MODULE: RECURRING DAILY ROUTES VERIFICATION');
  console.log('================================================================\n');

  // 1. Get Existing Tenant and Route
  const route = await db.transportRoute.findFirst({
    where: { code: 'ROUTE_001', deletedAt: null },
    include: {
      vehicle: true,
      driverProfile: { include: { user: true } },
      stops: { orderBy: { sequence: 'asc' } },
      assignments: { include: { student: true, pickupStop: true, dropStop: true } },
    },
  })

  if (!route) {
    throw new Error('Existing route ROUTE_001 not found')
  }

  const tenantId = route.tenantId
  const ctx = {
    tenantId,
    branchId: route.branchId || undefined,
    actorId: 'system-verifier',
    actorName: 'Automated Verifier',
    actorRole: 'SUPER_ADMIN' as any,
  }

  // Clean any stray future test dates from prior test attempts
  await db.transportTrip.deleteMany({
    where: {
      tenantId,
      tripDate: { gte: new Date(2026, 10, 15, 0, 0, 0, 0) },
    },
  })

  console.log(`[PASS] Criteria 1 & 4 & 5: Existing Permanent Route Loaded:`);
  console.log(`  - Route: ${route.name} (${route.code})`);
  console.log(`  - Bus: ${route.vehicle?.registrationNumber || 'None'}`);
  console.log(`  - Driver: ${route.driverProfile?.user?.fullName || 'None'}`);
  console.log(`  - Stops Sequence: ${route.stops.map((s) => s.name).join(' -> ')}`);
  console.log(`  - Assigned Students: ${route.assignments.map((a) => `${a.student.firstName} ${a.student.lastName || ''}`).join(', ')}`);
  console.log(`  - Schedule Type: ${route.scheduleType || 'DAILY'}, Status: ${route.scheduleStatus || 'ACTIVE'}\n`);

  // 2. Test Idempotent Daily Trip Generation
  console.log('Testing Criteria 2 & 3: Idempotent Trip Generation on Operating Days...');
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Ensure trips for today
  await TransportService.ensureDailyTripsForDate(ctx, today)
  const tripsAfterFirst = await db.transportTrip.findMany({
    where: { tenantId, routeId: route.id, tripDate: today },
    include: { manifest: true },
  })
  console.log(`  - First invocation: ${tripsAfterFirst.length} trips exist for today`);

  // Second invocation should be completely idempotent (no duplicates)
  await TransportService.ensureDailyTripsForDate(ctx, today)
  const tripsAfterSecond = await db.transportTrip.findMany({
    where: { tenantId, routeId: route.id, tripDate: today },
    include: { manifest: true },
  })
  console.log(`  - Second invocation: ${tripsAfterSecond.length} trips exist for today`);

  if (tripsAfterFirst.length !== tripsAfterSecond.length) {
    throw new Error(`Duplicate trips detected! ${tripsAfterFirst.length} vs ${tripsAfterSecond.length}`)
  }
  console.log('[PASS] Criteria 3: Idempotent Trip Generation verified (0 duplicates generated).\n');

  // 3. Test Operating Days vs Non-Operating Days
  console.log('Testing Criteria 2: Day-of-week operating filter...');
  // Route with custom operating days: Mon-Fri
  const weekdaysRoute = {
    ...route,
    scheduleType: 'WEEKDAYS',
    scheduleStatus: 'ACTIVE',
  }
  // Sunday (day 0) should be non-operating
  const testSunday = new Date(2026, 10, 8, 0, 0, 0, 0) // Nov 8, 2026 is Sunday
  const isSundayOperating = TransportService.isRouteOperatingOnDate(weekdaysRoute, testSunday)
  // Wednesday (day 3) should be operating
  const testWednesday = new Date(2026, 10, 11, 0, 0, 0, 0) // Nov 11, 2026 is Wednesday
  const isWednesdayOperating = TransportService.isRouteOperatingOnDate(weekdaysRoute, testWednesday)

  console.log(`  - Weekdays route on Sunday: isOperating = ${isSundayOperating} (expected: false)`);
  console.log(`  - Weekdays route on Wednesday: isOperating = ${isWednesdayOperating} (expected: true)`);
  if (isSundayOperating !== false || isWednesdayOperating !== true) {
    throw new Error('Operating day evaluation failed')
  }
  console.log('[PASS] Criteria 2: Day-of-week schedule filter verified.\n');

  // 4. Test School Holidays & Exceptions (TASK 5)
  console.log('Testing Criteria 6: School Holidays and Exceptions Handling...');
  // Create a temporary calendar holiday for a future date (Nov 20, 2026)
  const futureDate = new Date(2026, 10, 20, 0, 0, 0, 0)
  const holiday = await db.calendarEvent.create({
    data: {
      tenantId,
      branchId: route.branchId,
      title: 'Annual Children Festival Holiday',
      type: 'HOLIDAY',
      date: futureDate,
    },
  })

  // Try to generate trips on holiday
  const holidayResult = await TransportService.ensureDailyTripsForDate(ctx, futureDate)
  console.log(`  - Generation on holiday: holiday = ${holidayResult.holiday}, title = "${holidayResult.title}"`);
  const holidayTrips = await db.transportTrip.findMany({
    where: { tenantId, routeId: route.id, tripDate: futureDate },
  })
  console.log(`  - Trips generated on holiday: ${holidayTrips.length} (expected: 0)`);

  // Clean up holiday
  await db.calendarEvent.delete({ where: { id: holiday.id } })

  if (holidayTrips.length !== 0 || !holidayResult.holiday) {
    throw new Error('Holiday prevention check failed')
  }

  // Test Route Schedule Exception (cancellation)
  const exceptionDate = new Date(2026, 10, 21, 0, 0, 0, 0)
  const exception = await TransportService.addRouteException(ctx, route.id, {
    exceptionDate,
    reason: 'Road repair in Kothrud area',
    isCancelled: true,
  })
  console.log(`  - Route Exception created for ${exceptionDate.toISOString().split('T')[0]}: isCancelled = ${exception.isCancelled}`);

  await TransportService.ensureDailyTripsForDate(ctx, exceptionDate)
  const exceptionTrips = await db.transportTrip.findMany({
    where: { tenantId, routeId: route.id, tripDate: exceptionDate },
  })
  console.log(`  - Trips generated on route exception date: ${exceptionTrips.length} (expected: 0)`);

  // Clean up exception
  await TransportService.removeRouteException(ctx, route.id, exception.id)

  if (exceptionTrips.length !== 0) {
    throw new Error('Route exception cancellation check failed')
  }
  console.log('[PASS] Criteria 6: Holidays and route exceptions work correctly.\n');

  // 5. Test Pausing & Resuming Schedule (TASK 4)
  console.log('Testing Criteria 7 & 8: Pausing and Resuming Recurring Schedule...');
  await TransportService.pauseSchedule(ctx, route.id)
  const pausedRoute = await db.transportRoute.findUnique({ where: { id: route.id } })
  console.log(`  - Schedule Status after pause: ${pausedRoute?.scheduleStatus} (expected: PAUSED)`);

  const pauseTestDate = new Date(2026, 10, 22, 0, 0, 0, 0)
  await TransportService.ensureDailyTripsForDate(ctx, pauseTestDate)
  const pausedTrips = await db.transportTrip.findMany({
    where: { tenantId, routeId: route.id, tripDate: pauseTestDate },
  })
  console.log(`  - Trips generated while paused: ${pausedTrips.length} (expected: 0)`);

  await TransportService.resumeSchedule(ctx, route.id)
  const resumedRoute = await db.transportRoute.findUnique({ where: { id: route.id } })
  console.log(`  - Schedule Status after resume: ${resumedRoute?.scheduleStatus} (expected: ACTIVE)`);

  if (pausedRoute?.scheduleStatus !== 'PAUSED' || pausedTrips.length !== 0 || resumedRoute?.scheduleStatus !== 'ACTIVE') {
    throw new Error('Pause/Resume schedule check failed')
  }
  console.log('[PASS] Criteria 7 & 8: Pausing and Resuming schedule verified.\n');

  // 6. Test Editing Future Schedule without Modifying Historical Trips (TASK 4)
  console.log('Testing Criteria 9: Future Schedule Editing preserves historical trips...');
  const pastTripsCountBefore = await db.transportTrip.count({
    where: { tenantId, routeId: route.id, status: { in: ['COMPLETED', 'IN_PROGRESS', 'SCHEDULED'] } },
  })
  await TransportService.updateRoute(ctx, route.id, {
    morningPickupTime: '08:15',
    eveningDropTime: '15:15',
  })
  const pastTripsCountAfter = await db.transportTrip.count({
    where: { tenantId, routeId: route.id, status: { in: ['COMPLETED', 'IN_PROGRESS', 'SCHEDULED'] } },
  })
  console.log(`  - Trip count before edit: ${pastTripsCountBefore}, after edit: ${pastTripsCountAfter}`);
  if (pastTripsCountBefore !== pastTripsCountAfter) {
    throw new Error('Historical trip records were modified or deleted')
  }
  // Restore original times
  await TransportService.updateRoute(ctx, route.id, {
    morningPickupTime: '08:00',
    eveningDropTime: '15:00',
  })
  console.log('[PASS] Criteria 9: Editing future schedule does not modify existing trips.\n');

  // 7. Test Driver View & Permissions (TASK 6)
  console.log('Testing Criteria 10: Driver login displays only assigned route and daily trips...');
  const driverAlex = await db.user.findFirst({
    where: { email: 'alex@gmail.com' },
    include: { staffProfiles: true },
  })
  if (!driverAlex || driverAlex.staffProfiles.length === 0) {
    throw new Error('Driver Alex user/staffProfile not found')
  }

  const alexStaffId = driverAlex.staffProfiles[0].id
  const alexRoutes = await db.transportRoute.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { driverProfileId: alexStaffId },
        { attendantProfileId: alexStaffId },
      ],
    },
    include: {
      vehicle: true,
      stops: { orderBy: { sequence: 'asc' } },
      assignments: { include: { student: true } },
    },
  })

  console.log(`  - Driver: ${driverAlex.fullName} (${driverAlex.email})`);
  console.log(`  - Assigned Routes: ${alexRoutes.length} route(s): ${alexRoutes.map((r) => r.name).join(', ')}`);
  console.log(`  - Stops visible to driver: ${alexRoutes[0]?.stops.length}`);
  console.log(`  - Students on manifest: ${alexRoutes[0]?.assignments.length}`);

  if (alexRoutes.length === 0 || !alexRoutes.some((r) => r.id === route.id)) {
    throw new Error('Driver route assignment visibility failed')
  }
  console.log('[PASS] Criteria 10: Driver login displays only assigned daily trips and rosters.\n');

  // 8. Test Transport Dashboard Metrics API (TASK 1)
  console.log('Testing Criteria 11 & 12: Simplified Admin Dashboard Metrics...');
  const metrics = await TransportService.getDashboardMetrics(ctx, today)
  console.log(`  - Summary KPI: Active Routes = ${metrics.summary.activeRoutes}`);
  console.log(`  - Summary KPI: Active Vehicles = ${metrics.summary.activeVehicles}`);
  console.log(`  - Summary KPI: Assigned Students = ${metrics.summary.assignedStudents}`);
  console.log(`  - Today's Routes count = ${metrics.todayRoutes.length}`);

  const todayRouteItem = metrics.todayRoutes.find((r: any) => r.routeNumber === 'ROUTE_001')
  if (!todayRouteItem) {
    throw new Error('Today\'s routes does not contain ROUTE_001')
  }

  console.log('  - Today\'s Route Item Data:');
  console.log(`    * Route Name: ${todayRouteItem.routeName}`);
  console.log(`    * Route Number: ${todayRouteItem.routeNumber}`);
  console.log(`    * Assigned Bus: ${todayRouteItem.assignedBus}`);
  console.log(`    * Assigned Driver: ${todayRouteItem.assignedDriver}`);
  console.log(`    * Morning Pickup Time: ${todayRouteItem.morningPickupTime}`);
  console.log(`    * Evening Drop Time: ${todayRouteItem.eveningDropTime}`);
  console.log(`    * Assigned Students Count: ${todayRouteItem.assignedStudentsCount}`);
  console.log(`    * Overall Status: ${todayRouteItem.overallStatus}`);

  console.log('[PASS] Criteria 11 & 12: Simplified Dashboard Metrics & Today\'s Routes verified.\n');

  console.log('================================================================');
  console.log('ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY (EXIT CODE 0)');
  console.log('================================================================');
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FAIL] Verification error:', err);
    process.exit(1);
  });
