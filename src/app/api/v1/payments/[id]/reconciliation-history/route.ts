import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { parsePaymentMetadata } from '@/lib/fees/payment-status-types'

/**
 * GET /api/v1/payments/[id]/reconciliation-history
 * Returns the history of all reconciliation executions run against this payment attempt.
 */
async function _GET(req: NextRequest, ctx: { params?: Promise<{ id: string }> | { id: string } }) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
    const id = params?.id
    if (!id) return Errors.notFound('Payment ID required')

    const payment = await db.payment.findFirst({
      where: { id, tenantId: session.tenantId },
    })

    if (!payment) return Errors.notFound('Payment attempt')

    const meta = parsePaymentMetadata(payment)

    return ok({
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      reconciliationCount: meta.reconciliationCount || meta.reconciliationHistory.length,
      lastReconciledAt: meta.lastReconciledAt,
      currentReconciliationStatus: meta.reconciliationStatus,
      history: meta.reconciliationHistory,
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
