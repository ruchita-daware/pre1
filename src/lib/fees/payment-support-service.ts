import { db } from '@/lib/db'
import { recordAudit } from '@/lib/audit'

export type PaymentIssueStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'WAITING_FOR_PROVIDER'
  | 'WAITING_FOR_PARENT'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_NOT_CONFIRMED'
  | 'REFUND_REQUIRED'
  | 'RESOLVED'
  | 'ESCALATED'

export type PaymentIssuePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export interface PaymentIssueHistoryEntry {
  action: string
  by: string
  at: string
  notes?: string
}

export interface PaymentIssueRecord {
  id: string
  tenantId: string
  studentId: string
  studentName?: string
  admissionNo?: string
  parentUserId?: string
  parentName?: string
  paymentId?: string
  transactionRef?: string
  provider: string
  providerPaymentId?: string
  amountCents: number
  reportedIssue: string
  status: PaymentIssueStatus
  priority: PaymentIssuePriority
  assignedStaffId?: string
  assignedStaffName?: string
  resolutionNotes?: string
  history: PaymentIssueHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export class PaymentSupportService {
  /**
   * List all payment support issues for a tenant
   */
  static async getIssues(
    tenantId: string,
    filters?: { status?: PaymentIssueStatus; priority?: PaymentIssuePriority; studentId?: string }
  ): Promise<PaymentIssueRecord[]> {
    const config = await db.schoolConfig.findUnique({
      where: { tenantId_domain: { tenantId, domain: 'FINANCE' } },
    })
    const data = (config?.data as Record<string, any>) || {}
    let issues: PaymentIssueRecord[] = Array.isArray(data.paymentIssues) ? data.paymentIssues : []

    if (filters?.status) {
      issues = issues.filter((i) => i.status === filters.status)
    }
    if (filters?.priority) {
      issues = issues.filter((i) => i.priority === filters.priority)
    }
    if (filters?.studentId) {
      issues = issues.filter((i) => i.studentId === filters.studentId)
    }

    return issues.reverse()
  }

  /**
   * Get an issue by its ID
   */
  static async getIssueById(tenantId: string, issueId: string): Promise<PaymentIssueRecord | null> {
    const issues = await this.getIssues(tenantId)
    return issues.find((i) => i.id === issueId) || null
  }

  /**
   * Create a new payment support issue (can be submitted by parent or created by staff)
   */
  static async createIssue(
    ctx: { tenantId: string; actorId: string; actorName?: string; actorRole?: string },
    input: {
      studentId: string
      parentUserId?: string
      paymentId?: string
      transactionRef?: string
      provider?: string
      providerPaymentId?: string
      amountCents: number
      reportedIssue: string
      priority?: PaymentIssuePriority
    }
  ): Promise<PaymentIssueRecord> {
    const student = await db.student.findUnique({
      where: { id: input.studentId },
      select: { firstName: true, lastName: true, admissionNo: true },
    })

    const issueNumber = Math.floor(1000 + Math.random() * 9000)
    const issueId = `ISS-2026-${issueNumber}`

    const record: PaymentIssueRecord = {
      id: issueId,
      tenantId: ctx.tenantId,
      studentId: input.studentId,
      studentName: student ? `${student.firstName} ${student.lastName || ''}`.trim() : undefined,
      admissionNo: student?.admissionNo,
      parentUserId: input.parentUserId || ctx.actorId,
      parentName: ctx.actorName || 'Parent / Guardian',
      paymentId: input.paymentId,
      transactionRef: input.transactionRef,
      provider: input.provider || 'RAZORPAY',
      providerPaymentId: input.providerPaymentId,
      amountCents: input.amountCents,
      reportedIssue: input.reportedIssue.trim(),
      status: 'OPEN',
      priority: input.priority || 'HIGH',
      history: [
        {
          action: 'ISSUE_CREATED',
          by: ctx.actorName || ctx.actorId,
          at: new Date().toISOString(),
          notes: 'Support case opened for unconfirmed payment',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const config = await db.schoolConfig.findUnique({
      where: { tenantId_domain: { tenantId: ctx.tenantId, domain: 'FINANCE' } },
    })
    const currentData = (config?.data as Record<string, any>) || {}
    const issues: PaymentIssueRecord[] = Array.isArray(currentData.paymentIssues) ? currentData.paymentIssues : []
    const updated = [...issues, record]
    const updatedData = {
      ...currentData,
      paymentIssues: updated,
    }

    await db.schoolConfig.upsert({
      where: { tenantId_domain: { tenantId: ctx.tenantId, domain: 'FINANCE' } },
      create: { tenantId: ctx.tenantId, domain: 'FINANCE', data: updatedData },
      update: { data: updatedData },
    })

    await recordAudit({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorName: ctx.actorName,
      actorRole: ctx.actorRole,
      action: 'PAYMENT_ISSUE_OPENED',
      entity: 'SchoolConfig',
      entityId: issueId,
      module: 'Fees',
      summary: `Opened payment support issue ${issueId} for student ${record.studentName || record.studentId} (₹${
        record.amountCents / 100
      })`,
    })

    return record
  }

  /**
   * Update an issue's status, assignment, or investigation notes
   */
  static async updateIssue(
    ctx: { tenantId: string; actorId: string; actorName?: string; actorRole?: string },
    issueId: string,
    input: {
      status?: PaymentIssueStatus
      priority?: PaymentIssuePriority
      assignedStaffId?: string
      assignedStaffName?: string
      resolutionNotes?: string
      internalNote?: string
    }
  ): Promise<PaymentIssueRecord> {
    const config = await db.schoolConfig.findUnique({
      where: { tenantId_domain: { tenantId: ctx.tenantId, domain: 'FINANCE' } },
    })
    if (!config) throw new Error('Payment issues store not found')

    const currentData = (config.data as Record<string, any>) || {}
    const issues: PaymentIssueRecord[] = Array.isArray(currentData.paymentIssues) ? currentData.paymentIssues : []
    const idx = issues.findIndex((i) => i.id === issueId)
    if (idx === -1) throw new Error('Payment issue not found')

    const existing = issues[idx]
    const history = [...existing.history]

    if (input.status && input.status !== existing.status) {
      history.push({
        action: `STATUS_CHANGED_TO_${input.status}`,
        by: ctx.actorName || ctx.actorId,
        at: new Date().toISOString(),
        notes: input.internalNote || input.resolutionNotes,
      })
    } else if (input.internalNote) {
      history.push({
        action: 'INVESTIGATION_NOTE_ADDED',
        by: ctx.actorName || ctx.actorId,
        at: new Date().toISOString(),
        notes: input.internalNote,
      })
    }

    const updatedIssue: PaymentIssueRecord = {
      ...existing,
      status: input.status || existing.status,
      priority: input.priority || existing.priority,
      assignedStaffId: input.assignedStaffId !== undefined ? input.assignedStaffId : existing.assignedStaffId,
      assignedStaffName: input.assignedStaffName !== undefined ? input.assignedStaffName : existing.assignedStaffName,
      resolutionNotes: input.resolutionNotes || existing.resolutionNotes,
      history,
      updatedAt: new Date().toISOString(),
    }

    issues[idx] = updatedIssue

    await db.schoolConfig.update({
      where: { tenantId_domain: { tenantId: ctx.tenantId, domain: 'FINANCE' } },
      data: { data: { ...currentData, paymentIssues: issues } },
    })

    return updatedIssue
  }
}
