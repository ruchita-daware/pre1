import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { FeeService } from '@/lib/fees/fee-service'
import { db } from '@/lib/db'

/**
 * POST /api/v1/payments/verify
 * Online payment signature verification, receipt generation, and status transition to SUCCESS.
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req)
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json()
    const {
      paymentId,
      paymentNumber,
      invoiceId,
      transactionRef,
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      signature,
      gatewayStatus = 'SUCCESS',
      failureReason,
    } = body

    const activeOrderId = orderId || razorpay_order_id
    const activeGatewayPaymentId = body.gatewayPaymentId || razorpay_payment_id
    const activeSignature = signature || razorpay_signature

    if (!paymentId && !paymentNumber && !transactionRef && !activeOrderId) {
      return Errors.validation('paymentId, paymentNumber, transactionRef, or orderId is required')
    }

    // Resolve payment record to verify tenancy and authorization
    let payment = await db.payment.findFirst({
      where: {
        tenantId: session.tenantId,
        ...(paymentId ? { id: paymentId } : {}),
        ...(paymentNumber ? { paymentNumber } : {}),
        ...(transactionRef ? { transactionRef } : {}),
      },
      include: { invoice: true, student: true },
    })

    if (!payment && activeOrderId) {
      // Find by gateway order ID inside payment notes
      payment = await db.payment.findFirst({
        where: {
          tenantId: session.tenantId,
          notes: { contains: activeOrderId },
        },
        include: { invoice: true, student: true },
      })
    }

    if (!payment) {
      return Errors.notFound('Payment record')
    }

    // Role-based authorization: Parent can only verify payments for their linked students
    if (session.role === 'PARENT') {
      const isLinked = await db.studentGuardian.findFirst({
        where: {
          studentId: payment.studentId!,
          guardian: { userId: session.uid },
        },
      })
      if (!isLinked && payment.receivedById !== session.uid) {
        return Errors.forbidden('Access denied: You are not authorized to verify this payment')
      }
    }

    // Cryptographic signature check for gateway checkouts
    if (activeSignature && activeOrderId && activeGatewayPaymentId) {
      const config = await db.schoolConfig.findUnique({
        where: { tenantId_domain: { tenantId: session.tenantId, domain: 'FINANCE' } },
      })
      const data = (config?.data as Record<string, any>) || {}
      const gateway = data.paymentGateway || {}
      const keySecret =
        (gateway.keySecret ? (await import('@/lib/security/encryption-service')).EncryptionService.decrypt(gateway.keySecret, session.tenantId) : '') ||
        process.env.RAZORPAY_KEY_SECRET

      if (keySecret) {
        const expectedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(`${activeOrderId}|${activeGatewayPaymentId}`)
          .digest('hex')

        const isValid =
          activeSignature.length === expectedSignature.length &&
          crypto.timingSafeEqual(Buffer.from(activeSignature), Buffer.from(expectedSignature))

        if (!isValid) {
          // Record failed signature attempt in payment timeline
          await FeeService.verifyPayment(
            {
              tenantId: session.tenantId,
              actorId: session.uid,
              actorName: session.name,
              actorRole: session.role,
            },
            {
              paymentId: payment.id,
              gatewayStatus: 'FAILED',
              failureCode: 'INVALID_SIGNATURE',
              failureReason: 'Cryptographic signature mismatch during verification',
              eventSource: 'API',
            }
          )
          return Errors.unauthorized('Payment signature verification failed. Untrusted callback.')
        }
      }
    }

    const result = await FeeService.verifyPayment(
      {
        tenantId: session.tenantId,
        actorId: session.uid,
        actorName: session.name,
        actorRole: session.role,
      },
      {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        invoiceId: invoiceId || payment.invoiceId || undefined,
        transactionRef: payment.transactionRef || undefined,
        gatewayPaymentId: activeGatewayPaymentId,
        gatewayOrderId: activeOrderId,
        gatewayStatus: gatewayStatus as 'SUCCESS' | 'FAILED',
        failureCode: body.failureCode,
        failureReason,
        eventSource: 'API',
      }
    )

    return ok(result, undefined, result.alreadyVerified ? 200 : 201)
  } catch (e: any) {
    if (e.message?.includes('IT §269ST') || e.message?.includes('exceeds')) {
      return Errors.business('BUSINESS_FEE_ERROR', e.message)
    }
    return Errors.system(e)
  }
}

export const POST = withApi(_POST)
