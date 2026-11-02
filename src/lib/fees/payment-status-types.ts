import crypto from 'crypto'

export type ProviderPaymentStatus =
  | 'NOT_CREATED'
  | 'ORDER_CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'UNKNOWN'

export type InternalPaymentStatus =
  | 'CREATED'
  | 'INITIATED'
  | 'PENDING'
  | 'VERIFICATION_PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'MANUAL_REVIEW'

export type ReconciliationStatus =
  | 'NOT_REQUIRED'
  | 'NOT_STARTED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'MATCHED'
  | 'MISMATCH'
  | 'RETRY_PENDING'
  | 'MANUAL_REVIEW'
  | 'RESOLVED'

export type PaymentLifecycleEventType =
  | 'PAYMENT_INITIATED'
  | 'PROVIDER_ORDER_CREATED'
  | 'PROVIDER_PAYMENT_PENDING'
  | 'PROVIDER_PAYMENT_AUTHORIZED'
  | 'PROVIDER_PAYMENT_CAPTURED'
  | 'PROVIDER_PAYMENT_FAILED'
  | 'WEBHOOK_RECEIVED'
  | 'WEBHOOK_VERIFIED'
  | 'WEBHOOK_REJECTED'
  | 'WEBHOOK_PROCESSING_FAILED'
  | 'PAYMENT_VERIFICATION_STARTED'
  | 'PAYMENT_VERIFICATION_TIMEOUT'
  | 'PAYMENT_PROVIDER_CONFIRMED'
  | 'INTERNAL_PAYMENT_PROCESSING_STARTED'
  | 'PAYMENT_ALLOCATION_COMPLETED'
  | 'RECEIPT_GENERATED'
  | 'INTERNAL_PAYMENT_SUCCESS'
  | 'RECONCILIATION_STARTED'
  | 'RECONCILIATION_MATCHED'
  | 'RECONCILIATION_MISMATCH'
  | 'PAYMENT_RECOVERED'
  | 'PAYMENT_MANUAL_REVIEW'
  | 'REFUND_REQUESTED'
  | 'REFUND_COMPLETED'

export interface ThreeDimensionTimelineEvent {
  eventId: string
  paymentAttemptId: string
  tenantId: string
  eventType: PaymentLifecycleEventType | string
  source: 'API' | 'PROVIDER_WEBHOOK' | 'RECONCILIATION' | 'ADMIN_ACTION' | 'SYSTEM'
  previousProviderStatus: ProviderPaymentStatus | null
  newProviderStatus: ProviderPaymentStatus
  previousInternalStatus: InternalPaymentStatus | null
  newInternalStatus: InternalPaymentStatus
  previousReconciliationStatus: ReconciliationStatus | null
  newReconciliationStatus: ReconciliationStatus
  providerEventId?: string | null
  correlationId?: string | null
  timestamp: string
  actorType: 'USER' | 'SYSTEM' | 'ADMIN' | 'PARENT'
  actorId?: string | null
  processingResult?: string | null
  safeDiagnosticCode?: string | null
  diagnostics?: string | null
}

export interface ReconciliationExecutionRecord {
  reconciliationId: string
  paymentAttemptId: string
  provider: string
  reconciliationTrigger: 'SCHEDULED_WORKER' | 'ADMIN_ACTION' | 'WEBHOOK' | 'PARENT_STATUS_CHECK'
  providerStatusBefore: ProviderPaymentStatus
  providerStatusAfter: ProviderPaymentStatus
  internalStatusBefore: InternalPaymentStatus
  internalStatusAfter: InternalPaymentStatus
  reconciliationStatus: ReconciliationStatus
  amountComparison: {
    expectedCents: number
    providerCents: number
    matched: boolean
  }
  currencyComparison: {
    expected: string
    provider: string
    matched: boolean
  }
  orderReferenceComparison: {
    expected: string
    provider: string
    matched: boolean
  }
  startedAt: string
  completedAt: string
  retryCount: number
  errorCode?: string | null
  resolution?: string | null
}

export interface PaymentAttemptMetadata {
  provider: 'RAZORPAY' | 'CASHFREE' | 'PAYU' | string
  providerStatus: ProviderPaymentStatus
  rawProviderStatus?: string
  gatewayOrderId?: string | null
  gatewayPaymentId?: string | null
  providerVerifiedAt?: string | null

  internalPaymentStatus: InternalPaymentStatus
  internalSettledAt?: string | null

  reconciliationStatus: ReconciliationStatus
  lastReconciledAt?: string | null
  reconciliationCount?: number
  reconciliationNotes?: string | null
  discrepancyDetails?: {
    field: string
    expected: any
    actual: any
  }[]

  branchId?: string | null
  guardianId?: string | null
  currency: 'INR' | string
  retryOfPaymentId?: string | null
  previousAttemptRef?: string | null
  retryNumber?: number
  failureCode?: string | null
  failureReason?: string | null
  checkoutMode?: string

  totalRefundedCents?: number
  lastRefundAmountCents?: number
  refundRef?: string | null
  refundReason?: string | null

  timeline: ThreeDimensionTimelineEvent[]
  reconciliationHistory: ReconciliationExecutionRecord[]
}

/**
 * Provider-specific Status Normalization Adapters
 */
