import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, getAuthorizedBranchIds } from '@/lib/auth-api'

/**
 * GET /api/v1/hr — Live DB-aggregated HR Dashboard Metrics
 * Strictly branch-isolated for branch accountants and principals.
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'hr:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const tenantId = session.tenantId
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const authorizedBranches = await getAuthorizedBranchIds(session)
    const branchFilter = authorizedBranches !== null
      ? { branchId: { in: authorizedBranches } }
      : {}

    // 1. Staff Headcount Counts
    const [totalStaff, activeStaff, onProbation] = await Promise.all([
      db.staffProfile.count({ where: { tenantId, deletedAt: null, ...branchFilter } }),
      db.staffProfile.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null, ...branchFilter } }),
      db.staffProfile.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          probationEndDate: { gte: today },
          deletedAt: null,
          ...branchFilter,
        },
      }),
    ])

    // 2. Attendance Counts Today
    const todayAttendance = await db.attendanceStaff.groupBy({
      by: ['status'],
      where: { tenantId, date: today, ...branchFilter },
      _count: { _all: true },
    })
    const attMap = new Map(todayAttendance.map((a) => [a.status, a._count._all]))
    const presentToday = (attMap.get('PRESENT') || 0) + (attMap.get('LATE') || 0)
    const onLeaveToday = attMap.get('ON_LEAVE') || 0
    const absentToday = attMap.get('ABSENT') || 0

    // 3. Pending Approvals
    const leaveBranchFilter = authorizedBranches !== null
      ? { staffProfile: { branchId: { in: authorizedBranches } } }
      : {}
    const [pendingLeaves, openPositions, pendingResignations] = await Promise.all([
      db.leaveRequest.count({ where: { tenantId, status: 'PENDING', ...leaveBranchFilter } }),
      db.jobOpening.count({
        where: {
          tenantId,
          status: 'OPEN',
          ...(authorizedBranches !== null ? { branchId: { in: authorizedBranches } } : {}),
        },
      }),
      db.resignationRequest.count({ where: { tenantId, status: 'SUBMITTED' } }),
    ])

    // 4. POSH Expiring or Overdue Count
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)

    const poshDue = await db.staffTraining.count({
      where: {
        tenantId,
        trainingType: 'POSH',
        expiryDate: { lte: in30Days },
        ...(authorizedBranches !== null ? { staffProfile: { branchId: { in: authorizedBranches } } } : {}),
      },
    })

    // 5. Active Payroll Cycle summary
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()
    const latestCycle = await db.payrollCycle.findFirst({
      where: {
        tenantId,
        month: currentMonth,
        year: currentYear,
        ...(authorizedBranches !== null ? { OR: [{ branchId: { in: authorizedBranches } }, { branchId: null }] } : {}),
      },
      select: { id: true, status: true, totalNetPayable: true, totalStaff: true },
    })

    // 6. Branch Distribution
    const byBranch = await db.staffProfile.groupBy({
      by: ['branchId'],
      where: { tenantId, status: 'ACTIVE', deletedAt: null, ...branchFilter },
      _count: { _all: true },
    })
    const branches = await db.branch.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(authorizedBranches !== null ? { id: { in: authorizedBranches } } : {}),
      },
      select: { id: true, name: true },
    })
    const branchNameMap = new Map(branches.map((b) => [b.id, b.name]))
    const staffByBranch = byBranch.map((b) => ({
      branchId: b.branchId,
      branchName: b.branchId ? (branchNameMap.get(b.branchId) || 'Unknown') : 'Unassigned',
      count: b._count._all,
    }))

    const isPrivileged =
      ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(session.role) ||
      (session.roles && session.roles.some((r: string) => ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN'].includes(r)))

    return ok({
      metrics: {
        totalStaff,
        activeStaff,
        onProbation,
        presentToday,
        absentToday,
        onLeaveToday,
        pendingLeaves,
        openPositions,
        pendingResignations,
        poshDue,
        latestPayrollStatus: latestCycle?.status || 'NOT_STARTED',
        latestPayrollNet: latestCycle?.totalNetPayable ? Number(latestCycle.totalNetPayable) : 0,
      },
      staffByBranch,
      session: {
        userId: session.uid,
        name: session.name,
        role: session.role,
        roles: session.roles || [session.role],
        branchId: session.branchId || (authorizedBranches && authorizedBranches[0]) || null,
        authorizedBranches: authorizedBranches,
        isPrivileged,
      },
    })
  } catch (e) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
