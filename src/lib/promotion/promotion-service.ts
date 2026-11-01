import { db } from '@/lib/db'
import { audit } from '@/lib/sequence'
import { emit } from '@/lib/events'
import type { ProgramType } from '@prisma/client'
import {
  DEFAULT_PROMOTION_CONFIG,
  type ProgressionStep,
  type PromotionConfig,
  type CandidateEvaluation,
  type PromotionDecisionInput,
} from './types'

export * from './types'

export class PromotionService {
  /**
   * Retrieves the effective promotion configuration for a tenant with fallback to canonical defaults.
   */
  static async getEffectiveConfig(tenantId: string): Promise<PromotionConfig> {
    const configRow = await db.schoolConfig.findUnique({
      where: { tenantId_domain: { tenantId, domain: 'PROMOTION' } },
    })

    if (!configRow || !configRow.data || typeof configRow.data !== 'object') {
      return DEFAULT_PROMOTION_CONFIG
    }

    const d = configRow.data as Record<string, any>
    return {
      progressionLadder: Array.isArray(d.progressionLadder) && d.progressionLadder.length > 0
        ? d.progressionLadder
        : DEFAULT_PROMOTION_CONFIG.progressionLadder,
      cutOffMonth: typeof d.cutOffMonth === 'number' ? d.cutOffMonth : DEFAULT_PROMOTION_CONFIG.cutOffMonth,
      cutOffDay: typeof d.cutOffDay === 'number' ? d.cutOffDay : DEFAULT_PROMOTION_CONFIG.cutOffDay,
      requireTeacherSignOff: d.requireTeacherSignOff !== undefined ? Boolean(d.requireTeacherSignOff) : DEFAULT_PROMOTION_CONFIG.requireTeacherSignOff,
      capacityGuardStrategy: ['STRICT_REJECT', 'WAITLIST_IF_FULL', 'AUTO_SECTION_BALANCE'].includes(d.capacityGuardStrategy)
        ? d.capacityGuardStrategy
        : DEFAULT_PROMOTION_CONFIG.capacityGuardStrategy,
      financialPolicy: ['ROLLOVER_DUES', 'STRICT_HOLD', 'CONDITIONAL_PROMOTION'].includes(d.financialPolicy)
        ? d.financialPolicy
        : DEFAULT_PROMOTION_CONFIG.financialPolicy,
      allowsSameLevelContinuation: d.allowsSameLevelContinuation !== undefined
        ? Boolean(d.allowsSameLevelContinuation)
        : DEFAULT_PROMOTION_CONFIG.allowsSameLevelContinuation,
      progressionMappingNote: d.progressionMappingNote || DEFAULT_PROMOTION_CONFIG.progressionMappingNote,
    }
  }

  /**
   * Calculates a child's age in months and a human-readable "Xy Ym" string as of a given cut-off date.
   */
  static calculateAgeAtCutOff(dob: Date, targetCutOff: Date): { months: number; display: string } {
    let years = targetCutOff.getFullYear() - dob.getFullYear()
    let months = targetCutOff.getMonth() - dob.getMonth()
    if (targetCutOff.getDate() < dob.getDate()) {
      months -= 1
    }
    if (months < 0) {
      years -= 1
      months += 12
    }
    const totalMonths = Math.max(0, years * 12 + months)
    return {
      months: totalMonths,
      display: `${years}y ${months}m`,
    }
  }

