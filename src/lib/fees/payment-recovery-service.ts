import { db } from '@/lib/db'
import crypto from 'crypto'
import { recordAudit } from '@/lib/audit'
import { FeeService } from '@/lib/fees/fee-service'
import { EncryptionService } from '@/lib/security/encryption-service'

export type DetailedPaymentStatus =
  | 'CREATED'
  | 'INITIATED'
  | 'ORDER_CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'AUTHORIZED'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'VERIFICATION_PENDING'
  | 'RECONCILIATION_PENDING'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'DISPUTED'

export type PaymentLifecycleEvent =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_SESSION_REQUESTED'
  | 'PROVIDER_ORDER_CREATED'
  | 'CHECKOUT_INITIALIZED'
  | 'CHECKOUT_CANCELLED'
  | 'PROVIDER_PAYMENT_AUTHORIZED'
  | 'PROVIDER_PAYMENT_CAPTURED'
  | 'PROVIDER_PAYMENT_FAILED'
  | 'WEBHOOK_RECEIVED'
  | 'WEBHOOK_SIGNATURE_VERIFIED'
  | 'WEBHOOK_SIGNATURE_REJECTED'
  | 'WEBHOOK_DUPLICATE_DETECTED'
  | 'PAYMENT_VERIFICATION_STARTED'
  | 'PAYMENT_VERIFICATION_FAILED'
  | 'PAYMENT_VERIFIED_SUCCESS'
  | 'PAYMENT_RECONCILIATION_STARTED'
  | 'PAYMENT_RECONCILED'
  | 'PAYMENT_ALLOCATION_CREATED'
  | 'INVOICE_BALANCE_UPDATED'
  | 'RECEIPT_GENERATED'
  | 'PARENT_NOTIFICATION_SENT'
  | 'REFUND_REQUESTED'
  | 'REFUND_PROCESSING'
  | 'REFUND_COMPLETED'
  | 'REFUND_FAILED'
  | 'ADMIN_MANUAL_REVIEW'

export interface StructuredTimelineEvent {
  eventId?: string
  previousStatus: DetailedPaymentStatus | string | null
  newStatus: DetailedPaymentStatus | string
  event: PaymentLifecycleEvent | string
  source: 'API' | 'PROVIDER_WEBHOOK' | 'RECONCILIATION' | 'ADMIN_ACTION' | 'SYSTEM'
  providerEventId?: string | null
  orderId?: string | null
  failureCode?: string | null
  failureReason?: string | null
  diagnostics?: string | null
  at: string
  by: string
  metadata?: Record<string, any>
}

export const VALID_STATUS_TRANSITIONS: Record<DetailedPaymentStatus, DetailedPaymentStatus[]> = {
  CREATED: ['INITIATED', 'ORDER_CREATED', 'PENDING', 'CANCELLED', 'FAILED'],
  INITIATED: ['ORDER_CREATED', 'PENDING', 'PROCESSING', 'CANCELLED', 'FAILED'],
  ORDER_CREATED: ['PENDING', 'PROCESSING', 'AUTHORIZED', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'VERIFICATION_PENDING'],
  PENDING: [
    'PROCESSING',
    'AUTHORIZED',
    'SUCCESS',
    'FAILED',
    'CANCELLED',
    'EXPIRED',
    'VERIFICATION_PENDING',
    'RECONCILIATION_PENDING',
  ],
  PROCESSING: [
    'AUTHORIZED',
    'SUCCESS',
    'FAILED',
    'CANCELLED',
    'VERIFICATION_PENDING',
    'RECONCILIATION_PENDING',
  ],
  AUTHORIZED: ['SUCCESS', 'FAILED', 'REFUND_PENDING', 'DISPUTED'],
  VERIFICATION_PENDING: ['SUCCESS', 'FAILED', 'RECONCILIATION_PENDING', 'PROCESSING'],
  RECONCILIATION_PENDING: ['SUCCESS', 'FAILED', 'VERIFICATION_PENDING', 'DISPUTED'],
  SUCCESS: ['REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED'],
  REFUND_PENDING: ['PARTIALLY_REFUNDED', 'REFUNDED', 'SUCCESS'],
  PARTIALLY_REFUNDED: ['REFUND_PENDING', 'REFUNDED', 'DISPUTED'],
  REFUNDED: [], // Terminal
  FAILED: [], // Terminal: must retry as fresh attempt
  CANCELLED: [], // Terminal
  EXPIRED: [], // Terminal
  DISPUTED: ['SUCCESS', 'REFUNDED', 'FAILED'],
}

