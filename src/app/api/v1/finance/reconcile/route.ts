import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { recordAudit } from '@/lib/audit'
import { PaymentRecoveryService } from '@/lib/fees/payment-recovery-service'

/**
 * GET /api/v1/finance/reconcile
 * Returns summary and list of all pending / verification-pending payment transactions eligible for reconciliation.
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const pendingPayments = await db.payment.findMany({
      where: {
        tenantId: session.tenantId,
        status: 'PENDING',
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return ok({
      totalPending: pendingPayments.length,
      payments: pendingPayments.map((p) => {
        let parsedNotes: any = {}
        try {
          parsedNotes = p.notes ? JSON.parse(p.notes) : {}
        } catch {
          parsedNotes = {}
        }
        return {
          id: p.id,
          paymentNumber: p.paymentNumber,
          transactionRef: p.transactionRef,
          amountCents: p.amountCents,
          amountRupees: (p.amountCents / 100).toFixed(2),
          status: p.status,
          detailedStatus: parsedNotes.detailedStatus || p.status,
          createdAt: p.createdAt,
          studentName: p.student ? `${p.student.firstName} ${p.student.lastName || ''}`.trim() : 'N/A',
          admissionNo: p.student?.admissionNo,
          invoiceNumber: p.invoice?.invoiceNumber,
          provider: parsedNotes.provider || 'UNKNOWN',
          orderId: parsedNotes.gatewayOrderId || null,
          timeline: parsedNotes.timeline || [],
        }
      }),
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

/**
 * POST /api/v1/finance/reconcile
 * Executes authoritative transaction status check and ledger reconciliation using PaymentRecoveryService.
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req, 'finance:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json().catch(() => ({}))
    const { paymentId, thresholdMinutes = 5 } = body

    const cutoffDate = new Date(Date.now() - thresholdMinutes * 60 * 1000)

    const whereClause: any = {
      tenantId: session.tenantId,
      status: 'PENDING',
      ...(paymentId ? { id: paymentId } : { createdAt: { lte: cutoffDate } }),
    }

    const pendingPayments = await db.payment.findMany({
      where: whereClause,
      include: {
        invoice: true,
      },
    })

    const reconciledResults = []
    const actorCtx = {
      tenantId: session.tenantId,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    }

    for (const p of pendingPayments) {
      try {
        const recoveryOutcome = await PaymentRecoveryService.recoverTransaction(actorCtx, p.id)
        reconciledResults.push({
          paymentId: p.id,
          paymentNumber: p.paymentNumber,
          outcome: recoveryOutcome.action,
          detailedStatus: recoveryOutcome.detailedStatus,
          newStatus: recoveryOutcome.detailedStatus === 'SUCCESS' ? 'SUCCESS' : recoveryOutcome.detailedStatus === 'FAILED' ? 'FAILED' : 'PENDING',
          receiptNumber: recoveryOutcome.receipt?.receiptNumber || null,
          message: (recoveryOutcome as any).message || (recoveryOutcome as any).error || 'Processed',
        })
      } catch (recoveryErr: any) {
        reconciledResults.push({
          paymentId: p.id,
          paymentNumber: p.paymentNumber,
          outcome: 'ERROR',
          newStatus: 'PENDING',
          receiptNumber: null,
          error: recoveryErr.message,
        })
      }
    }

    await recordAudit({
      tenantId: session.tenantId,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
      action: 'RECONCILED_TRANSACTIONS',
      entity: 'Payment',
      entityId: session.tenantId,
      module: 'Fees',
      summary: `Authoritatively checked & reconciled ${reconciledResults.length} pending transaction(s)`,
    })

    return ok({
      processedCount: reconciledResults.length,
      results: reconciledResults,
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
export const POST = withApi(_POST)
