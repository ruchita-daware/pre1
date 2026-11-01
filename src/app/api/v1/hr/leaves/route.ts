import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, requireBranchAccess, getAuthorizedBranchIds } from '@/lib/auth-api'
import { LeaveService } from '@/lib/hr/leave-service'

async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'hr:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const sp = req.nextUrl.searchParams
    const status = sp.get('status') || undefined
    const requestedStaffProfileId = sp.get('staffProfileId') || undefined
    const requestedBranchId = sp.get('branchId') || undefined
    const balancesOnly = sp.get('balances') === 'true'

    const myProfile = await db.staffProfile.findFirst({
      where: { userId: session.uid, tenantId: session.tenantId, deletedAt: null },
    })

    const isPrivileged =
      ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(session.role) ||
      Boolean(session.roles && session.roles.some((r: string) => ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN'].includes(r)))

    const canApprove = isPrivileged || Boolean(session.permissions?.includes('hr:approve' as any))

    // Staff Self-Service Balances Request
    if (balancesOnly) {
      const targetStaffId = requestedStaffProfileId || myProfile?.id
      if (!targetStaffId) return Errors.notFound('Staff profile')
      if (targetStaffId !== myProfile?.id && !canApprove) {
        return Errors.forbidden('You can only view your own leave balances.')
      }
      const now = new Date()
      const fiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
      const balances = await LeaveService.getOrCreateBalances(session.tenantId, targetStaffId, fiscalYear)
      return ok(balances)
    }

    if (requestedBranchId) {
      const branchCheck = await requireBranchAccess(session, requestedBranchId)
      if (branchCheck) return branchCheck
    }

    const authorizedBranches = await getAuthorizedBranchIds(session)
    if (authorizedBranches !== null && authorizedBranches.length === 0) {
      return ok([])
    }

    // Role-based scope filter
    let staffFilter: any = {}
    if (!canApprove) {
      // Regular Staff: Self-scoped only
      staffFilter = { staffProfileId: myProfile ? myProfile.id : 'none' }
    } else {
      // Managers / Approvers: Branch-scoped
      const branchConstraint = requestedBranchId
        ? { branchId: requestedBranchId }
        : authorizedBranches !== null
        ? { branchId: { in: authorizedBranches } }
        : {}

      staffFilter = {
        ...(requestedStaffProfileId ? { staffProfileId: requestedStaffProfileId } : {}),
        staffProfile: {
          ...branchConstraint,
          deletedAt: null,
        },
      }
    }

    const requests = await db.leaveRequest.findMany({
      where: {
        tenantId: session.tenantId,
        ...(status ? { status: status as any } : {}),
        ...staffFilter,
      },
      include: {
        staffProfile: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            branch: { select: { id: true, name: true } },
          },
        },
        leaveType: true,
        coverages: {
          include: { classroom: true },
        },
      },
      orderBy: { appliedAt: 'desc' },
    })

    return ok(requests)
  } catch (e) {
    return Errors.system(e)
  }
}

async function _POST(req: NextRequest) {
  const session = await requireApi(req)
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json()
    const { leaveTypeId, startDate, endDate, reason, isHalfDay } = body

    const myProfile = await db.staffProfile.findFirst({
      where: { userId: session.uid, tenantId: session.tenantId, deletedAt: null },
    })

    const isPrivileged =
      ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(session.role) ||
      Boolean(session.roles && session.roles.some((r: string) => ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN'].includes(r)))

    let staffProfileId = body.staffProfileId
    if (staffProfileId && staffProfileId !== myProfile?.id && !isPrivileged) {
      return Errors.forbidden('Staff self-service: You can only submit leave applications for yourself.')
    }

    if (!staffProfileId) {
      if (!myProfile) return Errors.notFound('Staff profile for current user')
      staffProfileId = myProfile.id
    }

    const leave = await LeaveService.applyLeave({
      tenantId: session.tenantId,
      staffProfileId,
      leaveTypeId,
      startDate,
      endDate,
      reason,
      isHalfDay: Boolean(isHalfDay),
    })

    return ok(leave)
  } catch (e: any) {
    return Errors.validation(e.message || 'Failed to submit leave request')
  }
}

export const GET = withApi(_GET)
export const POST = withApi(_POST)
