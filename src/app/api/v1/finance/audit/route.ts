import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'

/**
 * GET /api/v1/finance/audit
 * Returns immutable financial audit history for the tenant.
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const sp = req.nextUrl.searchParams
    const entityType = sp.get('entity') || undefined
    const action = sp.get('action') || undefined
    const limit = Math.min(200, Math.max(10, parseInt(sp.get('limit') || '50', 10)))

    const auditLogs = await db.auditLog.findMany({
      where: {
        tenantId: session.tenantId,
        OR: [
          { module: 'Fees' },
          { entity: { in: ['Payment', 'Invoice', 'Receipt', 'Refund', 'StudentDeposit', 'FeeStructure', 'FeePlan'] } },
        ],
        ...(entityType ? { entity: entityType } : {}),
        ...(action ? { action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return ok({
      records: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        actorId: log.actorId,
        actorName: log.actorName || 'System',
        actorRole: log.actorRole || 'SYSTEM',
        summary: log.summary,
        newValues: log.newValues,
        oldValues: log.oldValues,
        timestamp: log.createdAt,
      })),
      total: auditLogs.length,
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
