import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, getAuthorizedBranchIds, requireBranchAccess } from '@/lib/auth-api'
import { AuditService } from '@/lib/audit/audit-service'
import { AttendanceCalculator } from '@/lib/hr/attendance-calculator'

async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'hr:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const sp = req.nextUrl.searchParams
    const dateStr = sp.get('date') || new Date().toISOString().split('T')[0]
    const requestedBranchId = sp.get('branchId') || undefined

    if (requestedBranchId) {
      const branchCheck = await requireBranchAccess(session, requestedBranchId)
      if (branchCheck) return branchCheck
    }

    const authorizedBranches = await getAuthorizedBranchIds(session)
    if (authorizedBranches !== null && authorizedBranches.length === 0) {
      return ok({ date: dateStr, records: [], summary: { total: 0, present: 0, late: 0, halfDay: 0, fullDay: 0, absent: 0, onLeave: 0, missingCheckout: 0 } })
    }

    const branchFilter = requestedBranchId
      ? { branchId: requestedBranchId }
      : authorizedBranches !== null
      ? { branchId: { in: authorizedBranches } }
      : {}

    const date = new Date(dateStr)

    // Fetch active staff within branch scope
    const staffList = await db.staffProfile.findMany({
      where: {
        tenantId: session.tenantId,
        ...branchFilter,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { employeeCode: 'asc' },
    })

    // Fetch punches for this day
    const punches = await db.attendanceStaff.findMany({
      where: {
        tenantId: session.tenantId,
        date,
      },
    })
    const punchMap = new Map(punches.map((p) => [p.staffProfileId, p]))
    const now = new Date()

    const records = staffList.map((s) => {
      const p = punchMap.get(s.id)
      const calculation = AttendanceCalculator.calculatePunch({
        checkIn: p?.checkIn || null,
        checkOut: p?.checkOut || null,
      }, now)

      return {
        staffProfileId: s.id,
        employeeCode: s.employeeCode,
        name: s.user.fullName,
        designation: s.designation,
        branchName: s.branch?.name || null,
        status: p?.status || 'UNMARKED',
        checkIn: p?.checkIn || null,
        checkOut: p?.checkOut || null,
        workedHours: p ? p.workedHours : 0,
        lateMinutes: p ? p.lateMinutes : 0,
        source: p?.source || 'MANUAL',
        notes: p?.notes || null,
        isMissingCheckout: p?.status !== 'ON_LEAVE' && p?.status !== 'ABSENT' && calculation.isMissingCheckout,
      }
    })

    const summary = AttendanceCalculator.aggregateRecords(records)

    return ok({ date: dateStr, records, summary })
  } catch (e) {
    return Errors.system(e)
  }
}

async function _POST(req: NextRequest) {
  const session = await requireApi(req, 'hr:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json()
    const { date, entries } = body as {
      date: string
      entries: Array<{
        staffProfileId: string
        status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF'
        checkIn?: string
        checkOut?: string
        notes?: string
      }>
    }

    if (!date || !Array.isArray(entries)) {
      return Errors.validation('date and entries[] are required')
    }

    const punchDate = new Date(date)

    await db.$transaction(async (tx) => {
      for (const e of entries) {
        const staff = await tx.staffProfile.findFirst({
          where: { id: e.staffProfileId, tenantId: session.tenantId! },
        })
        if (!staff) continue

        // Branch-level access verification for batch updates
        if (staff.branchId) {
          const branchCheck = await requireBranchAccess(session, staff.branchId)
          if (branchCheck) {
            throw new Error(`Unauthorized to record attendance for staff member in branch ${staff.branchId}`)
          }
        }

        // Canonical calculation of worked hours and lateness
        const calculation = AttendanceCalculator.calculatePunch({
          checkIn: e.checkIn,
          checkOut: e.checkOut,
        }, punchDate)

        const lateMinutes = e.status === 'LATE' ? (calculation.lateMinutes || 30) : calculation.lateMinutes

        await tx.attendanceStaff.upsert({
          where: {
            staffProfileId_date: {
              staffProfileId: e.staffProfileId,
              date: punchDate,
            },
          },
          create: {
            tenantId: session.tenantId!,
            branchId: staff.branchId || '',
            staffProfileId: e.staffProfileId,
            date: punchDate,
            status: e.status,
            checkIn: e.checkIn ? new Date(e.checkIn) : null,
            checkOut: e.checkOut ? new Date(e.checkOut) : null,
            shiftHours: 8,
            workedHours: calculation.workedHours,
            lateMinutes,
            source: 'MANUAL',
            notes: e.notes || null,
            markedById: session.uid,
            markedByName: session.name,
          },
          update: {
            status: e.status,
            checkIn: e.checkIn ? new Date(e.checkIn) : null,
            checkOut: e.checkOut ? new Date(e.checkOut) : null,
            workedHours: calculation.workedHours,
            lateMinutes,
            notes: e.notes || null,
            markedById: session.uid,
            markedByName: session.name,
          },
        })
      }

      await AuditService.record({
        tenantId: session.tenantId!,
        actorId: session.uid,
        actorName: session.name,
        actorRole: session.role,
        action: 'STAFF_ATTENDANCE_MARKED',
        entity: 'AttendanceStaff',
        module: 'HR',
        summary: `Marked staff attendance for ${entries.length} members on ${date}`,
        severity: 'INFO',
      }, tx)
    })

    return ok({ success: true, count: entries.length })
  } catch (e: any) {
    return Errors.validation(e.message || 'Failed to record staff attendance')
  }
}

