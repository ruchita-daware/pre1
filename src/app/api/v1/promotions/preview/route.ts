import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { PromotionService } from '@/lib/promotion/promotion-service'

/**
 * GET /api/v1/promotions/preview — Generates live candidate preview between two academic sessions
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'settings:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  const url = new URL(req.url)
  const sourceSessionId = url.searchParams.get('sourceSessionId')
  const targetSessionId = url.searchParams.get('targetSessionId')
  const branchId = url.searchParams.get('branchId') || undefined

  if (!sourceSessionId || !targetSessionId) {
    return Errors.validation('sourceSessionId and targetSessionId are required query parameters')
  }

  try {
    const preview = await PromotionService.generatePreview(
      session.tenantId,
      sourceSessionId,
      targetSessionId,
      branchId
    )
    return ok(preview)
  } catch (err: any) {
    return Errors.business('PREVIEW_FAILED', err.message || 'Failed to generate promotion preview', 422)
  }
}

export const GET = withApi(_GET)
