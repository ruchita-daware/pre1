import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, requireBranchAccess, getAuthorizedBranchIds } from '@/lib/auth-api'
import { PayrollService } from '@/lib/hr/payroll-service'

async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'payroll:process')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const sp = req.nextUrl.searchParams
    const exportParam = sp.get('export')
    const cycleId = sp.get('cycleId')
    const requestedBranchId = sp.get('branchId') || undefined

    const authorizedBranches = await getAuthorizedBranchIds(session)

    if (exportParam === 'true' && cycleId) {
      const cycle = await db.payrollCycle.findFirst({
        where: { id: cycleId, tenantId: session.tenantId },
        select: { id: true, branchId: true },
      })
      if (!cycle) return Errors.notFound('Payroll cycle')
      if (cycle.branchId) {
        const branchCheck = await requireBranchAccess(session, cycle.branchId)
        if (branchCheck) return branchCheck
      }

      const csv = await PayrollService.generateBankPayoutFile(session.tenantId, cycleId)
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="bank-neft-payout-${cycleId}.csv"`,
        },
      })
    }

    if (requestedBranchId) {
      const branchCheck = await requireBranchAccess(session, requestedBranchId)
      if (branchCheck) return branchCheck
    }

    if (authorizedBranches !== null && authorizedBranches.length === 0) {
      return ok([])
    }

    const branchFilter = requestedBranchId
      ? { OR: [{ branchId: requestedBranchId }, { branchId: null }] }
      : authorizedBranches !== null
      ? { OR: [{ branchId: { in: authorizedBranches } }, { branchId: null }] }
      : {}

    const payslipFilter = authorizedBranches !== null
      ? { staffProfile: { branchId: { in: authorizedBranches }, deletedAt: null } }
      : {}

    const cycles = await db.payrollCycle.findMany({
      where: {
        tenantId: session.tenantId,
        ...branchFilter,
      },
      include: {
        branch: { select: { id: true, name: true } },
        payslips: {
          where: payslipFilter,
          include: {
            staffProfile: {
              include: { user: { select: { id: true, fullName: true, email: true } } },
            },
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return ok(cycles)
  } catch (e) {
    return Errors.system(e)
  }
}

async function _POST(req: NextRequest) {
  const session = await requireApi(req, 'payroll:process')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json()
    const { action = 'CALCULATE', month, year, cycleId, paymentReference } = body
    let targetBranchId = body.branchId

    const authorizedBranches = await getAuthorizedBranchIds(session)
    if (authorizedBranches !== null) {
      if (!targetBranchId) {
        targetBranchId = authorizedBranches[0]
      }
      const branchCheck = await requireBranchAccess(session, targetBranchId)
      if (branchCheck) return branchCheck
    } else if (targetBranchId) {
      const branchCheck = await requireBranchAccess(session, targetBranchId)
      if (branchCheck) return branchCheck
    }

    if (cycleId) {
      const cycle = await db.payrollCycle.findFirst({
        where: { id: cycleId, tenantId: session.tenantId },
        select: { branchId: true },
      })
      if (!cycle) return Errors.notFound('Payroll cycle')
      if (cycle.branchId) {
        const branchCheck = await requireBranchAccess(session, cycle.branchId)
        if (branchCheck) return branchCheck
      }
    }

    if (action === 'EXPORT_BANK_FILE') {
      if (!cycleId) return Errors.validation('cycleId is required for bank export')
      const csv = await PayrollService.generateBankPayoutFile(session.tenantId, cycleId)
      return ok({
        fileContent: csv,
        fileName: `neft-payout-${cycleId}.csv`,
      })
    }

    if (action === 'DISBURSE') {
      if (!cycleId) return Errors.validation('cycleId is required for disbursement')
      const cycle = await PayrollService.disbursePayroll(
        session.tenantId,
        cycleId,
        paymentReference || `NEFT-${Date.now()}`,
        {
          id: session.uid,
          name: session.name,
          role: session.role,
        }
      )
      return ok(cycle)
    }

    if (!month || !year) return Errors.validation('month and year are required')

    const cycle = await PayrollService.processPayroll(
      session.tenantId,
      Number(month),
      Number(year),
      targetBranchId || null,
      {
        id: session.uid,
        name: session.name,
        role: session.role,
      }
    )

    return ok(cycle)
  } catch (e: any) {
    return Errors.validation(e.message || 'Failed to process payroll')
  }
}

export const GET = withApi(_GET)
export const POST = withApi(_POST)
