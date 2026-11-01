import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, requireBranchAccess } from '@/lib/auth-api'
import { TransportService } from '@/lib/transport/transport-service'

/**
 * GET /api/v1/transport/drivers/[id] — Get driver details
 */
async function _GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, 'transport:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')
  const { id } = await params

  try {
    const driver = await TransportService.getDriver(
      {
        tenantId: session.tenantId,
        actorId: session.uid,
        actorName: session.name,
        actorRole: session.role,
      },
      id
    )

    if (!driver) return Errors.notFound('Driver profile not found')
    return ok(driver)
  } catch (e: any) {
    return Errors.system(e)
  }
}

/**
 * PATCH /api/v1/transport/drivers/[id] — Update driver information & license
 */
async function _PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, 'transport:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')
  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    const {
      licenseNumber,
      licenseExpiry,
      licenseCategory,
      emergencyContactName,
      emergencyContactPhone,
      status,
      branchId,
    } = body

    if (branchId) {
      const branchCheck = await requireBranchAccess(session, branchId)
      if (branchCheck) return branchCheck
    }

    const updated = await TransportService.updateDriver(
      {
        tenantId: session.tenantId,
        actorId: session.uid,
        actorName: session.name,
        actorRole: session.role,
      },
      id,
      {
        licenseNumber,
        licenseExpiry,
        licenseCategory,
        emergencyContactName,
        emergencyContactPhone,
        status,
        branchId,
      }
    )

    return ok({ driver: updated })
  } catch (e: any) {
    if (e.message?.includes('not found')) return Errors.notFound(e.message)
    return Errors.badRequest(e.message)
  }
}

export const GET = withApi(_GET)
export const PATCH = withApi(_PATCH)
