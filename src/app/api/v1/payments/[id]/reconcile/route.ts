import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { PaymentRecoveryService } from '@/lib/fees/payment-recovery-service'

/**
 * POST /api/v1/payments/[id]/reconcile
 * Trigger single-payment authoritative provider query and ledger recovery.
 */
async function _POST(req: NextRequest, ctx: { params?: Promise<{ id: string }> | { id: string } }) {
  const session = await requireApi(req, 'finance:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
    const id = params?.id
    if (!id) return Errors.notFound('Payment ID required')

    const actorCtx = {
      tenantId: session.tenantId,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
    }

    const result = await PaymentRecoveryService.recoverTransaction(actorCtx, id, {
      trigger: 'ADMIN_ACTION',
    })

    return ok(result)
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const POST = withApi(_POST)
