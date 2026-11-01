import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { PromotionService, type PromotionDecisionInput } from '@/lib/promotion/promotion-service'

/**
 * POST /api/v1/promotions/batch — Executes atomic batch promotion transitions
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req, 'settings:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  const body = await req.json()
  const { sourceSessionId, targetSessionId, decisions } = body as {
    sourceSessionId: string
    targetSessionId: string
    decisions: PromotionDecisionInput[]
  }

  if (!sourceSessionId || !targetSessionId || !Array.isArray(decisions) || decisions.length === 0) {
    return Errors.validation('sourceSessionId, targetSessionId, and decisions[] are required')
  }

  try {
    const result = await PromotionService.executeBatch(
      {
        id: session.uid,
        name: session.name,
        role: session.role,
        tenantId: session.tenantId,
      },
      {
        sourceSessionId,
        targetSessionId,
        decisions,
      }
    )

    return ok(result)
  } catch (err: any) {
    return Errors.business('BATCH_PROMOTION_FAILED', err.message || 'Failed to execute batch promotion', 422)
  }
}

export const POST = withApi(_POST)
