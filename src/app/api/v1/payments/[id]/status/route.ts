import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { parsePaymentMetadata } from '@/lib/fees/payment-status-types'

/**
 * GET /api/v1/payments/[id]/status
 * Returns the three independent status dimensions:
 * 1. providerStatus
 * 2. internalPaymentStatus
 * 3. reconciliationStatus
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
      include: {
        receipt: { select: { receiptNumber: true, issuedAt: true } },
      },
    })

    if (!payment) return Errors.notFound('Payment attempt')

    const meta = parsePaymentMetadata(payment)

    return ok({
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      transactionRef: payment.transactionRef,
      amountCents: payment.amountCents,
      amountRupees: (payment.amountCents / 100).toFixed(2),
      currency: meta.currency,

      // 3 Independent Status Dimensions
      providerStatus: meta.providerStatus,
      rawProviderStatus: meta.rawProviderStatus || null,
      internalPaymentStatus: meta.internalPaymentStatus,
      reconciliationStatus: meta.reconciliationStatus,

      // Timestamps & References
      provider: meta.provider,
      providerOrderId: meta.gatewayOrderId,
      providerPaymentId: meta.gatewayPaymentId,
      providerVerifiedAt: meta.providerVerifiedAt,
      internalSettledAt: meta.internalSettledAt,
      lastReconciledAt: meta.lastReconciledAt,
      receiptNumber: payment.receipt?.receiptNumber || null,
      isDiscrepant:
        (meta.providerStatus === 'CAPTURED' && meta.internalPaymentStatus !== 'SUCCESS') ||
        meta.reconciliationStatus === 'MISMATCH',
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
