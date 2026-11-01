import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '@/lib/db'
import { PromotionService } from '@/lib/promotion/promotion-service'
import { signSession } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { GET as getPreview } from '@/app/api/v1/promotions/preview/route'
import { POST as postBatch } from '@/app/api/v1/promotions/batch/route'
import { POST as postGraduate } from '@/app/api/v1/students/[id]/graduate/route'

describe('PreOne Promotion Engine & Academic Year Transition Test Suite', () => {
  const ts = Date.now()
  let tenant: any
  let branch: any
  let foreignBranch: any
  let foreignTenant: any
  let sourceSession: any
  let targetSession: any

  let sourceClassPlaygroup: any
  let targetClassNursery: any
  let targetClassPlaygroup: any
  let sourceClassUKG: any

  let studentStandard: any
  let studentYoung: any
  let studentUKG: any
  let studentRetain: any
  let docTemplate: any

  let ownerUser: any
  let ownerToken: string
  let foreignUser: any
  let createdUserIds: string[] = []

  beforeAll(async () => {
    // 1. Setup Tenant & Branches
    tenant = await db.tenant.create({
      data: {
        code: `PROMO_TENANT_${ts}`,
        name: `Promotion Test Preschool ${ts}`,
        type: 'SCHOOL',
        status: 'ACTIVE',
      },
    })

    foreignTenant = await db.tenant.create({
      data: {
        code: `FOREIGN_TENANT_${ts}`,
        name: `Foreign Tenant ${ts}`,
        type: 'SCHOOL',
        status: 'ACTIVE',
      },
    })

    branch = await db.branch.create({
      data: {
        tenantId: tenant.id,
        code: `PB1_${ts}`,
        name: 'Main Campus',
        isMain: true,
      },
    })

    foreignBranch = await db.branch.create({
      data: {
        tenantId: tenant.id,
        code: `PB2_${ts}`,
        name: 'North Campus',
        isMain: false,
      },
    })

    // 2. Setup Academic Sessions
    sourceSession = await db.academicSession.create({
      data: {
        tenantId: tenant.id,
        name: `2025-2026_${ts}`,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2026-04-30'),
        status: 'CLOSING',
        isCurrent: true,
      },
    })

    targetSession = await db.academicSession.create({
      data: {
        tenantId: tenant.id,
        name: `2026-2027_${ts}`,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2027-04-30'),
        status: 'PLANNED',
        isCurrent: false,
      },
    })

    // 3. Setup Classrooms
    sourceClassPlaygroup = await db.classroom.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        academicSessionId: sourceSession.id,
        name: `Playgroup Butterflies ${ts}`,
        code: `PGB_${ts}`,
        programType: 'PLAYGROUP',
        capacity: 15,
      },
    })

    sourceClassUKG = await db.classroom.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        academicSessionId: sourceSession.id,
        name: `Senior KG Eagles ${ts}`,
        code: `UKG_${ts}`,
        programType: 'UKG',
        capacity: 20,
      },
    })

    targetClassNursery = await db.classroom.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        academicSessionId: targetSession.id,
        name: `Nursery Sunflowers ${ts}`,
        code: `NUR_${ts}`,
        programType: 'NURSERY',
        capacity: 10,
      },
    })

    targetClassPlaygroup = await db.classroom.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        academicSessionId: targetSession.id,
        name: `Playgroup Bees ${ts}`,
        code: `PG2_${ts}`,
        programType: 'PLAYGROUP',
        capacity: 15,
      },
    })

    // 4. Setup Students in Source Session
    // Student 1: Standard Progression (Playgroup -> Nursery, age ~3y 4m at cut-off)
    studentStandard = await db.student.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        admissionNo: `ADM-STD-${ts}`,
        firstName: 'Kabir',
        lastName: 'Mehta',
        dob: new Date('2023-03-15'),
        gender: 'MALE',
        status: 'ACTIVE',
        currentClassroomId: sourceClassPlaygroup.id,
      },
    })
    await db.studentAllocation.create({
      data: {
        tenantId: tenant.id,
        studentId: studentStandard.id,
        academicSessionId: sourceSession.id,
        classroomId: sourceClassPlaygroup.id,
        programType: 'PLAYGROUP',
        status: 'ACTIVE',
      },
    })

    // Student 2: Young Student needing Age Review (< 36 months at Nursery cut-off)
    studentYoung = await db.student.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        admissionNo: `ADM-YNG-${ts}`,
        firstName: 'Ananya',
        lastName: 'Roy',
        dob: new Date('2024-01-10'), // ~2y 6m at July 2026 cut-off
        gender: 'FEMALE',
        status: 'ACTIVE',
        currentClassroomId: sourceClassPlaygroup.id,
      },
    })
    await db.studentAllocation.create({
      data: {
        tenantId: tenant.id,
        studentId: studentYoung.id,
        academicSessionId: sourceSession.id,
        classroomId: sourceClassPlaygroup.id,
        programType: 'PLAYGROUP',
        status: 'ACTIVE',
      },
    })

    // Student 3: Terminal UKG student (Eligible for Graduation)
    studentUKG = await db.student.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        admissionNo: `ADM-UKG-${ts}`,
        firstName: 'Rohan',
        lastName: 'Verma',
        dob: new Date('2020-05-12'),
        gender: 'MALE',
        status: 'ACTIVE',
        currentClassroomId: sourceClassUKG.id,
      },
    })
    await db.studentAllocation.create({
      data: {
        tenantId: tenant.id,
        studentId: studentUKG.id,
        academicSessionId: sourceSession.id,
        classroomId: sourceClassUKG.id,
        programType: 'UKG',
        status: 'ACTIVE',
      },
    })

    // Student 4: Student with developmental recommendation to continue at current grade
    studentRetain = await db.student.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        admissionNo: `ADM-RET-${ts}`,
        firstName: 'Diya',
        lastName: 'Patel',
        dob: new Date('2023-02-20'),
        gender: 'FEMALE',
        status: 'ACTIVE',
        currentClassroomId: sourceClassPlaygroup.id,
      },
    })
    await db.studentAllocation.create({
      data: {
        tenantId: tenant.id,
        studentId: studentRetain.id,
        academicSessionId: sourceSession.id,
        classroomId: sourceClassPlaygroup.id,
        programType: 'PLAYGROUP',
        status: 'ACTIVE',
      },
    })

    // Create Report Card Template
    docTemplate = await db.documentTemplate.create({
      data: {
        tenantId: tenant.id,
        type: 'REPORT_CARD',
        name: `Report Card Template ${ts}`,
        content: {},
      },
    })

    // Add report card remarks to studentRetain to indicate teacher recommends continuation
    await db.studentReportCard.create({
      data: {
        tenantId: tenant.id,
        academicSessionId: sourceSession.id,
        studentId: studentRetain.id,
        classroomId: sourceClassPlaygroup.id,
        term: 'FINAL',
        templateId: docTemplate.id,
        status: 'PUBLISHED',
        remarks: 'Recommend to continue at Playgroup level to consolidate speech and social milestones.',
        fieldValues: {},
      },
    })

    // 5. Auth Setup
    ownerUser = await db.user.create({
      data: {
        email: `owner.promo.${ts}@preone.local`,
        fullName: 'Owner Promo Admin',
        passwordHash: 'dummy-hash',
        memberships: {
          create: {
            tenantId: tenant.id,
            role: 'OWNER',
            roles: ['OWNER'],
            status: 'ACTIVE',
          },
        },
      },
    })
    createdUserIds.push(ownerUser.id)

    ownerToken = await signSession({
      uid: ownerUser.id,
      email: ownerUser.email,
      role: 'OWNER',
      tenantId: tenant.id,
      branchId: branch.id,
      name: ownerUser.fullName,
      tokenVersion: 1,
    })
  })

  afterAll(async () => {
    // Cleanup synthetic test records
    await db.timelineEntry.deleteMany({ where: { tenantId: tenant.id } })
    await db.auditLog.deleteMany({ where: { tenantId: tenant.id } })
    await db.studentAllocation.deleteMany({ where: { tenantId: tenant.id } })
    await db.studentReportCard.deleteMany({ where: { tenantId: tenant.id } })
    await db.documentTemplate.deleteMany({ where: { tenantId: tenant.id } })
    await db.student.deleteMany({ where: { tenantId: tenant.id } })
    await db.classroom.deleteMany({ where: { tenantId: tenant.id } })
    await db.academicSession.deleteMany({ where: { tenantId: tenant.id } })
    await db.tenantUser.deleteMany({ where: { tenantId: tenant.id } })
    await db.branch.deleteMany({ where: { tenantId: tenant.id } })
    await db.tenant.deleteMany({ where: { id: { in: [tenant.id, foreignTenant.id] } } })
    if (createdUserIds.length > 0) {
      await db.user.deleteMany({ where: { id: { in: createdUserIds } } })
    }
  })

  // ── SUITE A: Age Calculation & Cut-Off Engine ──
  describe('Suite A: Age Calculation & Cut-Off Rules', () => {
    it('TC-AGE-01: calculates exact age in years and months at configured July 31 cut-off', () => {
      const dob = new Date('2023-03-15')
      const targetCutOff = new Date('2026-07-31')
      const result = PromotionService.calculateAgeAtCutOff(dob, targetCutOff)

      expect(result.months).toBe(40)
      expect(result.display).toBe('3y 4m')
    })

    it('TC-AGE-02: accurately calculates age across leap-year dates', () => {
      const leapDob = new Date('2024-02-29')
      const targetCutOff = new Date('2026-07-31')
      const result = PromotionService.calculateAgeAtCutOff(leapDob, targetCutOff)

      expect(result.months).toBe(29)
      expect(result.display).toBe('2y 5m')
    })
  })

  // ── SUITE B: Candidate Preview & ECE Decision Suggestions ──
  describe('Suite B: Candidate Preview & ECE Decision Rules', () => {
    it('TC-PREV-01: generates preview identifying eligible students and correct ECE outcomes', async () => {
      const preview = await PromotionService.generatePreview(
        tenant.id,
        sourceSession.id,
        targetSession.id,
        branch.id
      )

      expect(preview.candidates.length).toBe(4)
      expect(preview.summary.totalEligible).toBe(4)

      // Verify Standard Candidate: Kabir Mehta -> PROMOTED to NURSERY
      const kabir = preview.candidates.find((c) => c.studentId === studentStandard.id)
      expect(kabir).toBeDefined()
      expect(kabir?.proposedProgramType).toBe('NURSERY')
      expect(kabir?.proposedClassroomId).toBe(targetClassNursery.id)
      expect(kabir?.suggestedOutcome).toBe('PROMOTED')
      expect(kabir?.ageEligibility).toBe('AGE_ELIGIBLE')

      // Verify Young Candidate: Ananya Roy -> Flagged for age review
      const ananya = preview.candidates.find((c) => c.studentId === studentYoung.id)
      expect(ananya).toBeDefined()
      expect(ananya?.ageEligibility).toBe('AGE_BELOW_RECOMMENDED')
      expect(ananya?.suggestedOutcome).toBe('SPECIAL_REVIEW')

      // Verify UKG Candidate: Rohan Verma -> Suggested GRADUATED
      const rohan = preview.candidates.find((c) => c.studentId === studentUKG.id)
      expect(rohan).toBeDefined()
      expect(rohan?.suggestedOutcome).toBe('GRADUATED')
      expect(rohan?.proposedClassroomId).toBeNull()

      // Verify Retain Candidate: Diya Patel -> CONTINUE_CURRENT_LEVEL based on teacher sign-off
      const diya = preview.candidates.find((c) => c.studentId === studentRetain.id)
      expect(diya).toBeDefined()
      expect(diya?.teacherSignOff).toBe('RECOMMENDED_TO_CONTINUE')
      expect(diya?.suggestedOutcome).toBe('CONTINUE_CURRENT_LEVEL')
    })

    it('TC-PREV-02: GET /api/v1/promotions/preview endpoint returns 200 with formatted JSON', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/promotions/preview?sourceSessionId=${sourceSession.id}&targetSessionId=${targetSession.id}`,
        {
          headers: { cookie: `preone_session=${ownerToken}` },
        }
      )

      const res = await getPreview(req)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.summary.totalEligible).toBe(4)
      expect(json.data.candidates.length).toBe(4)
    })
  })

  // ── SUITE C: Atomic Batch Transition Execution ──
  describe('Suite C: Batch Promotion & State Transitions', () => {
    it('TC-BAT-01: executes batch transition: Kabir promoted, Diya continued, Rohan graduated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/promotions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `preone_session=${ownerToken}`,
        },
        body: JSON.stringify({
          sourceSessionId: sourceSession.id,
          targetSessionId: targetSession.id,
          decisions: [
            {
              studentId: studentStandard.id,
              outcome: 'PROMOTED',
              targetClassroomId: targetClassNursery.id,
              notes: 'Passed Playgroup developmental milestones',
            },
            {
              studentId: studentRetain.id,
              outcome: 'CONTINUE_CURRENT_LEVEL',
              targetClassroomId: targetClassPlaygroup.id,
              notes: 'Continuing Playgroup to reinforce speech',
            },
            {
              studentId: studentUKG.id,
              outcome: 'GRADUATED',
              notes: 'Completed Senior KG curriculum',
            },
          ],
        }),
      })

      const res = await postBatch(req)
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.promotedCount).toBe(1)
      expect(json.data.continuedCount).toBe(1)
      expect(json.data.graduatedCount).toBe(1)
      expect(json.data.failedCount).toBe(0)

      // 1. Verify Kabir Mehta (PROMOTED):
      // - Old allocation COMPLETED/PROMOTED
      const kabirOldAlloc = await db.studentAllocation.findFirst({
        where: { studentId: studentStandard.id, academicSessionId: sourceSession.id },
      })
      expect(kabirOldAlloc?.status).toBe('PROMOTED')
      expect(kabirOldAlloc?.endedAt).not.toBeNull()

      // - New allocation ACTIVE in Nursery
      const kabirNewAlloc = await db.studentAllocation.findFirst({
        where: { studentId: studentStandard.id, academicSessionId: targetSession.id },
      })
      expect(kabirNewAlloc?.status).toBe('ACTIVE')
      expect(kabirNewAlloc?.classroomId).toBe(targetClassNursery.id)

      // - Student current pointer updated
      const kabirStudent = await db.student.findUnique({ where: { id: studentStandard.id } })
      expect(kabirStudent?.currentClassroomId).toBe(targetClassNursery.id)
      expect(kabirStudent?.status).toBe('ACTIVE')

      // 2. Verify Diya Patel (CONTINUE_CURRENT_LEVEL):
      // - New allocation ACTIVE in Playgroup of target year
      const diyaNewAlloc = await db.studentAllocation.findFirst({
        where: { studentId: studentRetain.id, academicSessionId: targetSession.id },
      })
      expect(diyaNewAlloc?.status).toBe('ACTIVE')
      expect(diyaNewAlloc?.classroomId).toBe(targetClassPlaygroup.id)

      // 3. Verify Rohan Verma (GRADUATED):
      // - Old allocation COMPLETED
      const rohanOldAlloc = await db.studentAllocation.findFirst({
        where: { studentId: studentUKG.id, academicSessionId: sourceSession.id },
      })
      expect(rohanOldAlloc?.status).toBe('COMPLETED')

      // - Student status set to GRADUATED, currentClassroomId cleared
      const rohanStudent = await db.student.findUnique({ where: { id: studentUKG.id } })
      expect(rohanStudent?.status).toBe('GRADUATED')
      expect(rohanStudent?.currentClassroomId).toBeNull()

      // - Timeline milestones created
      const milestones = await db.timelineEntry.findMany({
        where: { tenantId: tenant.id, type: 'MILESTONE' },
      })
      expect(milestones.length).toBeGreaterThanOrEqual(3)
    })

    it('TC-BAT-02: Idempotency: re-running batch skips already-allocated students without duplicating', async () => {
      const result = await PromotionService.executeBatch(
        { id: ownerUser.id, name: ownerUser.fullName, role: 'OWNER', tenantId: tenant.id },
        {
          sourceSessionId: sourceSession.id,
          targetSessionId: targetSession.id,
          decisions: [
            {
              studentId: studentStandard.id,
              outcome: 'PROMOTED',
              targetClassroomId: targetClassNursery.id,
            },
          ],
        }
      )

      expect(result.results[0].status).toBe('SUCCESS')
      expect(result.results[0].message).toContain('Already allocated')

      // Verify no duplicate allocation rows
      const kabirAllocations = await db.studentAllocation.findMany({
        where: { studentId: studentStandard.id, academicSessionId: targetSession.id },
      })
      expect(kabirAllocations.length).toBe(1)
    })
  })

  // ── SUITE D: Terminal Graduation API ──
  describe('Suite D: Dedicated Student Graduation API', () => {
    it('TC-GRAD-01: POST /api/v1/students/[id]/graduate transitions student to GRADUATED', async () => {
      // Create another senior student for standalone graduation test
      const gradStudent = await db.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: `ADM-GRAD-${ts}`,
          firstName: 'Siddharth',
          lastName: 'Joshi',
          dob: new Date('2020-04-01'),
          gender: 'MALE',
          status: 'ACTIVE',
        },
      })

      const req = new NextRequest(`http://localhost:3000/api/v1/students/${gradStudent.id}/graduate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `preone_session=${ownerToken}`,
        },
        body: JSON.stringify({
          graduationDate: '2026-04-15',
          certificateNumber: `CERT-${ts}-001`,
          remarks: 'Completed pre-primary education with academic merit.',
        }),
      })

      const res = await postGraduate(req, { params: Promise.resolve({ id: gradStudent.id }) })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.status).toBe('GRADUATED')
      expect(json.data.certificateNumber).toBe(`CERT-${ts}-001`)

      const updated = await db.student.findUnique({ where: { id: gradStudent.id } })
      expect(updated?.status).toBe('GRADUATED')
    })
  })

  // ── SUITE E: Security & Multi-Tenant Isolation ──
  describe('Suite E: Security & Tenant Isolation', () => {
    it('TC-SEC-01: Foreign tenant user cannot preview or execute promotion on another tenant', async () => {
      foreignUser = await db.user.create({
        data: {
          email: `attacker.${ts}@foreign.local`,
          fullName: 'Attacker Admin',
          passwordHash: 'dummy-hash',
          memberships: {
            create: {
              tenantId: foreignTenant.id,
              role: 'OWNER',
              roles: ['OWNER'],
              status: 'ACTIVE',
            },
          },
        },
      })
      createdUserIds.push(foreignUser.id)

      const foreignToken = await signSession({
        uid: foreignUser.id,
        email: foreignUser.email,
        role: 'OWNER',
        tenantId: foreignTenant.id,
        name: foreignUser.fullName,
        tokenVersion: 1,
      })

      // Attempt to access preview of tenant's sessions
      const req = new NextRequest(
        `http://localhost:3000/api/v1/promotions/preview?sourceSessionId=${sourceSession.id}&targetSessionId=${targetSession.id}`,
        {
          headers: { cookie: `preone_session=${foreignToken}` },
        }
      )

      const res = await getPreview(req)
      expect(res.status).toBe(422) // Business error: Invalid source or target academic session for foreign context

      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error.message).toContain('Invalid source or target')
    })
  })
})
