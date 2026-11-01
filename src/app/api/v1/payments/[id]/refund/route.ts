import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { FeeService } from '@/lib/fees/fee-service'

/**
 * POST /api/v1/payments/[id]/refund
 * Processes an authorized refund for a verified fee payment.
 * Adjusts ledger balances, issues refund reference, updates status to REFUNDED,
 * and permanently records the refund in the transaction timeline and audit log.
 */
async function _POST(
  req: NextRequest,
  ctx: { params?: Promise<{ id: string }> | { id: string } }
) {
  const session = await requireApi(req, 'finance:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
    const paymentId = params?.id
    if (!paymentId) return Errors.notFound('Payment ID is required')

    const body = await req.json().catch(() => ({}))
    const { reason, amountCents, refundRef } = body

    if (!reason || !reason.trim()) {
      return Errors.validation('A valid business reason is mandatory to authorize a payment refund.')
    }

    const result = await FeeService.refundPayment(
      {
        tenantId: session.tenantId,
        actorId: session.uid,
        actorName: session.name,
        actorRole: session.role,
      },
      {
        paymentId,
        amountCents,
        reason: reason.trim(),
        refundRef,
      }
    )

    return ok(result)
  } catch (e: any) {
    if (e.message?.includes('INVALID_STATUS_TRANSITION') || e.message?.includes('exceeds')) {
      return Errors.business('BUSINESS_REFUND_ERROR', e.message)
    }
    return Errors.system(e)
  }
}

export const POST = withApi(_POST)
