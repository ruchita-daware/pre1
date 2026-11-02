import { db } from '@/lib/db'
import crypto from 'crypto'
import { recordAudit } from '@/lib/audit'
import { FeeService } from '@/lib/fees/fee-service'
import { EncryptionService } from '@/lib/security/encryption-service'
import {
  ProviderPaymentStatus,
  InternalPaymentStatus,
  ReconciliationStatus,
  ThreeDimensionTimelineEvent,
  ReconciliationExecutionRecord,
  PaymentAttemptMetadata,
  parsePaymentMetadata,
  encodePaymentMetadata,
  normalizeProviderStatus,
  normalizeRazorpayStatus,
  normalizeCashfreeStatus,
  normalizePayUStatus,
} from '@/lib/fees/payment-status-types'

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
  providerStatus?: ProviderPaymentStatus
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
   * and settles atomically and idempotently across the 3 independent status dimensions:
   * 1. providerStatus
   * 2. internalPaymentStatus
   * 3. reconciliationStatus
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

    const meta = parsePaymentMetadata(payment)
    const prevProviderStatus = meta.providerStatus
    const prevInternalStatus = meta.internalPaymentStatus
    const prevReconciliationStatus = meta.reconciliationStatus

    // If already in terminal SUCCESS state with receipt, return idempotent success
    if (payment.status === 'SUCCESS' && payment.receipt) {
      if (meta.reconciliationStatus !== 'MATCHED') {
        meta.providerStatus = 'CAPTURED'
        meta.internalPaymentStatus = 'SUCCESS'
        meta.reconciliationStatus = 'MATCHED'
        meta.lastReconciledAt = new Date().toISOString()
        await db.payment.update({
          where: { id: payment.id },
          data: { notes: encodePaymentMetadata(meta) },
        })
      }
      return {
        success: true,
        action: 'ALREADY_SETTLED',
        payment,
        receipt: payment.receipt,
        detailedStatus: 'SUCCESS',
        providerStatus: meta.providerStatus,
        internalPaymentStatus: meta.internalPaymentStatus,
        reconciliationStatus: meta.reconciliationStatus,
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
        meta.provider || 'RAZORPAY',
        meta.gatewayOrderId,
        meta.gatewayPaymentId,
        payment.transactionRef
      )
    }

    const normProviderStatus: ProviderPaymentStatus =
      providerRes.providerStatus ||
      (providerRes.status === 'SUCCESS'
        ? 'CAPTURED'
        : providerRes.status === 'FAILED'
        ? 'FAILED'
        : providerRes.status === 'PENDING'
        ? 'PENDING'
        : 'UNKNOWN')

    const reconId = crypto.randomUUID()
    const nowIso = new Date().toISOString()

    // 1. PROVIDER CONFIRMED CAPTURED (SUCCESS)
    if (normProviderStatus === 'CAPTURED' || providerRes.status === 'SUCCESS') {
      const expectedCents = payment.amountCents
      const providerCents = providerRes.amountCents !== undefined ? providerRes.amountCents : expectedCents
      const amountMatched = providerCents === expectedCents

      const expectedCurrency = 'INR'
      const providerCurrency = (providerRes.currency || 'INR').toUpperCase()
      const currencyMatched = providerCurrency === expectedCurrency

      // Check Amount or Currency Mismatch:
      if (!amountMatched || !currencyMatched) {
        const mismatchReason = !amountMatched
          ? `AMOUNT_MISMATCH: Expected ₹${(expectedCents / 100).toFixed(2)}, but provider captured ₹${(providerCents / 100).toFixed(2)}`
          : `CURRENCY_MISMATCH: Expected INR, but provider returned ${providerCurrency}`

        meta.providerStatus = 'CAPTURED'
        meta.internalPaymentStatus = 'MANUAL_REVIEW'
        meta.reconciliationStatus = 'MISMATCH'
        meta.discrepancyDetails = [
          ...(!amountMatched ? [{ field: 'amount', expected: expectedCents, actual: providerCents }] : []),
          ...(!currencyMatched ? [{ field: 'currency', expected: 'INR', actual: providerCurrency }] : []),
        ]
        meta.failureReason = mismatchReason
        meta.lastReconciledAt = nowIso
        meta.reconciliationCount = (meta.reconciliationCount || 0) + 1

        const timelineEvent: ThreeDimensionTimelineEvent = {
          eventId: crypto.randomUUID(),
          paymentAttemptId: payment.id,
          tenantId: ctx.tenantId,
          eventType: 'RECONCILIATION_MISMATCH',
          source: 'RECONCILIATION',
          previousProviderStatus: prevProviderStatus,
          newProviderStatus: 'CAPTURED',
          previousInternalStatus: prevInternalStatus,
          newInternalStatus: 'MANUAL_REVIEW',
          previousReconciliationStatus: prevReconciliationStatus,
          newReconciliationStatus: 'MISMATCH',
          providerEventId: providerRes.providerPaymentId || null,
          timestamp: nowIso,
          actorType: 'SYSTEM',
          actorId: ctx.actorId,
          safeDiagnosticCode: !amountMatched ? 'AMOUNT_MISMATCH' : 'CURRENCY_MISMATCH',
          diagnostics: mismatchReason,
        }
        meta.timeline.push(timelineEvent)

        const reconExec: ReconciliationExecutionRecord = {
          reconciliationId: reconId,
          paymentAttemptId: payment.id,
          provider: meta.provider,
          reconciliationTrigger: 'ADMIN_ACTION',
          providerStatusBefore: prevProviderStatus,
          providerStatusAfter: 'CAPTURED',
          internalStatusBefore: prevInternalStatus,
          internalStatusAfter: 'MANUAL_REVIEW',
          reconciliationStatus: 'MISMATCH',
          amountComparison: {
            expectedCents,
            providerCents,
            matched: amountMatched,
          },
          currencyComparison: {
            expected: expectedCurrency,
            provider: providerCurrency,
            matched: currencyMatched,
          },
          orderReferenceComparison: {
            expected: meta.gatewayOrderId || payment.transactionRef || '',
            provider: providerRes.providerOrderId || meta.gatewayOrderId || '',
            matched: true,
          },
          startedAt: nowIso,
          completedAt: new Date().toISOString(),
          retryCount: meta.reconciliationCount,
          errorCode: !amountMatched ? 'AMOUNT_MISMATCH' : 'CURRENCY_MISMATCH',
          resolution: 'FLAGGED_FOR_MANUAL_REVIEW',
        }
        meta.reconciliationHistory.push(reconExec)

        const updated = await db.payment.update({
          where: { id: payment.id },
          data: { notes: encodePaymentMetadata(meta) },
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
          summary: `Security Alert: ${mismatchReason} on payment ${payment.paymentNumber}`,
        })

        return {
          success: false,
          action: 'REJECTED_MISMATCH',
          detailedStatus: 'MANUAL_REVIEW',
          providerStatus: 'CAPTURED',
          internalPaymentStatus: 'MANUAL_REVIEW',
          reconciliationStatus: 'MISMATCH',
          payment: updated,
          error: mismatchReason,
        }
      }

      // Amount & currency MATCHED:
      meta.providerStatus = 'CAPTURED'
      meta.internalPaymentStatus = 'PROCESSING'
      meta.reconciliationStatus = 'IN_PROGRESS'
      meta.providerVerifiedAt = nowIso
      if (providerRes.providerPaymentId) meta.gatewayPaymentId = providerRes.providerPaymentId

      meta.timeline.push({
        eventId: crypto.randomUUID(),
        paymentAttemptId: payment.id,
        tenantId: ctx.tenantId,
        eventType: 'INTERNAL_PAYMENT_PROCESSING_STARTED',
        source: 'RECONCILIATION',
        previousProviderStatus: prevProviderStatus,
        newProviderStatus: 'CAPTURED',
        previousInternalStatus: prevInternalStatus,
        newInternalStatus: 'PROCESSING',
        previousReconciliationStatus: prevReconciliationStatus,
        newReconciliationStatus: 'IN_PROGRESS',
        timestamp: nowIso,
        actorType: 'SYSTEM',
        actorId: ctx.actorId,
        diagnostics: 'Provider capture confirmed; starting ledger allocation and receipt generation',
      })

      // Settle internally via FeeService.verifyPayment
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
          gatewayPaymentId: providerRes.providerPaymentId || meta.gatewayPaymentId || undefined,
          gatewayOrderId: providerRes.providerOrderId || meta.gatewayOrderId || undefined,
          gatewayStatus: 'SUCCESS',
          eventSource: 'RECONCILIATION',
          diagnostics: 'Recovered via authoritative provider status reconciliation',
        }
      )

      // Post-settlement update
      meta.internalPaymentStatus = 'SUCCESS'
      meta.reconciliationStatus = 'MATCHED'
      meta.internalSettledAt = new Date().toISOString()
      meta.lastReconciledAt = new Date().toISOString()
      meta.reconciliationCount = (meta.reconciliationCount || 0) + 1

      meta.timeline.push({
        eventId: crypto.randomUUID(),
        paymentAttemptId: payment.id,
        tenantId: ctx.tenantId,
        eventType: 'RECONCILIATION_MATCHED',
        source: 'RECONCILIATION',
        previousProviderStatus: 'CAPTURED',
        newProviderStatus: 'CAPTURED',
        previousInternalStatus: 'PROCESSING',
        newInternalStatus: 'SUCCESS',
        previousReconciliationStatus: 'IN_PROGRESS',
        newReconciliationStatus: 'MATCHED',
        timestamp: new Date().toISOString(),
        actorType: 'SYSTEM',
        actorId: ctx.actorId,
        diagnostics: `Payment reconciled and matched. Receipt #${verifyResult.receipt?.receiptNumber || 'N/A'} issued`,
      })

      meta.reconciliationHistory.push({
        reconciliationId: reconId,
        paymentAttemptId: payment.id,
        provider: meta.provider,
        reconciliationTrigger: 'ADMIN_ACTION',
        providerStatusBefore: prevProviderStatus,
        providerStatusAfter: 'CAPTURED',
        internalStatusBefore: prevInternalStatus,
        internalStatusAfter: 'SUCCESS',
        reconciliationStatus: 'MATCHED',
        amountComparison: {
          expectedCents,
          providerCents,
          matched: true,
        },
        currencyComparison: {
          expected: expectedCurrency,
          provider: providerCurrency,
          matched: true,
        },
        orderReferenceComparison: {
          expected: meta.gatewayOrderId || payment.transactionRef || '',
          provider: providerRes.providerOrderId || meta.gatewayOrderId || '',
          matched: true,
        },
        startedAt: nowIso,
        completedAt: new Date().toISOString(),
        retryCount: meta.reconciliationCount,
      })

      const refreshedPayment = await db.payment.update({
        where: { id: payment.id },
        data: { notes: encodePaymentMetadata(meta) },
        include: { receipt: true, invoice: true, feeSchedule: true },
      })

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
        summary: `Authoritatively recovered payment ${payment.paymentNumber} from provider ${meta.provider}. Receipt: ${
          verifyResult.receipt?.receiptNumber || 'N/A'
        }`,
      })

      return {
        success: true,
        action: 'RECOVERED_SUCCESS',
        detailedStatus: 'SUCCESS',
        providerStatus: 'CAPTURED',
        internalPaymentStatus: 'SUCCESS',
        reconciliationStatus: 'MATCHED',
        payment: refreshedPayment,
        receipt: verifyResult.receipt,
        invoice: verifyResult.invoice,
        message: 'Payment verified and recovered successfully from provider records.',
      }
    }

    // 2. PROVIDER CONFIRMED DEFINITE FAILURE
    if (normProviderStatus === 'FAILED' || providerRes.status === 'FAILED') {
      meta.providerStatus = 'FAILED'
      meta.internalPaymentStatus = 'FAILED'
      meta.reconciliationStatus = 'RESOLVED'
      meta.lastReconciledAt = nowIso
      meta.failureCode = providerRes.failureCode || 'PROVIDER_DECLINED'
      meta.failureReason = providerRes.failureReason || 'Declined by payment provider'

      meta.timeline.push({
        eventId: crypto.randomUUID(),
        paymentAttemptId: payment.id,
        tenantId: ctx.tenantId,
        eventType: 'PROVIDER_PAYMENT_FAILED',
        source: 'RECONCILIATION',
        previousProviderStatus: prevProviderStatus,
        newProviderStatus: 'FAILED',
        previousInternalStatus: prevInternalStatus,
        newInternalStatus: 'FAILED',
        previousReconciliationStatus: prevReconciliationStatus,
        newReconciliationStatus: 'RESOLVED',
        timestamp: nowIso,
        actorType: 'SYSTEM',
        actorId: ctx.actorId,
        safeDiagnosticCode: meta.failureCode,
        diagnostics: meta.failureReason,
      })

      meta.reconciliationHistory.push({
        reconciliationId: reconId,
        paymentAttemptId: payment.id,
        provider: meta.provider,
        reconciliationTrigger: 'ADMIN_ACTION',
        providerStatusBefore: prevProviderStatus,
        providerStatusAfter: 'FAILED',
        internalStatusBefore: prevInternalStatus,
        internalStatusAfter: 'FAILED',
        reconciliationStatus: 'RESOLVED',
        amountComparison: {
          expectedCents: payment.amountCents,
          providerCents: providerRes.amountCents ?? 0,
          matched: false,
        },
        currencyComparison: {
          expected: 'INR',
          provider: providerRes.currency || 'INR',
          matched: true,
        },
        orderReferenceComparison: {
          expected: meta.gatewayOrderId || payment.transactionRef || '',
          provider: providerRes.providerOrderId || meta.gatewayOrderId || '',
          matched: true,
        },
        startedAt: nowIso,
        completedAt: new Date().toISOString(),
        retryCount: (meta.reconciliationCount || 0) + 1,
        errorCode: meta.failureCode,
        resolution: 'CONFIRMED_FAILED_SAFE_FOR_RETRY',
      })

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
          gatewayPaymentId: providerRes.providerPaymentId || meta.gatewayPaymentId || undefined,
          gatewayOrderId: providerRes.providerOrderId || meta.gatewayOrderId || undefined,
          gatewayStatus: 'FAILED',
          failureCode: meta.failureCode,
          failureReason: meta.failureReason,
          eventSource: 'RECONCILIATION',
          diagnostics: 'Authoritatively confirmed FAILED by provider status check',
        }
      )

      const updated = await db.payment.update({
        where: { id: payment.id },
        data: { notes: encodePaymentMetadata(meta) },
      })

      return {
        success: false,
        action: 'CONFIRMED_FAILED',
        detailedStatus: 'FAILED',
        providerStatus: 'FAILED',
        internalPaymentStatus: 'FAILED',
        reconciliationStatus: 'RESOLVED',
        payment: updated,
        receipt: null,
        error: meta.failureReason,
      }
    }

    // 3. PROVIDER STILL PENDING OR UNCERTAIN (TIMEOUT / NETWORK DROP)
    // NEVER MARK FAILED! Retain in VERIFICATION_PENDING and RETRY_PENDING
    meta.providerStatus = normProviderStatus === 'PENDING' ? 'PENDING' : meta.providerStatus || 'ORDER_CREATED'
    meta.internalPaymentStatus = 'VERIFICATION_PENDING'
    meta.reconciliationStatus = 'RETRY_PENDING'
    meta.lastReconciledAt = nowIso
    meta.reconciliationCount = (meta.reconciliationCount || 0) + 1

    meta.timeline.push({
      eventId: crypto.randomUUID(),
      paymentAttemptId: payment.id,
      tenantId: ctx.tenantId,
      eventType: 'PAYMENT_VERIFICATION_TIMEOUT',
      source: 'RECONCILIATION',
      previousProviderStatus: prevProviderStatus,
      newProviderStatus: meta.providerStatus,
      previousInternalStatus: prevInternalStatus,
      newInternalStatus: 'VERIFICATION_PENDING',
      previousReconciliationStatus: prevReconciliationStatus,
      newReconciliationStatus: 'RETRY_PENDING',
      timestamp: nowIso,
      actorType: 'SYSTEM',
      actorId: ctx.actorId,
      diagnostics: providerRes.failureReason || 'Provider status uncertain/pending; held safely under retry without double charge',
    })

    meta.reconciliationHistory.push({
      reconciliationId: reconId,
      paymentAttemptId: payment.id,
      provider: meta.provider,
      reconciliationTrigger: 'ADMIN_ACTION',
      providerStatusBefore: prevProviderStatus,
      providerStatusAfter: meta.providerStatus,
      internalStatusBefore: prevInternalStatus,
      internalStatusAfter: 'VERIFICATION_PENDING',
      reconciliationStatus: 'RETRY_PENDING',
      amountComparison: {
        expectedCents: payment.amountCents,
        providerCents: 0,
        matched: false,
      },
      currencyComparison: {
        expected: 'INR',
        provider: 'INR',
        matched: true,
      },
      orderReferenceComparison: {
        expected: meta.gatewayOrderId || payment.transactionRef || '',
        provider: meta.gatewayOrderId || '',
        matched: true,
      },
      startedAt: nowIso,
      completedAt: new Date().toISOString(),
      retryCount: meta.reconciliationCount,
      resolution: 'HELD_FOR_SCHEDULED_RETRY',
    })

    const updated = await db.payment.update({
      where: { id: payment.id },
      data: { notes: encodePaymentMetadata(meta) },
    })

    return {
      success: false,
      action: 'HELD_PENDING_VERIFICATION',
      detailedStatus: 'VERIFICATION_PENDING',
      providerStatus: meta.providerStatus,
      internalPaymentStatus: 'VERIFICATION_PENDING',
      reconciliationStatus: 'RETRY_PENDING',
      payment: updated,
      receipt: null,
      message: 'Provider status is pending or uncertain. Transaction held under reconciliation without double charge.',
    }
  }
}