export function mapToDbPaymentStatus(detailed: DetailedPaymentStatus): 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' {
  switch (detailed) {
    case 'SUCCESS':
    case 'PARTIALLY_REFUNDED':
    case 'DISPUTED':
      return 'SUCCESS'
    case 'REFUNDED':
    case 'REFUND_PENDING':
      return 'REFUNDED'
    case 'FAILED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'FAILED'
    default:
      return 'PENDING'
  }
}

export interface ProviderQueryResponse {
  settled: boolean
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNCERTAIN'
  providerPaymentId?: string
  providerOrderId?: string
  amountCents?: number
  currency?: string
  method?: string
  rawResponse?: any
  failureCode?: string
  failureReason?: string
}

export interface ScopeActorContext {
  tenantId: string
  actorId: string
  actorName?: string
  actorRole?: string
  branchId?: string | null
}

export class PaymentRecoveryService {
  /**
   * Validate if a status transition is permissible under the finite state machine.
   */
  static isTransitionValid(currentStatus: DetailedPaymentStatus, newStatus: DetailedPaymentStatus): boolean {
    if (currentStatus === newStatus) return true
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || []
    return allowed.includes(newStatus)
  }

  /**
   * STEP 2 — Query Official Provider Server-Side API
   * Authenticated outbound call to Razorpay, Cashfree, or PayU to fetch authoritative status.
   */
  static async queryProviderStatus(
    tenantId: string,
    provider: string,
    gatewayOrderId?: string | null,
    gatewayPaymentId?: string | null,
    transactionRef?: string | null
  ): Promise<ProviderQueryResponse> {
    const secrets = await FeeService.getDecryptedGatewaySecrets(tenantId)
    const upperProvider = (provider || secrets.provider || 'RAZORPAY').toUpperCase()

    // 1. RAZORPAY
    if (upperProvider === 'RAZORPAY') {
      if (!secrets.keyId || !secrets.keySecret) {
        // If unconfigured or test sandbox mock
        if (gatewayOrderId?.startsWith('order_mock_') || gatewayOrderId?.startsWith('ord_razorpay_mock_')) {
          return {
            settled: true,
            status: 'SUCCESS',
            providerPaymentId: `pay_mock_${Date.now()}`,
            providerOrderId: gatewayOrderId,
            amountCents: 500000,
            currency: 'INR',
            method: 'UPI',
          }
        }
        return {
          settled: false,
          status: 'UNCERTAIN',
          failureReason: 'Razorpay credentials not configured for provider query.',
        }
      }

      try {
        const auth = Buffer.from(`${secrets.keyId}:${secrets.keySecret}`).toString('base64')

        // If we have an order ID, fetch all payments for this order
        if (gatewayOrderId && (gatewayOrderId.startsWith('order_') || gatewayOrderId.startsWith('ord_'))) {
          const res = await fetch(`https://api.razorpay.com/v1/orders/${gatewayOrderId}/payments`, {
            headers: { Authorization: `Basic ${auth}` },
          })
          if (res.ok) {
            const data = await res.json()
            const items = data.items || []
            const captured = items.find((i: any) => i.status === 'captured')
            if (captured) {
              return {
                settled: true,
                status: 'SUCCESS',
                providerPaymentId: captured.id,
                providerOrderId: gatewayOrderId,
                amountCents: Number(captured.amount),
                currency: captured.currency || 'INR',
                method: captured.method?.toUpperCase() || 'ONLINE',
                rawResponse: captured,
              }
            }
            const failed = items.find((i: any) => i.status === 'failed')
            if (failed && items.length === 1) {
              return {
                settled: false,
                status: 'FAILED',
                providerPaymentId: failed.id,
                failureCode: failed.error_code || 'GATEWAY_ERROR',
                failureReason: failed.error_description || 'Payment was declined by bank',
                rawResponse: failed,
              }
            }
          }
        }

        // If we have a direct payment ID
        if (gatewayPaymentId && gatewayPaymentId.startsWith('pay_')) {
          const res = await fetch(`https://api.razorpay.com/v1/payments/${gatewayPaymentId}`, {
            headers: { Authorization: `Basic ${auth}` },
          })
          if (res.ok) {
            const p = await res.json()
            if (p.status === 'captured') {
              return {
                settled: true,
                status: 'SUCCESS',
                providerPaymentId: p.id,
                providerOrderId: p.order_id,
                amountCents: Number(p.amount),
                currency: p.currency || 'INR',
                method: p.method?.toUpperCase() || 'ONLINE',
                rawResponse: p,
              }
            } else if (p.status === 'failed') {
              return {
                settled: false,
                status: 'FAILED',
                providerPaymentId: p.id,
                failureCode: p.error_code || 'PAYMENT_FAILED',
                failureReason: p.error_description || 'Transaction failed',
                rawResponse: p,
              }
            }
          }
        }

        return { settled: false, status: 'UNCERTAIN', failureReason: 'No captured payments recorded on provider order yet.' }
      } catch (err: any) {
        return { settled: false, status: 'UNCERTAIN', failureReason: `Network error querying Razorpay: ${err.message}` }
      }
    }

    // 2. CASHFREE
    if (upperProvider === 'CASHFREE') {
      if (!secrets.keyId || !secrets.keySecret) {
        if (gatewayOrderId?.startsWith('cf_mock_') || gatewayOrderId?.startsWith('ord_cashfree_mock_')) {
          return {
            settled: true,
            status: 'SUCCESS',
            providerPaymentId: `cf_pay_mock_${Date.now()}`,
            providerOrderId: gatewayOrderId,
            amountCents: 500000,
            currency: 'INR',
            method: 'UPI',
          }
        }
        return {
          settled: false,
          status: 'UNCERTAIN',
          failureReason: 'Cashfree credentials not configured.',
        }
      }

      try {
        const isLive = (secrets.mode || 'SANDBOX').toUpperCase() === 'PRODUCTION' || (secrets.mode || 'SANDBOX').toUpperCase() === 'LIVE'
        const baseUrl = isLive ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'
        const orderIdToQuery = gatewayOrderId || transactionRef?.replace(/[^a-zA-Z0-9_-]/g, '_')

        if (orderIdToQuery) {
          const res = await fetch(`${baseUrl}/orders/${orderIdToQuery}/payments`, {
            headers: {
              'x-client-id': secrets.keyId,
              'x-client-secret': secrets.keySecret,
              'x-api-version': '2023-08-01',
            },
          })
          if (res.ok) {
            const payments = await res.json()
            if (Array.isArray(payments)) {
              const successPay = payments.find((p: any) => p.payment_status === 'SUCCESS')
              if (successPay) {
                return {
                  settled: true,
                  status: 'SUCCESS',
                  providerPaymentId: String(successPay.cf_payment_id),
                  providerOrderId: orderIdToQuery,
                  amountCents: Math.round(Number(successPay.payment_amount) * 100),
                  currency: successPay.payment_currency || 'INR',
                  method: successPay.payment_group?.toUpperCase() || 'ONLINE',
                  rawResponse: successPay,
                }
              }
              const failedPay = payments.find((p: any) => p.payment_status === 'FAILED' || p.payment_status === 'USER_DROPPED')
              if (failedPay && payments.length === 1) {
                return {
                  settled: false,
                  status: 'FAILED',
                  providerPaymentId: String(failedPay.cf_payment_id),
                  failureCode: failedPay.payment_status,
                  failureReason: failedPay.payment_message || 'Cashfree payment failed',
                  rawResponse: failedPay,
                }
              }
            }
          }
        }
        return { settled: false, status: 'UNCERTAIN', failureReason: 'No confirmed payments found on Cashfree order.' }
      } catch (err: any) {
        return { settled: false, status: 'UNCERTAIN', failureReason: `Network error querying Cashfree: ${err.message}` }
      }
    }

    // 3. PAYU
    if (upperProvider === 'PAYU') {
      if (gatewayOrderId?.startsWith('payu_mock_')) {
        return {
          settled: true,
          status: 'SUCCESS',
          providerPaymentId: `mihpay_mock_${Date.now()}`,
          providerOrderId: gatewayOrderId,
          amountCents: 500000,
          currency: 'INR',
          method: 'NET_BANKING',
        }
      }
      return { settled: false, status: 'UNCERTAIN', failureReason: 'PayU status pending merchant callback verification.' }
    }

    return { settled: false, status: 'UNCERTAIN', failureReason: `Unsupported provider for active query: ${upperProvider}` }
  }

