import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, requireBranchAccess } from '@/lib/auth-api'
import { PromotionService } from '@/lib/promotion/promotion-service'
import { db } from '@/lib/db'

/**
 * POST /api/v1/students/[id]/graduate — Transition terminal program student to GRADUATED
 */
async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApi(req, 'students:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  const { id } = await params

  try {
    const student = await db.student.findFirst({
      where: { id, tenantId: session.tenantId, deletedAt: null },
      select: { branchId: true },
    })
    if (!student) return Errors.notFound('Student')

    const branchCheck = await requireBranchAccess(session, student.branchId)
    if (branchCheck) return branchCheck

    const body = await req.json().catch(() => ({}))
    const { graduationDate, certificateNumber, remarks } = body

    const result = await PromotionService.graduateStudent(
      {
        id: session.uid,
        name: session.name,
        role: session.role,
        tenantId: session.tenantId,
      },
      id,
      {
        graduationDate,
        certificateNumber,
        remarks,
      }
    )

    return ok(result)
  } catch (err: any) {
    return Errors.business('GRADUATION_FAILED', err.message || 'Failed to graduate student', 422)
  }
}

export const POST = withApi(_POST)
