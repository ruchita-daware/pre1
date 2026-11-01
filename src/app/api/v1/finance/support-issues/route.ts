import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { PaymentSupportService } from '@/lib/fees/payment-support-service'

/**
 * GET /api/v1/finance/support-issues
 * Retrieve payment support issues with optional status/priority filtering.
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') as any
    const priority = url.searchParams.get('priority') as any
    const studentId = url.searchParams.get('studentId') || undefined

    const issues = await PaymentSupportService.getIssues(session.tenantId, {
      status,
      priority,
      studentId,
    })

    return ok({ issues, total: issues.length })
  } catch (e: any) {
    return Errors.system(e)
  }
}

/**
 * POST /api/v1/finance/support-issues
 * Create or update a payment support issue.
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req, 'finance:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json().catch(() => ({}))
    const { action = 'CREATE', issueId } = body

    const actorCtx = {
      tenantId: session.tenantId,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    }

    if (action === 'CREATE') {
      const { studentId, paymentId, transactionRef, provider, amountCents, reportedIssue, priority } = body
      if (!studentId || !amountCents || !reportedIssue) {
        return Errors.validation('studentId, amountCents, and reportedIssue are required to log an issue')
      }

      const issue = await PaymentSupportService.createIssue(actorCtx, {
        studentId,
        paymentId,
        transactionRef,
        provider,
        amountCents,
        reportedIssue,
        priority,
      })

      return ok({ success: true, issue })
    }

    if (action === 'UPDATE') {
      if (!issueId) return Errors.validation('issueId is required for update')
      const { status, priority, assignedStaffId, assignedStaffName, resolutionNotes, internalNote } = body

      const updated = await PaymentSupportService.updateIssue(actorCtx, issueId, {
        status,
        priority,
        assignedStaffId,
        assignedStaffName,
        resolutionNotes,
        internalNote,
      })

      return ok({ success: true, issue: updated })
    }

    return Errors.validation(`Unsupported action: ${action}`)
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
export const POST = withApi(_POST)
