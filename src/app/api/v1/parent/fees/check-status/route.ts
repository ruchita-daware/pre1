import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { db } from '@/lib/db'
import { PaymentRecoveryService } from '@/lib/fees/payment-recovery-service'
import { parsePaymentMetadata } from '@/lib/fees/payment-status-types'

/**
 * POST /api/v1/parent/fees/check-status
 * Safe parent self-service action to refresh and check transaction status with the provider.
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req)
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json().catch(() => ({}))
    const { paymentId, transactionRef } = body

    if (!paymentId && !transactionRef) {
      return Errors.validation('paymentId or transactionRef is required')
    }

    const payment = await db.payment.findFirst({
      where: {
        tenantId: session.tenantId,
        ...(paymentId ? { id: paymentId } : { transactionRef }),
      },
      include: {
        student: true,
        receipt: true,
      },
    })

    if (!payment) {
      return Errors.notFound('Payment record')
    }

    // Role-based authorization: if PARENT, verify student guardianship
    if (session.role === 'PARENT' && payment.studentId) {
      const isLinked = await db.studentGuardian.findFirst({
        where: {
          studentId: payment.studentId,
          guardian: { userId: session.uid },
        },
      })
      if (!isLinked) {
        return Errors.forbidden('Unauthorized: You are not linked to this student.')
      }
    }

    const actorCtx = {
      tenantId: session.tenantId,
      actorId: session.uid,
      actorName: session.name || 'Parent Guardian',
      actorRole: session.role,
    }

    const outcome = await PaymentRecoveryService.recoverTransaction(actorCtx, payment.id)

    const meta = parsePaymentMetadata(outcome.payment || payment)
    const providerStatus = meta.providerStatus
    const internalStatus = meta.internalPaymentStatus
    const amountRupees = ((payment.amountCents || 0) / 100).toFixed(2)
    const receiptNum = outcome.receipt?.receiptNumber || (outcome.payment as any)?.receipt?.receiptNumber || 'N/A'

    // Formulate parent-friendly message according to Section 10 specification
    let parentMessage = 'Your payment status is being checked.'
    let isRetrySafe = false

    if (providerStatus === 'CAPTURED' && internalStatus === 'SUCCESS') {
      parentMessage = `Your payment of ₹${amountRupees} has been received successfully! Receipt #${receiptNum} has been issued.`
      isRetrySafe = false
    } else if (
      providerStatus === 'CAPTURED' &&
      (internalStatus === 'PROCESSING' || internalStatus === 'VERIFICATION_PENDING')
    ) {
      parentMessage =
        'Your payment has been received by our bank/gateway. We are updating your school account now. Please do not make another payment.'
      isRetrySafe = false
    } else if (
      providerStatus === 'PENDING' ||
      providerStatus === 'UNKNOWN' ||
      internalStatus === 'VERIFICATION_PENDING' ||
      meta.reconciliationStatus === 'RETRY_PENDING'
    ) {
      parentMessage =
        'We are checking your payment status with the bank. Please do not re-attempt payment yet. If any money was deducted, your account will be updated automatically.'
      isRetrySafe = false
    } else if (
      providerStatus === 'FAILED' ||
      providerStatus === 'CANCELLED' ||
      internalStatus === 'FAILED' ||
      internalStatus === 'CANCELLED'
    ) {
      parentMessage =
        'Your payment was not completed. If any amount was deducted by your bank, it will be automatically refunded within 5-7 business days. You may safely try again.'
      isRetrySafe = true
    }

    return ok({
      success: internalStatus === 'SUCCESS',
      providerStatus,
      internalPaymentStatus: internalStatus,
      reconciliationStatus: meta.reconciliationStatus,
      paymentNumber: payment.paymentNumber,
      transactionRef: payment.transactionRef,
      amountRupees,
      receiptNumber: receiptNum !== 'N/A' ? receiptNum : null,
      message: parentMessage,
      isRetrySafe,
      checkedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const POST = withApi(_POST)
