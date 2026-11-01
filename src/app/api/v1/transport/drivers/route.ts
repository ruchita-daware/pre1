import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, getAuthorizedBranchIds, requireBranchAccess } from '@/lib/auth-api'
import { TransportService } from '@/lib/transport/transport-service'

/**
 * GET /api/v1/transport/drivers — List verified transport drivers with license & route assignments
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'transport:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const { searchParams } = new URL(req.url)
    const requestedBranchId = searchParams.get('branchId') || undefined
    const search = searchParams.get('search') || undefined

    if (requestedBranchId) {
      const branchCheck = await requireBranchAccess(session, requestedBranchId)
      if (branchCheck) return branchCheck
    }

    const authorizedBranches = await getAuthorizedBranchIds(session)
    if (authorizedBranches !== 'ALL' && authorizedBranches.length === 0) {
      return ok([])
    }

    const branchToUse = requestedBranchId || (authorizedBranches === 'ALL' ? undefined : session.branchId)

    const drivers = await TransportService.listDrivers(
      {
        tenantId: session.tenantId,
        branchId: branchToUse,
        actorId: session.uid,
        actorName: session.name,
        actorRole: session.role,
      },
      { branchId: branchToUse, search }
    )

    return ok(drivers)
  } catch (e: any) {
    return Errors.system(e)
  }
}

/**
 * POST /api/v1/transport/drivers — Onboard or register a driver
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req, 'transport:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json().catch(() => ({}))
    const {
      staffProfileId,
      branchId,
      employeeCode,
      fullName,
      phone,
      email,
      licenseNumber,
      licenseExpiry,
      licenseCategory,
      emergencyContactName,
      emergencyContactPhone,
    } = body

    const targetBranchId = branchId || session.branchId
    if (targetBranchId) {
      const branchCheck = await requireBranchAccess(session, targetBranchId)
      if (branchCheck) return branchCheck
    }

    const driver = await TransportService.registerDriver(
      {
        tenantId: session.tenantId,
        branchId: targetBranchId,
        actorId: session.uid,
        actorName: session.name,
        actorRole: session.role,
      },
      {
        staffProfileId,
        branchId: targetBranchId,
        employeeCode,
        fullName,
        phone,
        email,
        licenseNumber,
        licenseExpiry,
        licenseCategory,
        emergencyContactName,
        emergencyContactPhone,
      }
    )

    return ok(driver, undefined, 201)
  } catch (e: any) {
    if (e.message?.includes('already in use')) {
      return Errors.conflict('EMPLOYEE_CODE_EXISTS', e.message)
    }
    return Errors.badRequest(e.message)
  }
}

export const GET = withApi(_GET)
export const POST = withApi(_POST)