/**
 * PATCH /api/v1/hr/attendance — Attendance Correction Workflow
 * Adjusts historical punch-in/out times or status with mandatory audit & branch isolation
 */
async function _PATCH(req: NextRequest) {
  const session = await requireApi(req, 'hr:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json()
    const { staffProfileId, date, status, checkIn, checkOut, reason } = body

    if (!staffProfileId || !date || !status) {
      return Errors.validation('staffProfileId, date, and status are required')
    }
    if (!reason || !reason.trim()) {
      return Errors.validation('Mandatory correction reason required for audit trail')
    }

    const punchDate = new Date(date)
    punchDate.setHours(0, 0, 0, 0)

    const staff = await db.staffProfile.findFirst({
      where: { id: staffProfileId, tenantId: session.tenantId, deletedAt: null },
      include: { user: true },
    })
    if (!staff) return Errors.notFound('Staff profile')

    // Branch isolation boundary check
    if (staff.branchId) {
      const branchCheck = await requireBranchAccess(session, staff.branchId)
      if (branchCheck) return branchCheck
    }

    const existingPunch = await db.attendanceStaff.findUnique({
      where: {
        staffProfileId_date: {
          staffProfileId,
          date: punchDate,
        },
      },
    })

    const calculation = AttendanceCalculator.calculatePunch({
      checkIn,
      checkOut,
    }, punchDate)

    const lateMinutes = status === 'LATE' ? (calculation.lateMinutes || 30) : calculation.lateMinutes
    const correctionNote = reason.trim().toLowerCase().startsWith('[correction]')
      ? reason.trim()
      : `[Correction] ${reason.trim()}`

    const updatedPunch = await db.$transaction(async (tx) => {
      const record = await tx.attendanceStaff.upsert({
        where: {
          staffProfileId_date: {
            staffProfileId,
            date: punchDate,
          },
        },
        create: {
          tenantId: session.tenantId!,
          branchId: staff.branchId || '',
          staffProfileId,
          date: punchDate,
          status,
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
          shiftHours: 8,
          workedHours: calculation.workedHours,
          lateMinutes,
          source: 'MANUAL',
          notes: correctionNote,
          markedById: session.uid,
          markedByName: session.name,
        },
        update: {
          status,
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
          workedHours: calculation.workedHours,
          lateMinutes,
          source: 'MANUAL',
          notes: correctionNote,
          markedById: session.uid,
          markedByName: session.name,
        },
      })

      await AuditService.record({
        tenantId: session.tenantId!,
        branchId: staff.branchId || null,
        actorId: session.uid,
        actorName: session.name,
        actorRole: session.role,
        action: 'STAFF_ATTENDANCE_CORRECTED',
        entity: 'AttendanceStaff',
        entityId: record.id,
        module: 'HR',
        summary: `Corrected attendance for ${staff.user.fullName} on ${date}: ${status} (${reason})`,
        severity: 'INFO',
        oldValues: existingPunch
          ? {
              status: existingPunch.status,
              checkIn: existingPunch.checkIn,
              checkOut: existingPunch.checkOut,
              workedHours: existingPunch.workedHours,
            }
          : null,
        newValues: {
          status,
          checkIn,
          checkOut,
          workedHours: calculation.workedHours,
          reason,
        },
      }, tx)

      return record
    })

    return ok(updatedPunch)
  } catch (e: any) {
    return Errors.validation(e.message || 'Failed to correct staff attendance')
  }
}

export const GET = withApi(_GET)
export const POST = withApi(_POST)
export const PATCH = withApi(_PATCH)
