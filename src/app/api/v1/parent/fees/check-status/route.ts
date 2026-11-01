import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { db } from '@/lib/db'
import { PaymentRecoveryService } from '@/lib/fees/payment-recovery-service'

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

    // Formulate parent-friendly message
    let parentMessage = 'Your payment status is being checked.'
    let isRetrySafe = false

    if (outcome.detailedStatus === 'SUCCESS') {
      parentMessage = 'Your payment has been received successfully!'
    } else if (outcome.detailedStatus === 'VERIFICATION_PENDING' || outcome.detailedStatus === 'RECONCILIATION_PENDING') {
      parentMessage =
        'We are checking your payment with the payment provider. Please do not make another payment yet.'
      isRetrySafe = false
    } else if (outcome.detailedStatus === 'FAILED' || outcome.detailedStatus === 'CANCELLED') {
      parentMessage = 'Your payment could not be completed. No payment was charged. You may safely try again.'
      isRetrySafe = true
    } else if (outcome.detailedStatus === 'REFUNDED') {
      parentMessage = 'Your refund has been completed.'
    }

    return ok({
      success: outcome.detailedStatus === 'SUCCESS',
      status: outcome.detailedStatus,
      paymentNumber: payment.paymentNumber,
      transactionRef: payment.transactionRef,
      amountRupees: (payment.amountCents / 100).toFixed(2),
      receiptNumber: outcome.receipt?.receiptNumber || null,
      message: parentMessage,
      isRetrySafe,
      checkedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const POST = withApi(_POST)
