import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, requireBranchAccess } from '@/lib/auth-api'
import { db } from '@/lib/db'
import { StaffService } from '@/lib/hr/staff-service'

async function _GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, 'hr:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const { id } = await params
    const profile = await StaffService.getStaff360(session.tenantId, id)
    if (!profile) return Errors.notFound('Staff profile')

    // Branch isolation boundary check
    if (profile.branchId) {
      const branchCheck = await requireBranchAccess(session, profile.branchId)
      if (branchCheck) return branchCheck
    }

    const isPrivileged =
      ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(session.role) ||
      (session.roles && session.roles.some((r: string) => ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN'].includes(r)))

    // Field-level data protection: Mask sensitive KYC identifiers for non-owner roles
    if (!isPrivileged) {
      if (profile.panNumber && profile.panNumber.length >= 4) {
        profile.panNumber = `••••••${profile.panNumber.slice(-4)}`
      }
      if (profile.aadhaarNumber && profile.aadhaarNumber.length >= 4) {
        profile.aadhaarNumber = `••••••••${profile.aadhaarNumber.slice(-4)}`
      }
      if (profile.uanNumber) profile.uanNumber = '••••••••••••'
      if (profile.esiNumber) profile.esiNumber = '••••••••••••'
    }

    return ok(profile)
  } catch (e) {
    return Errors.system(e)
  }
}

async function _PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApi(req, 'hr:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const { id } = await params
    const body = await req.json()
    const { branchId, designation, department, ...rest } = body

    // 1. Target Staff & Branch Boundary Verification
    const target = await db.staffProfile.findFirst({
      where: { id, tenantId: session.tenantId, deletedAt: null },
      select: { id: true, branchId: true },
    })
    if (!target) return Errors.notFound('Staff profile')

    if (target.branchId) {
      const branchCheck = await requireBranchAccess(session, target.branchId)
      if (branchCheck) return branchCheck
    }

    const isPrivileged =
      ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(session.role) ||
      (session.roles && session.roles.some((r: string) => ['OWNER', 'DIRECTOR', 'PLATFORM_ADMIN'].includes(r)))

    // 2. Field-Level Permission Enforcement
    if (!isPrivileged) {
      if (rest.salary) {
        return Errors.forbidden('Only School Owner or authorized HR Admin can modify salary structure')
      }
      if (rest.panNumber || rest.aadhaarNumber || rest.uanNumber || rest.esiNumber || rest.bankDetails) {
        return Errors.forbidden('Only School Owner or authorized HR Admin can modify statutory KYC or bank details')
      }
      if (branchId && branchId !== target.branchId) {
        return Errors.forbidden('Only School Owner can transfer staff between campus branches')
      }
    }

    const actor = {
      id: session.uid,
      name: session.name,
      role: session.role,
      branchId: session.branchId,
    }

    let result
    // If only branchId was provided without any other fields, treat as direct branch transfer
    if (branchId && designation === undefined && department === undefined && Object.keys(rest).length === 0) {
      result = await StaffService.transferBranch(session.tenantId, id, branchId, actor)
    } else if (Object.keys(body).length > 0) {
      // Full or partial profile update
      result = await StaffService.updateStaffProfile(
        session.tenantId,
        id,
        { branchId, designation, department, ...rest },
        actor
      )
    } else {
      return Errors.validation('No valid update fields provided')
    }

    return ok(result)
  } catch (e: any) {
    return Errors.validation(e.message || 'Failed to update staff profile')
  }
}

export const GET = withApi(_GET)
export const PATCH = withApi(_PATCH)
