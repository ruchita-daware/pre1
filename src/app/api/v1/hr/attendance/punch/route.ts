import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, requireBranchAccess } from '@/lib/auth-api'
import { AuditService } from '@/lib/audit/audit-service'
import { AttendanceCalculator } from '@/lib/hr/attendance-calculator'

/**
 * POST /api/v1/hr/attendance/punch
 * Hardware Facial Recognition / Biometric Attendance Kiosk Punch Gateway.
 * Validates branch binding, resolves canonical staff identity, deduplicates events,
 * and maintains strict cross-campus data isolation.
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req, 'hr:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json()
    const {
      staffProfileId,
      employeeCode,
      branchId,
      timestamp,
      deviceId,
      source = 'BIOMETRIC',
      notes,
    } = body

    if (!staffProfileId && !employeeCode) {
      return Errors.validation('Either staffProfileId or employeeCode is required for biometric resolution')
    }
    if (!branchId) {
      return Errors.validation('branchId is required to validate kiosk terminal location')
    }

    // 1. Validate caller's access to the kiosk branch
    const branchAccess = await requireBranchAccess(session, branchId)
    if (branchAccess) return branchAccess

    // 2. Resolve Canonical Staff Identity
    const staff = await db.staffProfile.findFirst({
      where: {
        tenantId: session.tenantId,
        ...(staffProfileId ? { id: staffProfileId } : { employeeCode }),
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    })
    if (!staff) {
      return Errors.notFound('Staff profile not found for provided biometric identity')
    }

    // 3. Strict Branch Guard: Staff must belong to the kiosk branch
    if (staff.branchId && staff.branchId !== branchId) {
      return Errors.forbidden(
        `Cross-branch punch rejected: Staff member ${staff.user.fullName} is assigned to ${staff.branch?.name || staff.branchId}, not this kiosk branch.`
      )
    }

    const punchTime = timestamp ? new Date(timestamp) : new Date()
    const punchDate = new Date(punchTime)
    punchDate.setHours(0, 0, 0, 0)

    // 4. Fetch existing attendance record for today
    const existing = await db.attendanceStaff.findUnique({
      where: {
        staffProfileId_date: {
          staffProfileId: staff.id,
          date: punchDate,
        },
      },
    })

    // 5. De-duplication: Prevent duplicate punches within 180 seconds (3 mins)
    if (existing) {
      const lastActionTime = existing.checkOut || existing.checkIn
      if (lastActionTime) {
        const diffMs = Math.abs(punchTime.getTime() - new Date(lastActionTime).getTime())
        if (diffMs < 180 * 1000) {
          return ok({
            success: true,
            deduplicated: true,
            event: existing.checkOut ? 'CHECK_OUT' : 'CHECK_IN',
            message: 'Duplicate punch ignored within 3-minute debounce window',
            record: existing,
          })
        }
      }
    }

    let event: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN'
    let checkIn = existing?.checkIn || null
    let checkOut = existing?.checkOut || null

    if (!existing || !existing.checkIn) {
      // First punch of the day: Check-In
      event = 'CHECK_IN'
      checkIn = punchTime
    } else {
      // Subsequent punch of the day: Check-Out
      event = 'CHECK_OUT'
      checkOut = punchTime
    }

    // 6. Calculate worked hours, lateness, and day status via canonical calculator
    const calculation = AttendanceCalculator.calculatePunch({
      checkIn,
      checkOut,
    }, punchTime)

    const finalStatus = existing?.status === 'ON_LEAVE'
      ? 'ON_LEAVE'
      : calculation.computedStatus === 'UNMARKED'
      ? 'PRESENT'
      : calculation.computedStatus

    const record = await db.$transaction(async (tx) => {
      const updated = await tx.attendanceStaff.upsert({
        where: {
          staffProfileId_date: {
            staffProfileId: staff.id,
            date: punchDate,
          },
        },
        create: {
          tenantId: session.tenantId!,
          branchId,
          staffProfileId: staff.id,
          date: punchDate,
          status: finalStatus,
          checkIn,
          checkOut,
          shiftHours: 8.0,
          workedHours: calculation.workedHours,
          lateMinutes: calculation.lateMinutes,
          source: source as any,
          notes: notes || (deviceId ? `Face kiosk punch: ${deviceId}` : 'Biometric face punch'),
          markedById: session.uid,
          markedByName: session.name,
        },
        update: {
          status: finalStatus,
          checkIn: checkIn || undefined,
          checkOut: checkOut || undefined,
          workedHours: calculation.workedHours,
          lateMinutes: calculation.lateMinutes,
          source: source as any,
          notes: notes || (deviceId ? `Face kiosk punch: ${deviceId}` : 'Biometric face punch'),
          markedById: session.uid,
          markedByName: session.name,
        },
      })

      await AuditService.record({
        tenantId: session.tenantId!,
        branchId,
        actorId: session.uid,
        actorName: session.name,
        actorRole: session.role,
        action: 'STAFF_ATTENDANCE_PUNCHED',
        entity: 'AttendanceStaff',
        entityId: updated.id,
        module: 'HR',
        summary: `Biometric ${event} for ${staff.user.fullName} (${staff.employeeCode}) at ${punchTime.toLocaleTimeString()}`,
        severity: 'INFO',
        newValues: {
          event,
          status: finalStatus,
          checkIn,
          checkOut,
          workedHours: calculation.workedHours,
          lateMinutes: calculation.lateMinutes,
          deviceId,
        },
      }, tx)

      return updated
    })

    return ok({
      success: true,
      event,
      record: {
        ...record,
        employeeName: staff.user.fullName,
        employeeCode: staff.employeeCode,
        isMissingCheckout: calculation.isMissingCheckout,
      },
    })
  } catch (e: any) {
    return Errors.validation(e.message || 'Failed to process biometric punch')
  }
}

export const POST = withApi(_POST)
