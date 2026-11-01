import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { ok, Errors } from '@/lib/api'
import { FeeService } from '@/lib/fees/fee-service'
import { WebhookEventService } from '@/lib/fees/webhook-event-service'
import { db } from '@/lib/db'

/**
 * Helper to safely verify webhook signature across providers
 */
function verifyProviderSignature(
  provider: string,
  rawBody: string,
  secret: string,
  signatureHeader?: string | null
): boolean {
  if (!secret) {
    // If no secret configured in test/sandbox, allow mock tests
    return process.env.NODE_ENV !== 'production'
  }

  if (!signatureHeader) return false

  try {
    if (provider === 'razorpay') {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
      return (
        signatureHeader.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))
      )
    }

    if (provider === 'cashfree') {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
      return (
        signatureHeader.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))
      )
    }

    if (provider === 'payu') {
      // PayU hash verification format: sha512(salt|status|||||||||||email|firstname|productinfo|amount|txnid|key)
      const expected = crypto.createHash('sha512').update(`${secret}|${rawBody}`).digest('hex')
      return signatureHeader.toLowerCase() === expected.toLowerCase()
    }

    return true
  } catch {
    return false
  }
}

/**
 * POST /api/v1/finance/webhooks/[provider]
 * Handles asynchronous webhook notifications from Razorpay, Cashfree, and PayU.
 */
