import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { parsePaymentMetadata } from '@/lib/fees/payment-status-types'

/**
 * GET /api/v1/finance/payments/provider-mismatches
 * Lists all transactions with verified financial mismatches (Amount, Currency, or Order Reference).
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const payments = await db.payment.findMany({
      where: { tenantId: session.tenantId },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const mismatches = payments
      .map((p) => {
        const meta = parsePaymentMetadata(p)
        if (meta.reconciliationStatus !== 'MISMATCH') return null

        return {
          id: p.id,
          paymentNumber: p.paymentNumber,
          transactionRef: p.transactionRef,
          amountCents: p.amountCents,
          amountRupees: (p.amountCents / 100).toFixed(2),
          studentName: p.student ? `${p.student.firstName} ${p.student.lastName || ''}`.trim() : 'N/A',
          admissionNo: p.student?.admissionNo,
          invoiceNumber: p.invoice?.invoiceNumber,
          provider: meta.provider,
          providerStatus: meta.providerStatus,
          internalPaymentStatus: meta.internalPaymentStatus,
          reconciliationStatus: meta.reconciliationStatus,
          discrepancyDetails: meta.discrepancyDetails || [],
          failureReason: meta.failureReason,
          createdAt: p.createdAt,
        }
      })
      .filter(Boolean)

    return ok({
      totalMismatches: mismatches.length,
      mismatches,
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
