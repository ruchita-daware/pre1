import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function createTestDriver() {
  console.log('=== CREATING TEST DRIVER ACCOUNT & ASSIGNING STUDENTS ===')

  const tenant = await db.tenant.findFirst({ where: { code: 'SUNSHINE' } })
  if (!tenant) throw new Error('Tenant SUNSHINE not found')

  const branch = await db.branch.findFirst({
    where: { tenantId: tenant.id, name: 'PreOne' },
  })
  if (!branch) throw new Error('PreOne branch not found')

  const passwordHash = await bcrypt.hash('Driver@123', 10)

  // 1. Create or update Driver User
  const driverUser = await db.user.upsert({
    where: { email: 'driver.test@sunshine.demo' },
    create: {
      email: 'driver.test@sunshine.demo',
      username: 'driver.test',
      phone: '+919876543201',
      fullName: 'Ramesh Kumar (Test Driver)',
      passwordHash,
      status: 'ACTIVE',
      locale: 'en-IN',
    },
    update: {
      username: 'driver.test',
      phone: '+919876543201',
      fullName: 'Ramesh Kumar (Test Driver)',
      passwordHash,
      status: 'ACTIVE',
      locale: 'en-IN',
    },
  })
  console.log('Driver User ID:', driverUser.id)

  // 2. TenantUser membership with DRIVER role
  await db.tenantUser.upsert({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: driverUser.id },
    },
    create: {
      tenantId: tenant.id,
      userId: driverUser.id,
      branchId: branch.id,
      role: 'DRIVER' as any,
      roles: ['DRIVER'] as any,
      status: 'ACTIVE',
    },
    update: {
      branchId: branch.id,
      role: 'DRIVER' as any,
      roles: ['DRIVER'] as any,
      status: 'ACTIVE',
    },
  })

  // 3. StaffProfile for Driver
  const staffProfile = await db.staffProfile.upsert({
    where: {
      tenantId_employeeCode: { tenantId: tenant.id, employeeCode: 'DRV-TEST-01' },
    },
    create: {
      tenantId: tenant.id,
      userId: driverUser.id,
      branchId: branch.id,
      employeeCode: 'DRV-TEST-01',
      designation: 'School Bus Driver',
      department: 'Transport',
      status: 'ACTIVE',
      joiningDate: new Date('2024-01-01'),
      qualification: JSON.stringify({
        licenseNumber: 'MH12-20240098765',
        licenseCategory: 'HMV/Transport',
        licenseExpiry: '2029-12-31',
      }),
    },
    update: {
      userId: driverUser.id,
      branchId: branch.id,
      designation: 'School Bus Driver',
      department: 'Transport',
      status: 'ACTIVE',
    },
  })
  console.log('Driver StaffProfile ID:', staffProfile.id)

  // 4. Assign Driver to Route 'PreOne Express Route'
  const route = await db.transportRoute.findUnique({
    where: { id: 'e21ec6b6-4ee7-4eb9-a75a-ad1239f7dc07' },
    include: { stops: true, vehicle: true },
  })
  if (!route) throw new Error('PreOne Express Route not found')

  await db.transportRoute.update({
    where: { id: route.id },
    data: { driverProfileId: staffProfile.id },
  })
  console.log(`Assigned Driver ${staffProfile.employeeCode} to Route ${route.name} (${route.code})`)

  // 5. Get assigned students on this route
  const assignments = await db.studentTransportAssignment.findMany({
    where: { routeId: route.id, status: 'ACTIVE' },
    include: { student: true, pickupStop: true, dropStop: true },
  })
  console.log(`Found ${assignments.length} students assigned to this route.`)

  // 6. Create a live TransportTrip for TODAY so the driver sees their active run immediately
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Delete today's trip if exists so we can re-create fresh
  await db.tripManifestItem.deleteMany({
    where: { trip: { routeId: route.id, tripDate: today, tripType: 'MORNING' } },
  })
  await db.transportTrip.deleteMany({
    where: { tenantId: tenant.id, routeId: route.id, tripDate: today, tripType: 'MORNING' },
  })

  const trip = await db.transportTrip.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      routeId: route.id,
      vehicleId: route.vehicleId || '1c7af6d9-581d-4f0b-b722-b8e0cab43f86',
      driverProfileId: staffProfile.id,
      tripDate: today,
      tripType: 'MORNING',
      status: 'SCHEDULED',
      scheduledStartTime: '08:00',
      manifest: {
        create: assignments.map((a) => ({
          studentId: a.studentId,
          stopId: a.pickupStopId,
          status: 'EXPECTED',
        })),
      },
    },
    include: {
      manifest: {
        include: {
          student: true,
          stop: true,
        },
      },
    },
  })

  console.log(`Created Active Trip ${trip.id} for Today (${today.toISOString().split('T')[0]}) with ${trip.manifest.length} students on manifest.`)

  console.log('\n======================================================')
  console.log('DRIVER LOGIN CREDENTIALS:')
  console.log('------------------------------------------------------')
  console.log('School Code / Tenant :', tenant.code, `(${tenant.name})`)
  console.log('Login Username       : driver.test')
  console.log('Login Email          : driver.test@sunshine.demo')
  console.log('Login Phone          : +919876543201')
  console.log('Password             : Driver@123')
  console.log('User ID              :', driverUser.id)
  console.log('Staff Profile ID     :', staffProfile.id)
  console.log('Role                 : DRIVER')
  console.log('Assigned Route       :', route.name, `(${route.code})`)
  console.log('Assigned Vehicle     :', route.vehicle?.registrationNumber || 'MH-BUS-B100-2026')
  console.log('Students in Manifest :', trip.manifest.length)
  console.log('Sample Students      :')
  trip.manifest.slice(0, 5).forEach((m, idx) => {
    console.log(`  ${idx + 1}. ${m.student.firstName} ${m.student.lastName} (${m.student.admissionNo}) — Stop: ${m.stop?.name}`)
  })
  console.log('======================================================\n')
}

createTestDriver().catch(console.error).finally(() => process.exit(0))
