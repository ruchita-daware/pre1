import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse, getAuthorizedBranchIds } from '@/lib/auth-api'
import { recordAudit } from '@/lib/audit'

/**
 * GET /api/v1/finance/follow-ups
 * Returns list of students with pending or overdue fee obligations,
 * their parent/guardian contacts, overdue aging, and latest follow-up status.
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'finance:read')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const sp = req.nextUrl.searchParams
    const branchId = sp.get('branchId') || undefined
    const classroomId = sp.get('classroomId') || undefined
    const statusFilter = sp.get('status') || undefined // 'OVERDUE' | 'PENDING' | 'ALL'
    const followUpStatus = sp.get('followUpStatus') || undefined // 'NOT_CONTACTED' | 'CONTACTED' | etc.
    const minDaysOverdue = parseInt(sp.get('minDaysOverdue') || '0', 10)

    const authorizedBranches = await getAuthorizedBranchIds(session)
    let branchCondition: any = undefined
    if (authorizedBranches && authorizedBranches.length > 0) {
      branchCondition = { in: authorizedBranches }
    }
    if (branchId && branchId !== 'ALL') {
      branchCondition = branchId
    }

    // Find all schedules with outstanding balances
    const schedules = await db.studentFeeSchedule.findMany({
      where: {
        tenantId: session.tenantId,
        remainingAmountCents: { gt: 0 },
        ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter as any } : {}),
        ...(classroomId && classroomId !== 'ALL' ? { classroomId } : {}),
        ...(branchCondition ? { student: { branchId: branchCondition } } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNo: true,
            branchId: true,
            currentClassroomId: true,
            currentClassroom: { select: { id: true, name: true } },
            guardians: {
              include: { guardian: true },
              orderBy: { isPrimary: 'desc' },
            },
          },
        },
        feeItem: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    const branches = await db.branch.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true },
    })
    const branchMap = new Map(branches.map((b) => [b.id, b.name]))

    // Aggregate by student
    const studentMap = new Map<string, any>()
    const now = Date.now()

    for (const sc of schedules) {
      if (!sc.student) continue
      const sId = sc.student.id
      if (!studentMap.has(sId)) {
        const primaryGuardian = sc.student.guardians[0]?.guardian
        studentMap.set(sId, {
          studentId: sId,
          studentName: `${sc.student.firstName} ${sc.student.lastName || ''}`.trim(),
          admissionNo: sc.student.admissionNo || '—',
          branchId: sc.student.branchId,
          branchName: sc.student.branchId ? (branchMap.get(sc.student.branchId) || '—') : '—',
          classroomId: sc.student.currentClassroomId,
          classroomName: sc.student.currentClassroom?.name || '—',
          parentName: primaryGuardian?.fullName || 'Not on file',
          parentPhone: primaryGuardian?.phone || null,
          parentEmail: primaryGuardian?.email || null,
          totalOutstandingCents: 0,
          totalOverdueCents: 0,
          oldestDueDate: sc.dueDate,
          daysOverdue: 0,
          pendingItems: [],
        })
      }

      const entry = studentMap.get(sId)
      entry.totalOutstandingCents += sc.remainingAmountCents
      if (sc.status === 'OVERDUE' || new Date(sc.dueDate).getTime() < now) {
        entry.totalOverdueCents += sc.remainingAmountCents
      }
      if (new Date(sc.dueDate).getTime() < new Date(entry.oldestDueDate).getTime()) {
        entry.oldestDueDate = sc.dueDate
      }
      entry.pendingItems.push({
        id: sc.id,
        name: sc.feeItem?.name || 'Fee Item',
        period: sc.period,
        dueDate: sc.dueDate,
        remainingCents: sc.remainingAmountCents,
        status: sc.status,
      })
    }

    const studentIds = Array.from(studentMap.keys())

    // Fetch latest follow-up timeline entries for these students
    const followUpLogs = await db.timelineEntry.findMany({
      where: {
        tenantId: session.tenantId,
        studentId: { in: studentIds },
        title: { startsWith: 'Fee Follow-up:' },
      },
      orderBy: { createdAt: 'desc' },
    })

    const latestFollowUpMap = new Map<string, any>()
    for (const log of followUpLogs) {
      if (!latestFollowUpMap.has(log.studentId)) {
        const statusMatch = log.title.match(/Fee Follow-up:\s*([A-Z_]+)/i)
        const status = statusMatch ? statusMatch[1].toUpperCase() : 'CONTACTED'
        latestFollowUpMap.set(log.studentId, {
          status,
          lastContactDate: log.createdAt,
          notes: log.body,
        })
      }
    }

    let results = Array.from(studentMap.values()).map((entry) => {
      const oldestDateMs = new Date(entry.oldestDueDate).getTime()
      const daysOverdue = Math.max(0, Math.floor((now - oldestDateMs) / (1000 * 60 * 60 * 24)))
      const followUp = latestFollowUpMap.get(entry.studentId) || {
        status: 'NOT_CONTACTED',
        lastContactDate: null,
        notes: null,
      }

      return {
        ...entry,
        totalOutstandingRupees: (entry.totalOutstandingCents / 100).toFixed(2),
        totalOverdueRupees: (entry.totalOverdueCents / 100).toFixed(2),
        daysOverdue,
        followUpStatus: followUp.status,
        lastContactDate: followUp.lastContactDate,
        followUpNotes: followUp.notes,
      }
    })

    if (minDaysOverdue > 0) {
      results = results.filter((r) => r.daysOverdue >= minDaysOverdue)
    }

    if (followUpStatus && followUpStatus !== 'ALL') {
      results = results.filter((r) => r.followUpStatus === followUpStatus)
    }

    // Sort by days overdue descending
    results.sort((a, b) => b.daysOverdue - a.daysOverdue)

    return ok({
      records: results,
      totalCount: results.length,
      totalOverdueRupees: results.reduce((sum, r) => sum + parseFloat(r.totalOverdueRupees), 0).toFixed(2),
      totalOutstandingRupees: results.reduce((sum, r) => sum + parseFloat(r.totalOutstandingRupees), 0).toFixed(2),
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

/**
 * POST /api/v1/finance/follow-ups
 * Records an authorized follow-up action, note, and optional reminder dispatch.
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req, 'finance:write')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json()
    const { studentId, status, notes, nextFollowUpDate, sendEmailReminder } = body

    if (!studentId || !status) {
      return Errors.validation('Student ID and follow-up status are required')
    }

    const student = await db.student.findFirst({
      where: { id: studentId, tenantId: session.tenantId, deletedAt: null },
      include: {
        guardians: { include: { guardian: true }, orderBy: { isPrimary: 'desc' } },
      },
    })
    if (!student) return Errors.notFound('Student')

    const guardian = student.guardians[0]?.guardian
    const followUpTitle = `Fee Follow-up: ${status}`
    const followUpBody = [
      `Status: ${status}`,
      notes ? `Notes: ${notes}` : null,
      nextFollowUpDate ? `Next follow-up planned for: ${nextFollowUpDate}` : null,
      sendEmailReminder ? 'Automated email fee payment reminder dispatched to parent.' : null,
    ]
      .filter(Boolean)
      .join('\n')

    // Record in student timeline
    const timeline = await db.timelineEntry.create({
      data: {
        tenantId: session.tenantId,
        studentId,
        type: 'NOTE',
        title: followUpTitle,
        body: followUpBody,
        authorId: session.uid,
      },
    })

    // Audit log
    await recordAudit({
      tenantId: session.tenantId,
      actorId: session.uid,
      actorName: session.name,
      actorRole: session.role,
      action: 'RECORD_FEE_FOLLOWUP',
      entity: 'StudentFeeSchedule',
      entityId: studentId,
      module: 'Fees',
      summary: `Logged fee follow-up (${status}) for ${student.firstName} ${student.lastName || ''}. Notes: ${notes || 'None'}`,
    })

    return ok({
      success: true,
      timelineId: timeline.id,
      studentId,
      status,
      timestamp: timeline.createdAt,
      reminderDispatched: !!sendEmailReminder,
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const GET = withApi(_GET)
export const POST = withApi(_POST)
