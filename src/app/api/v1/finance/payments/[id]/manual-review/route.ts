import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { recordAudit } from '@/lib/audit'
import { parsePaymentMetadata, encodePaymentMetadata } from '@/lib/fees/payment-status-types'

/**
 * POST /api/v1/finance/payments/[id]/manual-review
 * Authorized manual review action: allows an authorized bursar/owner to resolve
 * an exception or record an audited manual investigation note.
 */
async function _POST(req: NextRequest, ctx: { params?: Promise<{ id: string }> | { id: string } }) {
  const session = await requireApi(req, 'finance:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
    const id = params?.id
    if (!id) return Errors.notFound('Payment ID required')

    const body = await req.json().catch(() => ({}))
    const { action = 'RESOLVE', resolutionNotes, targetReconciliationStatus = 'RESOLVED' } = body

    if (!resolutionNotes || !resolutionNotes.trim()) {
      return Errors.validation('resolutionNotes is required for manual review actions')
    }

    const payment = await db.payment.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { invoice: true, student: true },
    })

    if (!payment) return Errors.notFound('Payment record')

    const meta = parsePaymentMetadata(payment)
    const prevReconStatus = meta.reconciliationStatus
    const prevInternalStatus = meta.internalPaymentStatus

    meta.reconciliationStatus = targetReconciliationStatus
    meta.reconciliationNotes = resolutionNotes.trim()
    meta.lastReconciledAt = new Date().toISOString()

    meta.timeline.push({
      eventId: crypto.randomUUID(),
      paymentAttemptId: payment.id,
      tenantId: session.tenantId,
      eventType: 'PAYMENT_MANUAL_REVIEW',
      source: 'ADMIN_ACTION',
      previousProviderStatus: meta.providerStatus,
      newProviderStatus: meta.providerStatus,
      previousInternalStatus: prevInternalStatus,
      newInternalStatus: meta.internalPaymentStatus,
      previousReconciliationStatus: prevReconStatus,
      newReconciliationStatus: meta.reconciliationStatus,
      timestamp: new Date().toISOString(),
      actorType: 'ADMIN',
      actorId: session.uid,
      diagnostics: `Manual review by ${session.name || session.uid}: ${resolutionNotes.trim()}`,
    })

    await db.payment.update({
      where: { id: payment.id },
      data: {
        notes: encodePaymentMetadata(meta),
      },
    })

    await recordAudit({
      tenantId: session.tenantId,
      branchId: payment.invoice?.branchId || payment.student?.branchId || null,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
      action: 'PAYMENT_MANUAL_REVIEW_RESOLVED',
      entity: 'Payment',
      entityId: payment.id,
      module: 'Fees',
      summary: `Manual review on payment ${payment.paymentNumber}: ${resolutionNotes.trim()} (Reconciliation: ${prevReconStatus} -> ${targetReconciliationStatus})`,
    })

    return ok({
      success: true,
      paymentId: payment.id,
      reconciliationStatus: meta.reconciliationStatus,
      internalPaymentStatus: meta.internalPaymentStatus,
      providerStatus: meta.providerStatus,
      message: 'Payment manual review recorded successfully.',
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const POST = withApi(_POST)