export function normalizeRazorpayStatus(rawStatus?: string | null): ProviderPaymentStatus {
  if (!rawStatus) return 'UNKNOWN'
  const s = rawStatus.toLowerCase().trim()
  switch (s) {
    case 'created':
      return 'PENDING'
    case 'authorized':
      return 'AUTHORIZED'
    case 'captured':
      return 'CAPTURED'
    case 'failed':
      return 'FAILED'
    case 'refunded':
      return 'REFUNDED'
    default:
      return 'UNKNOWN'
  }
}

export function normalizeCashfreeStatus(rawStatus?: string | null): ProviderPaymentStatus {
  if (!rawStatus) return 'UNKNOWN'
  const s = rawStatus.toUpperCase().trim()
  switch (s) {
    case 'SUCCESS':
      return 'CAPTURED'
    case 'PENDING':
      return 'PENDING'
    case 'FAILED':
      return 'FAILED'
    case 'USER_DROPPED':
    case 'CANCELLED':
      return 'CANCELLED'
    case 'REFUNDED':
      return 'REFUNDED'
    default:
      return 'UNKNOWN'
  }
}

export function normalizePayUStatus(rawStatus?: string | null): ProviderPaymentStatus {
  if (!rawStatus) return 'UNKNOWN'
  const s = rawStatus.toLowerCase().trim()
  switch (s) {
    case 'success':
      return 'CAPTURED'
    case 'pending':
    case 'in progress':
      return 'PENDING'
    case 'failure':
    case 'failed':
      return 'FAILED'
    case 'bounced':
    case 'usercancelled':
    case 'cancelled':
      return 'CANCELLED'
    default:
      return 'UNKNOWN'
  }
}

/**
 * Normalizes any provider status string given the provider identifier
 */
export function normalizeProviderStatus(provider: string, rawStatus?: string | null): ProviderPaymentStatus {
  const p = provider.toUpperCase()
  if (p === 'RAZORPAY') return normalizeRazorpayStatus(rawStatus)
  if (p === 'CASHFREE') return normalizeCashfreeStatus(rawStatus)
  if (p === 'PAYU') return normalizePayUStatus(rawStatus)
  return 'UNKNOWN'
}

/**
 * Maps InternalPaymentStatus to canonical DB status ('PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED')
 */
export function mapInternalToDbStatus(internal: InternalPaymentStatus): 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' {
  switch (internal) {
    case 'SUCCESS':
    case 'PARTIALLY_REFUNDED':
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

/**
 * Helper to parse all 3 statuses from a payment record
 */
export function parsePaymentMetadata(payment: {
  id?: string
  status?: string
  notes?: string | null
}): PaymentAttemptMetadata {
  let parsed: any = {}
  try {
    parsed = payment.notes ? JSON.parse(payment.notes) : {}
  } catch {
    parsed = {}
  }

  // Derive providerStatus
  const providerStatus: ProviderPaymentStatus =
    parsed.providerStatus || (parsed.rawProviderStatus ? normalizeProviderStatus(parsed.provider || 'RAZORPAY', parsed.rawProviderStatus) : (payment.status === 'SUCCESS' ? 'CAPTURED' : payment.status === 'FAILED' ? 'FAILED' : 'PENDING'))

  // Derive internalPaymentStatus
  const internalPaymentStatus: InternalPaymentStatus =
    parsed.internalPaymentStatus || parsed.detailedStatus || (payment.status as InternalPaymentStatus) || 'PENDING'

  // Derive reconciliationStatus
  const reconciliationStatus: ReconciliationStatus =
    parsed.reconciliationStatus || (internalPaymentStatus === 'SUCCESS' && providerStatus === 'CAPTURED' ? 'MATCHED' : 'PENDING')

  return {
    provider: parsed.provider || 'RAZORPAY',
    providerStatus,
    rawProviderStatus: parsed.rawProviderStatus,
    gatewayOrderId: parsed.gatewayOrderId || null,
    gatewayPaymentId: parsed.gatewayPaymentId || null,
    providerVerifiedAt: parsed.providerVerifiedAt || null,

    internalPaymentStatus,
    internalSettledAt: parsed.internalSettledAt || (internalPaymentStatus === 'SUCCESS' ? new Date().toISOString() : null),

    reconciliationStatus,
    lastReconciledAt: parsed.lastReconciledAt || null,
    reconciliationCount: parsed.reconciliationCount || 0,
    reconciliationNotes: parsed.reconciliationNotes || null,
    discrepancyDetails: parsed.discrepancyDetails || [],

    branchId: parsed.branchId || null,
    guardianId: parsed.guardianId || null,
    currency: parsed.currency || 'INR',
    retryOfPaymentId: parsed.retryOfPaymentId || null,
    previousAttemptRef: parsed.previousAttemptRef || null,
    retryNumber: parsed.retryNumber || 1,
    failureCode: parsed.failureCode || null,
    failureReason: parsed.failureReason || null,
    checkoutMode: parsed.checkoutMode || 'SANDBOX',

    totalRefundedCents: Number(parsed.totalRefundedCents || 0),
    lastRefundAmountCents: Number(parsed.lastRefundAmountCents || 0),
    refundRef: parsed.refundRef || null,
    refundReason: parsed.refundReason || null,

    timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
    reconciliationHistory: Array.isArray(parsed.reconciliationHistory) ? parsed.reconciliationHistory : [],
  }
}

/**
 * Helper to encode updated metadata back into a JSON string for Payment.notes
 */
export function encodePaymentMetadata(meta: PaymentAttemptMetadata): string {
  return JSON.stringify(meta)
}
