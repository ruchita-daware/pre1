import { db } from '@/lib/db'
import crypto from 'crypto'
import { recordAudit } from '@/lib/audit'

export type WebhookStatus =
  | 'RECEIVED'
  | 'SIGNATURE_VERIFIED'
  | 'REJECTED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'DUPLICATE'
  | 'FAILED'
  | 'RETRY_PENDING'
  | 'DEAD_LETTER'

export interface WebhookEventRecord {
  id: string
  tenantId: string
  provider: 'RAZORPAY' | 'CASHFREE' | 'PAYU'
  providerEventId: string
  eventType: string
  status: WebhookStatus
  signatureValid: boolean
  headersMasked: Record<string, string>
  payloadSummary: Record<string, any>
  paymentId?: string
  receiptNumber?: string
  error?: string
  retryCount: number
  createdAt: string
  processedAt?: string
}

export class WebhookEventService {
  /**
   * Fetch all webhook event records for a tenant
   */
  static async getEvents(tenantId: string, limit = 50): Promise<WebhookEventRecord[]> {
    const config = await db.schoolConfig.findUnique({
      where: { tenantId_domain: { tenantId, domain: 'FINANCE' } },
    })
    const data = (config?.data as Record<string, any>) || {}
    const events: WebhookEventRecord[] = Array.isArray(data.webhookEvents) ? data.webhookEvents : []
    return events.slice(-limit).reverse()
  }

  /**
   * Check if a provider event ID has already been recorded and processed
   */
  static async checkDuplicate(
    tenantId: string,
    provider: string,
    providerEventId: string
  ): Promise<WebhookEventRecord | null> {
    if (!providerEventId) return null
    const events = await this.getEvents(tenantId, 200)
    const existing = events.find(
      (e) =>
        e.provider.toUpperCase() === provider.toUpperCase() &&
        e.providerEventId === providerEventId &&
        (e.status === 'PROCESSED' || e.status === 'DUPLICATE')
    )
    return existing || null
  }

  /**
   * Persist incoming webhook event before acknowledging
   */
  static async recordEvent(
    tenantId: string,
    input: {
      provider: 'RAZORPAY' | 'CASHFREE' | 'PAYU'
      providerEventId: string
      eventType: string
      status: WebhookStatus
      signatureValid: boolean
      headersMasked?: Record<string, string>
      payloadSummary?: Record<string, any>
      error?: string
    }
  ): Promise<WebhookEventRecord> {
    const eventId = `wh_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    const record: WebhookEventRecord = {
      id: eventId,
      tenantId,
      provider: input.provider,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      status: input.status,
      signatureValid: input.signatureValid,
      headersMasked: input.headersMasked || {},
      payloadSummary: input.payloadSummary || {},
      error: input.error,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    }

    const config = await db.schoolConfig.findUnique({
      where: { tenantId_domain: { tenantId, domain: 'FINANCE' } },
    })
    const currentData = (config?.data as Record<string, any>) || {}
    const events: WebhookEventRecord[] = Array.isArray(currentData.webhookEvents) ? currentData.webhookEvents : []

    // Keep up to 300 recent webhook events
    const updatedEvents = [...events.slice(-299), record]
    const updatedData = {
      ...currentData,
      webhookEvents: updatedEvents,
    }

    await db.schoolConfig.upsert({
      where: { tenantId_domain: { tenantId, domain: 'FINANCE' } },
      create: {
        tenantId,
        domain: 'FINANCE',
        data: updatedData,
      },
      update: {
        data: updatedData,
      },
    })

    return record
  }

  /**
   * Update the processing status of a recorded event
   */
  static async updateEventStatus(
    tenantId: string,
    eventId: string,
    status: WebhookStatus,
    details?: { paymentId?: string; receiptNumber?: string; error?: string }
  ) {
    const config = await db.schoolConfig.findUnique({
      where: { tenantId_domain: { tenantId, domain: 'FINANCE' } },
    })
    if (!config) return

    const currentData = (config.data as Record<string, any>) || {}
    const events: WebhookEventRecord[] = Array.isArray(currentData.webhookEvents) ? currentData.webhookEvents : []

    const idx = events.findIndex((e) => e.id === eventId)
    if (idx !== -1) {
      events[idx] = {
        ...events[idx],
        status,
        ...(details?.paymentId ? { paymentId: details.paymentId } : {}),
        ...(details?.receiptNumber ? { receiptNumber: details.receiptNumber } : {}),
        ...(details?.error ? { error: details.error } : {}),
        processedAt: new Date().toISOString(),
      }

      await db.schoolConfig.update({
        where: { tenantId_domain: { tenantId, domain: 'FINANCE' } },
        data: { data: { ...currentData, webhookEvents: events } },
      })
    }
  }

  /**
   * Manual replay of a failed or pending webhook event by authorized admin
   */
  static async replayEvent(
    tenantId: string,
    eventId: string,
    actorCtx: { actorId: string; actorName?: string; actorRole?: string }
  ) {
    const events = await this.getEvents(tenantId, 300)
    const event = events.find((e) => e.id === eventId)
    if (!event) throw new Error('Webhook event not found')

    await recordAudit({
      tenantId,
      actorId: actorCtx.actorId,
      actorName: actorCtx.actorName,
      actorRole: actorCtx.actorRole,
      action: 'REPLAY_WEBHOOK_EVENT',
      entity: 'SchoolConfig',
      entityId: eventId,
      module: 'Fees',
      summary: `Admin replayed webhook event ${eventId} (${event.provider} - ${event.eventType})`,
    })

    // Increment retry count and mark retry pending
    await this.updateEventStatus(tenantId, eventId, 'RETRY_PENDING')
    return { success: true, message: `Webhook event ${eventId} queued for replay.` }
  }
}
