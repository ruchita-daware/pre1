import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { db } from '@/lib/db'
import { TransportService } from '@/lib/transport/transport-service'
import { DriverDashboardClient } from './DriverDashboardClient'

export const dynamic = 'force-dynamic'

export default async function DriverPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; routeId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/')
  if (!session.tenantId) redirect('/')

  const effectiveRoles = (session.roles && session.roles.length > 0 ? session.roles : [session.role]).filter(Boolean) as string[]
  const hasDriverRole = effectiveRoles.some((r) => ['DRIVER', 'ATTENDANT'].includes(r))
  const isStaffOrAdmin = effectiveRoles.some((r) => ['OWNER', 'PRINCIPAL', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(r))

  if (!hasDriverRole && !isStaffOrAdmin) {
    redirect('/app/dashboard')
  }

  const resolvedParams = searchParams ? await searchParams : undefined
  const initialTab = resolvedParams?.tab || 'overview'
  const activeRouteIdParam = resolvedParams?.routeId

  // 1. Fetch user & staff profile
  const [user, staffProfile, branch] = await Promise.all([
    db.user.findUnique({
      where: { id: session.uid },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        status: true,
      },
    }),
    db.staffProfile.findFirst({
      where: { userId: session.uid, tenantId: session.tenantId, deletedAt: null },
      select: {
        id: true,
        employeeCode: true,
        designation: true,
        department: true,
        status: true,
        branchId: true,
      },
    }),
    session.branchId
      ? db.branch.findUnique({
        where: { id: session.branchId },
        select: { id: true, name: true, code: true },
      })
      : Promise.resolve(null),
  ])

  // 2. Ensure recurring daily trips are generated for today before fetching
  await TransportService.ensureDailyTripsForDate(
    {
      tenantId: session.tenantId,
      branchId: session.branchId || undefined,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    },
    new Date()
  ).catch((err) => {
    console.warn('[DriverPage] ensureDailyTripsForDate error:', err)
  })

  // 3. Fetch assigned routes with vehicle, stops and assigned students
  console.log('[DriverPage] session.uid:', session.uid, 'staffProfile:', staffProfile?.id)
  const routes = await db.transportRoute.findMany({
    where: {
      tenantId: session.tenantId,
      deletedAt: null,
      ...(staffProfile
        ? {
          OR: [
            { driverProfileId: staffProfile.id },
            { attendantProfileId: staffProfile.id },
          ],
        }
        : isStaffOrAdmin
          ? {}
          : { id: '__no_access__' }),
    },
    include: {
      vehicle: true,
      branch: { select: { id: true, name: true, code: true } },
      stops: { orderBy: { sequence: 'asc' } },
      assignments: {
        where: { status: 'ACTIVE', deletedAt: null },
        include: {
          pickupStop: true,
          dropStop: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNo: true,
              photoUrl: true,
              dob: true,
              gender: true,
              currentClassroom: { select: { id: true, name: true } },
              branchId: true,
              guardians: {
                include: {
                  guardian: {
                    select: {
                      id: true,
                      fullName: true,
                      phone: true,
                      email: true,
                      relationship: true,
                      pickupPin: true,
                    },
                  },
                },
                orderBy: [{ isPrimary: 'desc' }, { emergencyPriority: 'asc' }],
              },
            },
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  })
  console.log('[DriverPage] routes found:', routes.length, routes.map((r) => r.name))

  // 4. Fetch today's trips
  const routeIds = routes.map((r) => r.id)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todayTrips = routeIds.length > 0
    ? await db.transportTrip.findMany({
      where: {
        tenantId: session.tenantId,
        routeId: { in: routeIds },
        tripDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        manifest: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNo: true,
                photoUrl: true,
                currentClassroom: { select: { id: true, name: true } },
              },
            },
            stop: true,
          },
        },
        vehicle: true,
        route: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    : []

  return (
    <DriverDashboardClient
      session={session}
      driverUser={user}
      staffProfile={staffProfile}
      branch={branch}
      routes={routes}
      initialTrips={todayTrips}
      initialTab={initialTab}
      initialRouteId={activeRouteIdParam}
    />
  )
}
