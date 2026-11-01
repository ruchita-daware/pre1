import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { PaymentMonitoringService } from '@/lib/fees/payment-monitoring-service'

/**
 * GET /api/v1/finance/monitoring/health
 * Returns comprehensive payment monitoring KPIs and system health metrics.
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const kpis = await PaymentMonitoringService.getMonitoringKPIs(session.tenantId)
    const health = await PaymentMonitoringService.getHealthMetrics(session.tenantId)

    return ok({
      kpis,
      health,
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