  /**
   * STEP 3 & 4: CRITICAL RECOVERY WORKFLOW
   * Discovers inconsistent or unverified payments, checks provider, authoritatively verifies identity,
   * and settles atomically and idempotently.
   */
  static async recoverTransaction(
    ctx: ScopeActorContext,
    paymentId: string,
    options?: {
      overrideProviderCheck?: boolean
      mockProviderResult?: ProviderQueryResponse
      forceRecheck?: boolean
    }
  ) {
    const payment = await db.payment.findFirst({
      where: { id: paymentId, tenantId: ctx.tenantId },
      include: {
        invoice: { include: { student: true } },
        feeSchedule: { include: { student: true, feeItem: true } },
        student: true,
        receipt: true,
      },
    })

    if (!payment) {
      throw new Error(`Payment attempt ${paymentId} not found`)
    }

    let notesData: any = {}
    try {
      notesData = payment.notes ? JSON.parse(payment.notes) : {}
    } catch {
      notesData = { rawNotes: payment.notes }
    }

    const currentDetailedStatus: DetailedPaymentStatus =
      notesData.detailedStatus || (payment.status as DetailedPaymentStatus) || 'PENDING'
    const timeline: StructuredTimelineEvent[] = Array.isArray(notesData.timeline) ? notesData.timeline : []

    // If already in terminal SUCCESS state with receipt, return idempotent success
    if (payment.status === 'SUCCESS' && payment.receipt) {
      return {
        success: true,
        action: 'ALREADY_SETTLED',
        payment,
        receipt: payment.receipt,
        detailedStatus: 'SUCCESS',
        message: 'Payment has already been authoritatively verified and settled.',
      }
    }

    // STEP 2: Query Provider Official Status
    let providerRes: ProviderQueryResponse
    if (options?.mockProviderResult) {
      providerRes = options.mockProviderResult
    } else {
      providerRes = await this.queryProviderStatus(
        ctx.tenantId,
        notesData.provider || 'RAZORPAY',
        notesData.gatewayOrderId,
        notesData.gatewayPaymentId,
        payment.transactionRef
      )
    }

    // STEP 3: Verify Financial & Transaction Identity
    if (providerRes.status === 'SUCCESS') {
      // 1. Amount Verification
      if (providerRes.amountCents !== undefined && providerRes.amountCents !== payment.amountCents) {
        // Discrepancy detected! Must reject settlement and log security alert
        const mismatchError = `AMOUNT_MISMATCH: Expected ₹${payment.amountCents / 100}, but provider captured ₹${
          providerRes.amountCents / 100
        }`
        timeline.push({
          eventId: crypto.randomUUID(),
          previousStatus: currentDetailedStatus,
          newStatus: 'DISPUTED',
          event: 'PAYMENT_VERIFICATION_FAILED',
          source: 'RECONCILIATION',
          failureCode: 'AMOUNT_MISMATCH',
          failureReason: mismatchError,
          diagnostics: `Provider payment ${providerRes.providerPaymentId} amount differs from attempt`,
          at: new Date().toISOString(),
          by: ctx.actorName || ctx.actorId,
        })
        notesData.timeline = timeline
        notesData.detailedStatus = 'DISPUTED'
        notesData.disputeReason = mismatchError

        await db.payment.update({
          where: { id: payment.id },
          data: { notes: JSON.stringify(notesData) },
        })

        await recordAudit({
          tenantId: ctx.tenantId,
          branchId: payment.invoice?.branchId || payment.student?.branchId || null,
          actorId: ctx.actorId,
          actorName: ctx.actorName,
          actorRole: ctx.actorRole,
          action: 'SECURITY_ALERT_PAYMENT_MISMATCH',
          entity: 'Payment',
          entityId: payment.id,
          module: 'Fees',
          summary: `Security Alert: ${mismatchError} on payment ${payment.paymentNumber}`,
        })

        return {
          success: false,
          action: 'REJECTED_MISMATCH',
          detailedStatus: 'DISPUTED',
          error: mismatchError,
        }
      }

      // 2. Currency Verification
      if (providerRes.currency && providerRes.currency.toUpperCase() !== 'INR') {
        const currError = `CURRENCY_MISMATCH: Expected INR, got ${providerRes.currency}`
        notesData.detailedStatus = 'DISPUTED'
        await db.payment.update({
          where: { id: payment.id },
          data: { notes: JSON.stringify(notesData) },
        })
        return {
          success: false,
          action: 'REJECTED_CURRENCY',
          detailedStatus: 'DISPUTED',
          error: currError,
        }
      }

      // STEP 4: Atomic Payment Recovery
      const verifyResult = await FeeService.verifyPayment(
        {
          tenantId: ctx.tenantId,
          actorId: ctx.actorId,
          actorName: ctx.actorName,
          actorRole: ctx.actorRole,
        },
        {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          transactionRef: payment.transactionRef || undefined,
          gatewayPaymentId: providerRes.providerPaymentId || notesData.gatewayPaymentId,
          gatewayOrderId: providerRes.providerOrderId || notesData.gatewayOrderId,
          gatewayStatus: 'SUCCESS',
          eventSource: 'RECONCILIATION',
          diagnostics: 'Recovered via authoritative provider status reconciliation',
        }
      )

      // Update notes with detailedStatus = SUCCESS
      const refreshedPayment = await db.payment.findUnique({
        where: { id: payment.id },
        include: { receipt: true, invoice: true, feeSchedule: true },
      })
      if (refreshedPayment) {
        let refreshedNotes: any = {}
        try {
          refreshedNotes = refreshedPayment.notes ? JSON.parse(refreshedPayment.notes) : {}
        } catch {
          refreshedNotes = {}
        }
        refreshedNotes.detailedStatus = 'SUCCESS'
        refreshedNotes.recoveredAt = new Date().toISOString()
        refreshedNotes.reconciliationSource = 'PROVIDER_API_SYNC'
        await db.payment.update({
          where: { id: payment.id },
          data: { notes: JSON.stringify(refreshedNotes) },
        })
      }

      await recordAudit({
        tenantId: ctx.tenantId,
        branchId: payment.invoice?.branchId || payment.student?.branchId || null,
        actorId: ctx.actorId,
        actorName: ctx.actorName,
        actorRole: ctx.actorRole,
        action: 'PAYMENT_RECONCILED_SUCCESS',
        entity: 'Payment',
        entityId: payment.id,
        module: 'Fees',
        summary: `Authoritatively recovered payment ${payment.paymentNumber} from provider ${notesData.provider}. Receipt: ${
          verifyResult.receipt?.receiptNumber || 'N/A'
        }`,
      })

      return {
        success: true,
        action: 'RECOVERED_SUCCESS',
        detailedStatus: 'SUCCESS',
        payment: refreshedPayment || verifyResult.payment,
        receipt: verifyResult.receipt,
        invoice: verifyResult.invoice,
        message: 'Payment verified and recovered successfully from provider records.',
      }
    }

    // STEP 6: If Provider Confirms Definite Failure
    if (providerRes.status === 'FAILED') {
      const verifyResult = await FeeService.verifyPayment(
        {
          tenantId: ctx.tenantId,
          actorId: ctx.actorId,
          actorName: ctx.actorName,
          actorRole: ctx.actorRole,
        },
        {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          transactionRef: payment.transactionRef || undefined,
          gatewayPaymentId: providerRes.providerPaymentId || notesData.gatewayPaymentId,
          gatewayOrderId: providerRes.providerOrderId || notesData.gatewayOrderId,
          gatewayStatus: 'FAILED',
          failureCode: providerRes.failureCode || 'PROVIDER_DECLINED',
          failureReason: providerRes.failureReason || 'Declined by payment provider',
          eventSource: 'RECONCILIATION',
          diagnostics: 'Authoritatively confirmed FAILED by provider status check',
        }
      )

      return {
        success: false,
        action: 'CONFIRMED_FAILED',
        detailedStatus: 'FAILED',
        payment: verifyResult.payment,
        receipt: null,
        error: providerRes.failureReason || 'Transaction confirmed failed by provider',
      }
    }

    // STEP 5: If Provider Status is Still Uncertain
    // Never mark FAILED! Retain in VERIFICATION_PENDING or RECONCILIATION_PENDING.
    const newStatus: DetailedPaymentStatus = 'RECONCILIATION_PENDING'
    timeline.push({
      eventId: crypto.randomUUID(),
      previousStatus: currentDetailedStatus,
      newStatus,
      event: 'PAYMENT_RECONCILIATION_STARTED',
      source: 'RECONCILIATION',
      diagnostics: providerRes.failureReason || 'Provider status currently uncertain; scheduled for follow-up verification',
      at: new Date().toISOString(),
      by: ctx.actorName || ctx.actorId,
    })
    notesData.timeline = timeline
    notesData.detailedStatus = newStatus
    notesData.lastCheckedAt = new Date().toISOString()
    notesData.verificationNotice =
      'We are checking your payment status with the bank/gateway. Please do not re-attempt payment yet.'

    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        notes: JSON.stringify(notesData),
      },
    })

    return {
      success: false,
      action: 'HELD_PENDING_VERIFICATION',
      detailedStatus: newStatus,
      payment: updated,
      receipt: null,
      message: 'Provider status is pending or uncertain. Transaction held under reconciliation without double charge.',
    }
  }
}