  /**
   * Generates a live promotion candidate preview between a source and target academic session.
   */
  static async generatePreview(
    tenantId: string,
    sourceSessionId: string,
    targetSessionId: string,
    branchId?: string
  ) {
    const config = await this.getEffectiveConfig(tenantId)

    const [sourceSession, targetSession] = await Promise.all([
      db.academicSession.findFirst({ where: { id: sourceSessionId, tenantId } }),
      db.academicSession.findFirst({ where: { id: targetSessionId, tenantId } }),
    ])

    if (!sourceSession || !targetSession) {
      throw new Error('Invalid source or target academic session')
    }

    // Determine cut-off date based on target session start year and configured month/day
    const targetStartYear = targetSession.startDate.getFullYear()
    const cutOffDate = new Date(targetStartYear, config.cutOffMonth - 1, config.cutOffDay)

    // Fetch target classrooms with current enrolled counts
    const targetClassrooms = await db.classroom.findMany({
      where: {
        tenantId,
        academicSessionId: targetSession.id,
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        _count: {
          select: {
            students: { where: { status: 'ACTIVE', deletedAt: null } },
          },
        },
      },
    })

    // Fetch all active students in the source session
    const activeAllocations = await db.studentAllocation.findMany({
      where: {
        tenantId,
        academicSessionId: sourceSession.id,
        status: 'ACTIVE',
        student: {
          deletedAt: null,
          status: 'ACTIVE',
          ...(branchId ? { branchId } : {}),
        },
      },
      include: {
        student: {
          include: {
            invoices: {
              where: {
                deletedAt: null,
                status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
              },
              select: { balanceCents: true },
            },
            reportCards: {
              where: { academicSessionId: sourceSession.id },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        classroom: true,
      },
    })

    const candidates: CandidateEvaluation[] = []

    for (const alloc of activeAllocations) {
      const student = alloc.student
      const currentClassroom = alloc.classroom
      const ageInfo = this.calculateAgeAtCutOff(student.dob, cutOffDate)

      // Find standard next program in progression ladder
      const currentProgType = currentClassroom.programType
      const ladderStep = config.progressionLadder.find(
        (step) => step.from.toUpperCase() === currentProgType.toUpperCase()
      )

      const isTerminal = ladderStep?.isTerminal || ladderStep?.to === 'GRADUATED'
      const proposedProgram = ladderStep ? ladderStep.to : currentProgType

      // Find potential target classroom section
      const matchingTargetClass = isTerminal
        ? null
        : targetClassrooms.find((c) => c.programType === proposedProgram) || null

      // Age eligibility heuristic
      let ageEligibility: CandidateEvaluation['ageEligibility'] = 'AGE_ELIGIBLE'
      if (proposedProgram === 'NURSERY' && ageInfo.months < 36) {
        ageEligibility = 'AGE_BELOW_RECOMMENDED'
      } else if (proposedProgram === 'LKG' && ageInfo.months < 48) {
        ageEligibility = 'AGE_BELOW_RECOMMENDED'
      } else if (proposedProgram === 'UKG' && ageInfo.months < 60) {
        ageEligibility = 'AGE_BELOW_RECOMMENDED'
      }

      // Teacher sign-off from latest report card or default
      let teacherSignOff: CandidateEvaluation['teacherSignOff'] = 'PENDING_SIGN_OFF'
      if (student.reportCards.length > 0 && student.reportCards[0].remarks) {
        const rem = student.reportCards[0].remarks.toLowerCase()
        if (rem.includes('continue') || rem.includes('retain')) {
          teacherSignOff = 'RECOMMENDED_TO_CONTINUE'
        } else if (rem.includes('review') || rem.includes('special')) {
          teacherSignOff = 'REQUIRES_SPECIAL_REVIEW'
        } else {
          teacherSignOff = 'RECOMMENDED_FOR_PROMOTION'
        }
      } else {
        teacherSignOff = 'RECOMMENDED_FOR_PROMOTION'
      }

      // Compute suggested outcome
      let suggestedOutcome: CandidateEvaluation['suggestedOutcome'] = 'PROMOTED'
      if (isTerminal) {
        suggestedOutcome = 'GRADUATED'
      } else if (teacherSignOff === 'RECOMMENDED_TO_CONTINUE') {
        suggestedOutcome = 'CONTINUE_CURRENT_LEVEL'
      } else if (teacherSignOff === 'REQUIRES_SPECIAL_REVIEW' || ageEligibility === 'AGE_BELOW_RECOMMENDED') {
        suggestedOutcome = 'SPECIAL_REVIEW'
      }

      const outstandingDuesCents = student.invoices.reduce((sum, inv) => sum + inv.balanceCents, 0)

      candidates.push({
        studentId: student.id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName || ''}`.trim(),
        dob: student.dob.toISOString().split('T')[0],
        gender: student.gender,
        ageMonths: ageInfo.months,
        ageDisplay: ageInfo.display,
        currentClassroomId: currentClassroom.id,
        currentClassroomName: currentClassroom.name,
        currentProgramType: currentProgType,
        proposedProgramType: proposedProgram,
        proposedClassroomId: matchingTargetClass?.id || null,
        proposedClassroomName: matchingTargetClass?.name || null,
        proposedClassroomCapacity: matchingTargetClass?.capacity || null,
        proposedClassroomEnrolled: matchingTargetClass?._count.students || 0,
        ageEligibility,
        teacherSignOff,
        suggestedOutcome,
        outstandingDuesCents,
        hasOverdueBalance: outstandingDuesCents > 0,
        notes: isTerminal ? 'Eligible for Preschool Graduation' : `Standard progression to ${proposedProgram}`,
      })
    }

    const summary = {
      totalEligible: candidates.length,
      readyToPromote: candidates.filter((c) => c.suggestedOutcome === 'PROMOTED').length,
      continueCurrentLevel: candidates.filter((c) => c.suggestedOutcome === 'CONTINUE_CURRENT_LEVEL').length,
      graduating: candidates.filter((c) => c.suggestedOutcome === 'GRADUATED').length,
      specialReview: candidates.filter((c) => c.suggestedOutcome === 'SPECIAL_REVIEW').length,
    }

    return {
      sourceSession: { id: sourceSession.id, name: sourceSession.name },
      targetSession: { id: targetSession.id, name: targetSession.name },
      cutOffDate: cutOffDate.toISOString().split('T')[0],
      summary,
      candidates,
    }
  }

  /**
   * Executes atomic batch promotion transitions.
   */
  static async executeBatch(
    actor: { id: string; name: string; role: string; tenantId: string },
    input: {
      sourceSessionId: string
      targetSessionId: string
      decisions: PromotionDecisionInput[]
    }
  ) {
    const { tenantId } = actor
    const config = await this.getEffectiveConfig(tenantId)

    const [sourceSession, targetSession] = await Promise.all([
      db.academicSession.findFirst({ where: { id: input.sourceSessionId, tenantId } }),
      db.academicSession.findFirst({ where: { id: input.targetSessionId, tenantId } }),
    ])

    if (!sourceSession || !targetSession) {
      throw new Error('Source or target academic session not found')
    }

    const summary = {
      processedCount: input.decisions.length,
      promotedCount: 0,
      continuedCount: 0,
      graduatedCount: 0,
      waitlistedCount: 0,
      failedCount: 0,
      results: [] as { studentId: string; status: 'SUCCESS' | 'FAILED'; outcome: string; message?: string }[],
    }

    for (const d of input.decisions) {
      try {
        const student = await db.student.findFirst({
          where: { id: d.studentId, tenantId, deletedAt: null },
        })

        if (!student) {
          throw new Error('Student not found')
        }

        // Idempotency: skip if already active in target session
        const existingAllocation = await db.studentAllocation.findFirst({
          where: { studentId: student.id, academicSessionId: targetSession.id, status: 'ACTIVE' },
        })
        if (existingAllocation) {
          summary.results.push({
            studentId: student.id,
            status: 'SUCCESS',
            outcome: d.outcome,
            message: 'Already allocated in target academic session',
          })
          continue
        }

        if (d.outcome === 'GRADUATED') {
          await this.graduateStudent(actor, student.id, { remarks: d.notes || 'Graduated preschool program' })
          summary.graduatedCount++
          summary.results.push({ studentId: student.id, status: 'SUCCESS', outcome: 'GRADUATED' })
          continue
        }

        if (d.outcome === 'SPECIAL_REVIEW') {
          // Log timeline note, do not move allocation
          await db.timelineEntry.create({
            data: {
              tenantId,
              studentId: student.id,
              academicSessionId: sourceSession.id,
              type: 'NOTE',
              title: 'Academic Year Promotion: Special Review Flagged',
              body: d.notes || 'Placed under special developmental review before session transition.',
              authorId: actor.id,
            },
          })
          summary.results.push({ studentId: student.id, status: 'SUCCESS', outcome: 'SPECIAL_REVIEW' })
          continue
        }

        // Must have targetClassroomId for PROMOTED or CONTINUE_CURRENT_LEVEL
        if (!d.targetClassroomId) {
          throw new Error(`Target classroom section required for outcome ${d.outcome}`)
        }

        const targetClass = await db.classroom.findFirst({
          where: { id: d.targetClassroomId, tenantId, academicSessionId: targetSession.id, isActive: true },
        })

        if (!targetClass) {
          throw new Error('Target classroom section not found in new academic session')
        }

        const now = new Date()
        let isWaitlisted = false

        await db.$transaction(async (tx) => {
          // Guard capacity with FOR UPDATE lock
          await tx.$queryRaw`SELECT 1 FROM "classrooms" WHERE "id" = ${targetClass.id} AND "tenantId" = ${tenantId} FOR UPDATE`
          const currentCount = await tx.student.count({
            where: { currentClassroomId: targetClass.id, status: 'ACTIVE', deletedAt: null },
          })

          if (currentCount >= targetClass.capacity) {
            if (config.capacityGuardStrategy === 'STRICT_REJECT') {
              throw new Error(`Target section ${targetClass.name} is full (${currentCount}/${targetClass.capacity})`)
            } else {
              isWaitlisted = true
            }
          }

          // 1. Close old allocation
          await tx.studentAllocation.updateMany({
            where: { studentId: student.id, academicSessionId: sourceSession.id, status: 'ACTIVE' },
            data: {
              status: d.outcome === 'PROMOTED' ? 'PROMOTED' : 'COMPLETED',
              endedAt: now,
              reason: `${d.outcome === 'PROMOTED' ? 'Promoted' : 'Continued'} into ${targetSession.name}`,
            },
          })

          // 2. Create new allocation
          await tx.studentAllocation.create({
            data: {
              tenantId,
              studentId: student.id,
              academicSessionId: targetSession.id,
              classroomId: targetClass.id,
              programType: targetClass.programType,
              status: isWaitlisted ? 'WITHDRAWN' : 'ACTIVE', // waitlisted tracked or active
              startedAt: now,
              reason: `Transitioned into ${targetClass.name} from ${sourceSession.name}`,
              createdById: actor.id,
              createdByName: actor.name,
            },
          })

          // 3. Update Student current pointer if not waitlisted
          if (!isWaitlisted) {
            await tx.student.update({
              where: { id: student.id },
              data: {
                currentClassroomId: targetClass.id,
                status: 'ACTIVE',
              },
            })
          }

          // 4. Milestone
          await tx.timelineEntry.create({
            data: {
              tenantId,
              studentId: student.id,
              classroomId: targetClass.id,
              academicSessionId: targetSession.id,
              type: 'MILESTONE',
              title: `${d.outcome === 'PROMOTED' ? 'Promoted' : 'Enrolled'} for ${targetSession.name}`,
              body: isWaitlisted
                ? `Waitlisted for ${targetClass.name} due to section capacity.`
                : `Successfully allocated into ${targetClass.name} (${targetClass.programType}).`,
              authorId: actor.id,
            },
          })
        })

        if (isWaitlisted) {
          summary.waitlistedCount++
          summary.results.push({ studentId: student.id, status: 'SUCCESS', outcome: 'WAITLISTED' })
        } else if (d.outcome === 'PROMOTED') {
          summary.promotedCount++
          summary.results.push({ studentId: student.id, status: 'SUCCESS', outcome: 'PROMOTED' })
        } else {
          summary.continuedCount++
          summary.results.push({ studentId: student.id, status: 'SUCCESS', outcome: 'CONTINUE_CURRENT_LEVEL' })
        }

        await emit({
          type: 'StudentPromoted',
          tenantId,
          studentId: student.id,
          fromSessionId: sourceSession.id,
          toSessionId: targetSession.id,
          toClassroomId: targetClass.id,
        })
      } catch (err: any) {
        summary.failedCount++
        summary.results.push({
          studentId: d.studentId,
          status: 'FAILED',
          outcome: d.outcome,
          message: err.message || 'Failed to process promotion',
        })
      }
    }

    await audit({
      tenantId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'BATCH_PROMOTION_EXECUTED',
      entity: 'AcademicSession',
      entityId: targetSession.id,
      summary: `Batch transition ${sourceSession.name} → ${targetSession.name}: ${summary.promotedCount} promoted, ${summary.continuedCount} continued, ${summary.graduatedCount} graduated, ${summary.failedCount} failed`,
    })

    return summary
  }

  /**
   * Completes graduation for a student finishing terminal program (e.g. UKG).
   */
  static async graduateStudent(
    actor: { id: string; name: string; role: string; tenantId: string },
    studentId: string,
    input: { graduationDate?: string; certificateNumber?: string; remarks?: string }
  ) {
    const { tenantId } = actor
    const student = await db.student.findFirst({
      where: { id: studentId, tenantId, deletedAt: null },
      include: { currentClassroom: true },
    })

    if (!student) {
      throw new Error('Student not found')
    }

    const now = input.graduationDate ? new Date(input.graduationDate) : new Date()

    await db.$transaction(async (tx) => {
      // 1. Mark existing allocation as COMPLETED
      await tx.studentAllocation.updateMany({
        where: { studentId: student.id, status: 'ACTIVE' },
        data: {
          status: 'COMPLETED',
          endedAt: now,
          reason: input.remarks || 'Graduated preschool program',
        },
      })

      // 2. Set student status to GRADUATED and unlink active classroom
      await tx.student.update({
        where: { id: student.id },
        data: {
          status: 'GRADUATED',
          currentClassroomId: null,
        },
      })

      // 3. Timeline milestone
      await tx.timelineEntry.create({
        data: {
          tenantId,
          studentId: student.id,
          classroomId: student.currentClassroomId,
          type: 'MILESTONE',
          title: 'Preschool Graduation',
          body: input.remarks || `Graduated preschool. Certificate: ${input.certificateNumber || 'N/A'}.`,
          authorId: actor.id,
        },
      })
    })

    await audit({
      tenantId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'GRADUATE_STUDENT',
      entity: 'Student',
      entityId: student.id,
      summary: `Graduated student ${student.firstName} ${student.lastName || ''} (Admission: ${student.admissionNo})`,
    })

    return {
      studentId: student.id,
      status: 'GRADUATED',
      graduatedAt: now,
      certificateNumber: input.certificateNumber || null,
    }
  }
}
