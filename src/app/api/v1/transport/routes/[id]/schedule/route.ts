import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { TransportService } from '@/lib/transport/transport-service'

/**
 * GET /api/v1/transport/routes/[id]/schedule — Get recurring schedule & calendar details
 */
async function _GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, 'transport:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')
  const { id } = await params

  try {
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const year = Number(searchParams.get('year')) || now.getFullYear()
    const month = Number(searchParams.get('month')) || now.getMonth() + 1

    const context = {
      tenantId: session.tenantId,
      branchId: session.branchId || undefined,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    }

    const calendar = await TransportService.getRouteScheduleCalendar(context, id, year, month)
    return ok(calendar)
  } catch (e: any) {
    if (e.message?.includes('not found')) return Errors.notFound(e.message)
    return Errors.system(e)
  }
}

/**
 * PATCH /api/v1/transport/routes/[id]/schedule — Pause, Resume, Edit Future, or Cancel Future Trips
 */
async function _PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, 'transport:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')
  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    const { action } = body

    const context = {
      tenantId: session.tenantId,
      branchId: session.branchId || undefined,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    }

    if (action === 'pause') {
      const updated = await TransportService.pauseSchedule(context, id)
      return ok({ success: true, action: 'pause', route: updated })
    }

    if (action === 'resume') {
      const updated = await TransportService.resumeSchedule(context, id)
      return ok({ success: true, action: 'resume', route: updated })
    }

    if (action === 'cancel_future') {
      const fromDate = body.fromDate ? new Date(body.fromDate) : new Date()
      const result = await TransportService.cancelFutureTrips(context, id, fromDate)
      return ok({ success: true, action: 'cancel_future', cancelledCount: result.count })
    }

    if (action === 'update') {
      const {
        scheduleType,
        scheduleStatus,
        operatingDays,
        startDate,
        endDate,
        morningPickupTime,
        eveningDropTime,
        vehicleId,
        driverProfileId,
      } = body

      const updated = await TransportService.updateRoute(context, id, {
        scheduleType,
        scheduleStatus,
        operatingDays,
        startDate,
        endDate,
        morningPickupTime,
        eveningDropTime,
        vehicleId,
        driverProfileId,
      })
      return ok({ success: true, action: 'update', route: updated })
    }

    return Errors.badRequest('Invalid schedule action. Supported actions: pause, resume, cancel_future, update')
  } catch (e: any) {
    if (e.message?.includes('not found')) return Errors.notFound(e.message)
    return Errors.system(e)
  }
}

/**
 * POST /api/v1/transport/routes/[id]/schedule — Add schedule exception (Holiday, skip date, substitute driver/bus)
 */
async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, 'transport:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')
  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    const { exceptionDate, reason, isCancelled, substituteVehicleId, substituteDriverProfileId } = body

    if (!exceptionDate) {
      return Errors.validation('exceptionDate is required')
    }

    const context = {
      tenantId: session.tenantId,
      branchId: session.branchId || undefined,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    }

    const exception = await TransportService.addRouteException(context, id, {
      exceptionDate,
      reason,
      isCancelled,
      substituteVehicleId,
      substituteDriverProfileId,
    })

    return ok({ exception }, undefined, 201)
  } catch (e: any) {
    if (e.message?.includes('not found')) return Errors.notFound(e.message)
    return Errors.system(e)
  }
}

/**
 * DELETE /api/v1/transport/routes/[id]/schedule — Remove schedule exception
 */
async function _DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, 'transport:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')
  const { id } = await params

  try {
    const { searchParams } = new URL(req.url)
    const exceptionId = searchParams.get('exceptionId')
    if (!exceptionId) return Errors.validation('exceptionId is required')

    const context = {
      tenantId: session.tenantId,
      branchId: session.branchId || undefined,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    }

    await TransportService.removeRouteException(context, id, exceptionId)
    return ok({ success: true, removedExceptionId: exceptionId })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
export const PATCH = withApi(_PATCH)
export const POST = withApi(_POST)
export const DELETE = withApi(_DELETE)