async function _POST(
  req: NextRequest,
  ctx: { params?: Promise<{ provider: string }> | { provider: string } }
) {
  try {
    const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
    const provider = (params?.provider || '').toLowerCase()

    if (!['razorpay', 'cashfree', 'payu'].includes(provider)) {
      return Errors.validation(`Unsupported payment gateway webhook provider: ${provider}`)
    }

    const rawBody = await req.text()
    let payload: any = {}
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return Errors.validation('Invalid JSON payload in webhook body')
    }

    let orderId: string | undefined
    let transactionRef: string | undefined
    let paymentNumber: string | undefined
    let gatewayPaymentId: string | undefined
    let providerEventId: string | undefined
    let eventType: string = 'payment.notification'
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS'
    let failureReason: string | undefined
    let signatureHeader: string | null = null

    // 1. Provider-specific event extraction
    if (provider === 'razorpay') {
      signatureHeader = req.headers.get('x-razorpay-signature')
      providerEventId = req.headers.get('x-razorpay-event-id') || payload.event_id
      eventType = payload.event || 'payment.event'
      const paymentEntity = payload.payload?.payment?.entity || {}
      const orderEntity = payload.payload?.order?.entity || {}

      orderId = paymentEntity.order_id || orderEntity.id
      gatewayPaymentId = paymentEntity.id
      transactionRef = paymentEntity.notes?.transactionRef || paymentEntity.notes?.txRef

      if (eventType === 'payment.failed') {
        status = 'FAILED'
        failureReason = paymentEntity.error_description || paymentEntity.error_reason || 'Payment failed'
      } else if (eventType === 'payment.captured' || eventType === 'order.paid') {
        status = 'SUCCESS'
      } else {
        // Acknowledge unhandled informational events
        return ok({ received: true, ignored: true, event: eventType })
      }
    } else if (provider === 'cashfree') {
      signatureHeader = req.headers.get('x-webhook-signature') || req.headers.get('x-signature')
      providerEventId = req.headers.get('x-webhook-event-id') || String(payload.event_time || '')
      eventType = payload.type || 'PAYMENT_NOTIFICATION'
      const data = payload.data || {}
      orderId = data.order?.order_id
      gatewayPaymentId = data.payment?.cf_payment_id ? String(data.payment.cf_payment_id) : undefined
      const paymentStatus = data.payment?.payment_status

      if (paymentStatus === 'SUCCESS') {
        status = 'SUCCESS'
      } else if (paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED') {
        status = 'FAILED'
        failureReason = data.payment?.payment_message || 'Payment dropped or failed'
      }
    } else if (provider === 'payu') {
      signatureHeader = req.headers.get('x-payu-signature') || payload.hash
      orderId = payload.mihpayid
      transactionRef = payload.txnid
      gatewayPaymentId = payload.mihpayid
      providerEventId = payload.mihpayid || payload.txnid
      eventType = 'PAYU_PAYMENT_CALLBACK'
      status = payload.status === 'success' ? 'SUCCESS' : 'FAILED'
      failureReason = payload.error_Message || payload.unmappedstatus
    }

    if (!providerEventId) {
      providerEventId = `ev_${provider}_${orderId || gatewayPaymentId || transactionRef || Date.now()}`
    }

    // 2. Authoritatively locate payment record in database
    const payment = await db.payment.findFirst({
      where: {
        OR: [
          ...(transactionRef ? [{ transactionRef }] : []),
          ...(paymentNumber ? [{ paymentNumber }] : []),
          ...(orderId ? [{ notes: { contains: orderId } }] : []),
        ],
      },
      include: { tenant: true },
    })

    if (!payment) {
      // Payment might belong to a different system or test event
      return Errors.notFound('Matching payment record for webhook notification')
    }

    const tenantId = payment.tenantId

    // 3. Cryptographic Signature Verification using Tenant's configured secret
    const config = await db.schoolConfig.findUnique({
      where: { tenantId_domain: { tenantId, domain: 'FINANCE' } },
    })
    const data = (config?.data as Record<string, any>) || {}
    const gw = data.paymentGateway || {}
    const { EncryptionService } = await import('@/lib/security/encryption-service')
    const decryptedWebhookSecret = gw.webhookSecret ? EncryptionService.decrypt(gw.webhookSecret, tenantId) : ''
    const decryptedKeySecret = gw.keySecret ? EncryptionService.decrypt(gw.keySecret, tenantId) : ''
    const secret = decryptedWebhookSecret || decryptedKeySecret || process.env.PAYMENT_WEBHOOK_SECRET || ''

    const isSigValid = verifyProviderSignature(provider, rawBody, secret, signatureHeader)
    if (!isSigValid) {
      await WebhookEventService.recordEvent(tenantId, {
        provider: provider.toUpperCase() as any,
        providerEventId,
        eventType,
        status: 'REJECTED',
        signatureValid: false,
        error: 'Invalid signature',
      })
      return Errors.unauthorized('Invalid cryptographic webhook signature')
    }

    // 4. Webhook Idempotency & Replay Protection Check
    const duplicate = await WebhookEventService.checkDuplicate(tenantId, provider, providerEventId)
    if (duplicate) {
      return ok({
        success: true,
        duplicate: true,
        alreadyProcessed: true,
        message: 'Webhook event was already processed successfully.',
      })
    }

    // 5. Persist Webhook Event Record before Financial Processing
    const eventRecord = await WebhookEventService.recordEvent(tenantId, {
      provider: provider.toUpperCase() as any,
      providerEventId,
      eventType,
      status: 'PROCESSING',
      signatureValid: true,
      payloadSummary: {
        orderId,
        gatewayPaymentId,
        transactionRef,
        status,
        event: eventType,
      },
    })

    // 6. Idempotently verify payment & generate receipt
    try {
      const result = await FeeService.verifyPayment(
        {
          tenantId,
          actorId: `webhook-${provider}`,
          actorName: `${provider.toUpperCase()} Webhook`,
          actorRole: 'SYSTEM',
        },
        {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          transactionRef: payment.transactionRef || undefined,
          gatewayPaymentId,
          gatewayOrderId: orderId,
          gatewayStatus: status,
          failureReason,
          eventSource: 'PROVIDER_WEBHOOK',
        }
      )

      await WebhookEventService.updateEventStatus(tenantId, eventRecord.id, 'PROCESSED', {
        paymentId: payment.id,
        receiptNumber: result.receipt?.receiptNumber,
      })

      return ok({
        success: true,
        provider,
        paymentId: payment.id,
        receiptNumber: result.receipt?.receiptNumber,
        alreadyVerified: result.alreadyVerified,
      })
    } catch (procErr: any) {
      await WebhookEventService.updateEventStatus(tenantId, eventRecord.id, 'FAILED', {
        paymentId: payment.id,
        error: procErr.message,
      })
      throw procErr
    }
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const POST = withApi(_POST)
