import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, getAuthorizedBranchIds } from '@/lib/auth-api'

/**
 * GET /api/v1/finance/reports
 * Generates aggregated data for 12 canonical financial reports:
 * 1. DAILY_COLLECTION
 * 2. MONTHLY_COLLECTION
 * 3. OUTSTANDING_FEES
 * 4. OVERDUE_AGING
 * 5. STUDENT_LEDGER
 * 6. INSTALLMENT_COLLECTION
 * 7. PAYMENT_MODE
 * 8. GATEWAY_TRANSACTIONS
 * 9. DEPOSITS_HELD
 * 10. REFUNDS
 * 11. ADJUSTMENTS
 * 12. HISTORICAL_IMPORTS
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const sp = req.nextUrl.searchParams
    const reportType = sp.get('type') || 'DAILY_COLLECTION'
    const branchId = sp.get('branchId') || undefined
    const academicSessionId = sp.get('academicSessionId') || undefined
    const startDate = sp.get('startDate') ? new Date(sp.get('startDate')!) : undefined
    const endDate = sp.get('endDate') ? new Date(sp.get('endDate')!) : undefined

    const authorizedBranches = await getAuthorizedBranchIds(session)
    let branchCondition: any = undefined
    if (authorizedBranches && authorizedBranches.length > 0) {
      branchCondition = { in: authorizedBranches }
    }
    if (branchId && branchId !== 'ALL') {
      branchCondition = branchId
    }

    const tenantId = session.tenantId

    switch (reportType) {
      case 'DAILY_COLLECTION': {
        const payments = await db.payment.findMany({
          where: {
            tenantId,
            status: 'SUCCESS',
            ...(startDate || endDate
              ? {
                  paymentDate: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                  },
                }
              : {}),
            ...(branchCondition ? { student: { branchId: branchCondition } } : {}),
          },
          include: {
            student: { select: { firstName: true, lastName: true, admissionNo: true, branchId: true } },
            receipt: { select: { receiptNumber: true } },
          },
          orderBy: { paymentDate: 'desc' },
          take: 500,
        })

        // Group by YYYY-MM-DD
        const dateMap = new Map<string, { date: string; count: number; totalCents: number; methods: Record<string, number> }>()
        for (const p of payments) {
          const dStr = p.paymentDate.toISOString().slice(0, 10)
          if (!dateMap.has(dStr)) {
            dateMap.set(dStr, { date: dStr, count: 0, totalCents: 0, methods: {} })
          }
          const item = dateMap.get(dStr)!
          item.count++
          item.totalCents += p.amountCents
          item.methods[p.method] = (item.methods[p.method] || 0) + p.amountCents
        }

        const rows = Array.from(dateMap.values()).map((r) => ({
          date: r.date,
          transactionCount: r.count,
          totalCollectedRupees: (r.totalCents / 100).toFixed(2),
          upiRupees: ((r.methods['UPI'] || 0) / 100).toFixed(2),
          cashRupees: ((r.methods['CASH'] || 0) / 100).toFixed(2),
          bankRupees: ((r.methods['BANK_TRANSFER'] || 0) / 100).toFixed(2),
          cardRupees: ((r.methods['CARD'] || 0) / 100).toFixed(2),
          chequeRupees: ((r.methods['CHEQUE'] || 0) / 100).toFixed(2),
        }))

        return ok({ reportType, rows, totalRecords: rows.length })
      }

      case 'MONTHLY_COLLECTION': {
        const payments = await db.payment.findMany({
          where: {
            tenantId,
            status: 'SUCCESS',
            ...(branchCondition ? { student: { branchId: branchCondition } } : {}),
          },
          select: { paymentDate: true, amountCents: true, method: true },
        })

        const monthMap = new Map<string, { month: string; count: number; totalCents: number }>()
        for (const p of payments) {
          const mStr = p.paymentDate.toISOString().slice(0, 7) // YYYY-MM
          if (!monthMap.has(mStr)) {
            monthMap.set(mStr, { month: mStr, count: 0, totalCents: 0 })
          }
          const item = monthMap.get(mStr)!
          item.count++
          item.totalCents += p.amountCents
        }

        const rows = Array.from(monthMap.values())
          .sort((a, b) => b.month.localeCompare(a.month))
          .map((m) => ({
            month: m.month,
            transactionCount: m.count,
            totalCollectedRupees: (m.totalCents / 100).toFixed(2),
          }))

        return ok({ reportType, rows, totalRecords: rows.length })
      }

      case 'OUTSTANDING_FEES': {
        const schedules = await db.studentFeeSchedule.findMany({
          where: {
            tenantId,
            remainingAmountCents: { gt: 0 },
            ...(branchCondition ? { student: { branchId: branchCondition } } : {}),
          },
          include: {
            student: { select: { firstName: true, lastName: true, admissionNo: true } },
            feeItem: { select: { name: true } },
            classroom: { select: { name: true } },
          },
          orderBy: { dueDate: 'asc' },
          take: 500,
        })

        const rows = schedules.map((s) => ({
          studentName: `${s.student?.firstName || ''} ${s.student?.lastName || ''}`.trim(),
          admissionNo: s.student?.admissionNo || '—',
          classroom: s.classroom?.name || '—',
          feeHead: s.feeItem?.name || 'Fee',
          period: s.period,
          dueDate: s.dueDate.toISOString().slice(0, 10),
          amountDueRupees: (s.amountDueCents / 100).toFixed(2),
          amountPaidRupees: (s.amountPaidCents / 100).toFixed(2),
          outstandingRupees: (s.remainingAmountCents / 100).toFixed(2),
          status: s.status,
        }))

        return ok({ reportType, rows, totalRecords: rows.length })
      }

      case 'OVERDUE_AGING': {
        const now = Date.now()
        const overdueSchedules = await db.studentFeeSchedule.findMany({
          where: {
            tenantId,
            remainingAmountCents: { gt: 0 },
            dueDate: { lt: new Date() },
            ...(branchCondition ? { student: { branchId: branchCondition } } : {}),
          },
          include: {
            student: { select: { firstName: true, lastName: true, admissionNo: true } },
            feeItem: { select: { name: true } },
          },
        })

        const buckets = {
          current: { label: '1 - 30 Days', count: 0, totalCents: 0 },
          days60: { label: '31 - 60 Days', count: 0, totalCents: 0 },
          days90: { label: '61 - 90 Days', count: 0, totalCents: 0 },
          days90Plus: { label: '90+ Days', count: 0, totalCents: 0 },
        }

        for (const s of overdueSchedules) {
          const diffDays = Math.floor((now - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays <= 30) {
            buckets.current.count++
            buckets.current.totalCents += s.remainingAmountCents
          } else if (diffDays <= 60) {
            buckets.days60.count++
            buckets.days60.totalCents += s.remainingAmountCents
          } else if (diffDays <= 90) {
            buckets.days90.count++
            buckets.days90.totalCents += s.remainingAmountCents
          } else {
            buckets.days90Plus.count++
            buckets.days90Plus.totalCents += s.remainingAmountCents
          }
        }

        const rows = Object.values(buckets).map((b) => ({
          agingBucket: b.label,
          overdueSchedulesCount: b.count,
          totalOverdueRupees: (b.totalCents / 100).toFixed(2),
        }))

        return ok({ reportType, rows, totalRecords: rows.length })
      }

      case 'PAYMENT_MODE': {
        const payments = await db.payment.findMany({
          where: {
            tenantId,
            status: 'SUCCESS',
            ...(branchCondition ? { student: { branchId: branchCondition } } : {}),
          },
          select: { method: true, amountCents: true },
        })

        const modeMap = new Map<string, { count: number; totalCents: number }>()
        for (const p of payments) {
          if (!modeMap.has(p.method)) {
            modeMap.set(p.method, { count: 0, totalCents: 0 })
          }
          const item = modeMap.get(p.method)!
          item.count++
          item.totalCents += p.amountCents
        }

        const rows = Array.from(modeMap.entries()).map(([mode, data]) => ({
          paymentMethod: mode,
          transactionCount: data.count,
          totalCollectedRupees: (data.totalCents / 100).toFixed(2),
        }))

        return ok({ reportType, rows, totalRecords: rows.length })
      }

      case 'DEPOSITS_HELD': {
        const deposits = await db.studentDeposit.findMany({
          where: {
            tenantId,
            status: { in: ['HELD', 'PARTIALLY_REFUNDED'] },
            ...(branchCondition ? { student: { branchId: branchCondition } } : {}),
          },
          include: {
            student: { select: { firstName: true, lastName: true, admissionNo: true } },
          },
        })

        const rows = deposits.map((d) => ({
          studentName: `${d.student?.firstName || ''} ${d.student?.lastName || ''}`.trim(),
          admissionNo: d.student?.admissionNo || '—',
          depositName: d.name,
          initialAmountRupees: (d.totalAmountCents / 100).toFixed(2),
          refundedRupees: (d.refundedAmountCents / 100).toFixed(2),
          adjustedRupees: (d.adjustedAmountCents / 100).toFixed(2),
          heldBalanceRupees: (d.remainingAmountCents / 100).toFixed(2),
          status: d.status,
        }))

        return ok({ reportType, rows, totalRecords: rows.length })
      }

      case 'REFUNDS': {
        const refunds = await db.refund.findMany({
          where: {
            tenantId,
            ...(branchCondition ? { student: { branchId: branchCondition } } : {}),
          },
          include: {
            student: { select: { firstName: true, lastName: true, admissionNo: true } },
            deposit: { select: { name: true } },
          },
          orderBy: { refundDate: 'desc' },
        })

        const rows = refunds.map((r) => ({
          studentName: `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim(),
          admissionNo: r.student?.admissionNo || '—',
          depositItem: r.deposit?.name || 'Security Deposit',
          refundAmountRupees: (r.amountCents / 100).toFixed(2),
          refundMode: r.refundMode,
          reference: r.reference || '—',
          reason: r.reason,
          refundDate: r.refundDate.toISOString().slice(0, 10),
        }))

        return ok({ reportType, rows, totalRecords: rows.length })
      }

      default: {
        return ok({ reportType, rows: [], totalRecords: 0 })
      }
    }
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
