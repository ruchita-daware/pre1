import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { parsePaymentMetadata } from '@/lib/fees/payment-status-types'

/**
 * GET /api/v1/finance/payments/exceptions
 * Lists all transactions with status discrepancies, un-reconciled states, or provider/ledger mismatches.
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const payments = await db.payment.findMany({
      where: { tenantId: session.tenantId },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const exceptions = payments
      .map((p) => {
        const meta = parsePaymentMetadata(p)
        const isCapturedButInternalPending =
          meta.providerStatus === 'CAPTURED' && meta.internalPaymentStatus !== 'SUCCESS'
        const isMismatch = meta.reconciliationStatus === 'MISMATCH'
        const isUnderVerification =
          meta.internalPaymentStatus === 'VERIFICATION_PENDING' || meta.reconciliationStatus === 'RETRY_PENDING'
        const isManualReview =
          meta.internalPaymentStatus === 'MANUAL_REVIEW' || meta.reconciliationStatus === 'MANUAL_REVIEW'

        const isException = isCapturedButInternalPending || isMismatch || isUnderVerification || isManualReview

        if (!isException) return null

        return {
          id: p.id,
          paymentNumber: p.paymentNumber,
          transactionRef: p.transactionRef,
          amountCents: p.amountCents,
          amountRupees: (p.amountCents / 100).toFixed(2),
          studentName: p.student ? `${p.student.firstName} ${p.student.lastName || ''}`.trim() : 'N/A',
          admissionNo: p.student?.admissionNo,
          invoiceNumber: p.invoice?.invoiceNumber,
          provider: meta.provider,
          providerStatus: meta.providerStatus,
          internalPaymentStatus: meta.internalPaymentStatus,
          reconciliationStatus: meta.reconciliationStatus,
          gatewayOrderId: meta.gatewayOrderId,
          gatewayPaymentId: meta.gatewayPaymentId,
          lastReconciledAt: meta.lastReconciledAt,
          discrepancyType: isMismatch
            ? 'AMOUNT_OR_CURRENCY_MISMATCH'
            : isCapturedButInternalPending
            ? 'PROVIDER_CAPTURED_INTERNAL_PENDING'
            : isUnderVerification
            ? 'VERIFICATION_PENDING'
            : 'MANUAL_REVIEW_REQUIRED',
          discrepancyDetails: meta.discrepancyDetails || [],
          failureReason: meta.failureReason,
          createdAt: p.createdAt,
        }
      })
      .filter(Boolean)

    return ok({
      totalExceptions: exceptions.length,
      exceptions,
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
