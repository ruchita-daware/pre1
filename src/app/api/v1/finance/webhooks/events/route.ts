import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { WebhookEventService } from '@/lib/fees/webhook-event-service'

/**
 * GET /api/v1/finance/webhooks/events
 * Lists stored webhook events for audit and diagnostic inspection.
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const events = await WebhookEventService.getEvents(session.tenantId, 100)
    return ok({ events, total: events.length })
  } catch (e: any) {
    return Errors.system(e)
  }
}

/**
 * POST /api/v1/finance/webhooks/events
 * Trigger manual replay of a webhook event.
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req, 'finance:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json().catch(() => ({}))
    const { eventId } = body
    if (!eventId) return Errors.validation('eventId is required for replay')

    const result = await WebhookEventService.replayEvent(session.tenantId, eventId, {
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    })

    return ok(result)
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
export const POST = withApi(_POST)
