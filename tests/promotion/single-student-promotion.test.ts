import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '@/lib/db'
import { signSession } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { POST as postPromote } from '@/app/api/v1/students/[id]/promote/route'
import { StudentService } from '@/lib/students/student-service'

describe('Single Student Promotion & Profile Status Reflection Test Suite', () => {
  const ts = Date.now()
  let tenant: any
  let branch: any
  let sourceSession: any
  let targetSession: any
  let sourceClass: any
  let targetClass: any
  let student1: any
  let student2: any
  let ownerUser: any
  let ownerToken: string
  let foreignUser: any
  let foreignToken: string
  let foreignTenant: any

  beforeAll(async () => {
    tenant = await db.tenant.create({
      data: {
        code: `SSP_TENANT_${ts}`,
        name: `Single Promotion Test Preschool ${ts}`,
        type: 'SCHOOL',
        status: 'ACTIVE',
      },
    })

    foreignTenant = await db.tenant.create({
      data: {
        code: `SSP_FOR_${ts}`,
        name: `Foreign School ${ts}`,
        type: 'SCHOOL',
        status: 'ACTIVE',
      },
    })

    branch = await db.branch.create({
      data: {
        tenantId: tenant.id,
        code: `BR_${ts}`,
        name: 'Main Campus',
        isMain: true,
      },
    })

    sourceSession = await db.academicSession.create({
      data: {
        tenantId: tenant.id,
        name: `Session 2025-2026 ${ts}`,
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
        status: 'ACTIVE',
        isCurrent: true,
      },
    })

    targetSession = await db.academicSession.create({
      data: {
        tenantId: tenant.id,
        name: `Session 2026-2027 ${ts}`,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        status: 'PLANNED',
        isCurrent: false,
      },
    })

    sourceClass = await db.classroom.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        academicSessionId: sourceSession.id,
        name: `Nursery Lotus ${ts}`,
        code: `NUR-${ts.toString().slice(-4)}`,
        programType: 'NURSERY',
        capacity: 25,
      },
    })

    targetClass = await db.classroom.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        academicSessionId: targetSession.id,
        name: `LKG Sunflower ${ts}`,
        code: `LKG-${ts.toString().slice(-4)}`,
        programType: 'LKG',
        capacity: 25,
      },
    })

    student1 = await db.student.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        admissionNo: `ADM-SP1-${ts.toString().slice(-4)}`,
        firstName: 'Kabir',
        lastName: 'Sharma',
        dob: new Date('2022-05-15'),
        gender: 'MALE',
        currentClassroomId: sourceClass.id,
        status: 'ACTIVE',
      },
    })

    await db.studentAllocation.create({
      data: {
        tenantId: tenant.id,
        studentId: student1.id,
        academicSessionId: sourceSession.id,
        classroomId: sourceClass.id,
        programType: 'NURSERY',
        status: 'ACTIVE',
      },
    })

    student2 = await db.student.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        admissionNo: `ADM-SP2-${ts.toString().slice(-4)}`,
        firstName: 'Ananya',
        lastName: 'Verma',
        dob: new Date('2021-02-10'),
        gender: 'FEMALE',
        currentClassroomId: sourceClass.id,
        status: 'ACTIVE',
      },
    })

    await db.studentAllocation.create({
      data: {
        tenantId: tenant.id,
        studentId: student2.id,
        academicSessionId: sourceSession.id,
        classroomId: sourceClass.id,
        programType: 'NURSERY',
        status: 'ACTIVE',
      },
    })

    ownerUser = await db.user.create({
      data: {
        email: `principal_${ts}@preone.test`,
        fullName: 'Principal Mehra',
        passwordHash: 'dummy-hash',
      },
    })

    await db.tenantUser.create({
      data: {
        userId: ownerUser.id,
        tenantId: tenant.id,
        branchId: branch.id,
        role: 'PRINCIPAL',
      },
    })

    ownerToken = await signSession({
      uid: ownerUser.id,
      email: ownerUser.email,
      name: ownerUser.fullName,
      role: 'PRINCIPAL',
      roles: ['PRINCIPAL'],
      tenantId: tenant.id,
      branchId: branch.id,
    })

    foreignUser = await db.user.create({
      data: {
        email: `foreign_${ts}@preone.test`,
        fullName: 'Foreign User',
        passwordHash: 'dummy-hash',
      },
    })

    foreignToken = await signSession({
      uid: foreignUser.id,
      email: foreignUser.email,
      name: foreignUser.fullName,
      role: 'PRINCIPAL',
      roles: ['PRINCIPAL'],
      tenantId: foreignTenant.id,
    })
  })

  afterAll(async () => {
    try {
      await db.studentAllocation.deleteMany({ where: { studentId: { in: [student1.id, student2.id] } } })
      await db.student.deleteMany({ where: { id: { in: [student1.id, student2.id] } } })
      await db.classroom.deleteMany({ where: { id: { in: [sourceClass.id, targetClass.id] } } })
      await db.academicSession.deleteMany({ where: { id: { in: [sourceSession.id, targetSession.id] } } })
      await db.tenantUser.deleteMany({ where: { userId: ownerUser.id } })
      await db.user.deleteMany({ where: { id: { in: [ownerUser.id, foreignUser.id] } } })
      await db.branch.deleteMany({ where: { id: branch.id } })
      await db.tenant.deleteMany({ where: { id: { in: [tenant.id, foreignTenant.id] } } })
    } catch {}
  })

  it('1. Successfully promotes single student via POST /api/v1/students/[id]/promote', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/students/${student1.id}/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `preone_session=${ownerToken}`,
      },
      body: JSON.stringify({
        targetAcademicSessionId: targetSession.id,
        targetClassroomId: targetClass.id,
        outcome: 'PROMOTED',
        reason: 'Recommended by primary teacher',
      }),
    })

    const res = await postPromote(req, { params: Promise.resolve({ id: student1.id }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    // Verify database state: old allocation COMPLETED, new allocation ACTIVE in target session
    const allocations = await db.studentAllocation.findMany({
      where: { studentId: student1.id },
      orderBy: { startedAt: 'desc' },
    })

    expect(allocations.length).toBe(2)
    const activeAlloc = allocations.find((a) => a.academicSessionId === targetSession.id)
    expect(activeAlloc).toBeDefined()
    expect(activeAlloc?.status).toBe('ACTIVE')
    expect(activeAlloc?.classroomId).toBe(targetClass.id)

    const oldAlloc = allocations.find((a) => a.academicSessionId === sourceSession.id)
    expect(oldAlloc?.status).toBe('COMPLETED')
  })

  it('2. Student profile reflects the new allocation in academic progression history', async () => {
    const profile = await StudentService.getStudentProfile(
      {
        tenantId: tenant.id,
        branchId: branch.id,
        actorId: ownerUser.id,
        actorName: ownerUser.fullName,
        actorRole: 'PRINCIPAL',
      },
      student1.id
    )

    expect(profile.academic.allocations.length).toBeGreaterThanOrEqual(2)
    const nextAlloc = profile.academic.allocations.find(
      (a: any) => a.sessionId === targetSession.id
    )
    expect(nextAlloc).toBeDefined()
    expect(nextAlloc?.classroomName).toBe(targetClass.name)
    expect(nextAlloc?.isCurrentSession).toBe(false)
  })

  it('3. Successfully transitions student to GRADUATED status', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/students/${student2.id}/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `preone_session=${ownerToken}`,
      },
      body: JSON.stringify({
        targetAcademicSessionId: targetSession.id,
        outcome: 'GRADUATED',
        reason: 'Completed preschool curriculum (Sr. KG Alumni)',
      }),
    })

    const res = await postPromote(req, { params: Promise.resolve({ id: student2.id }) })
    expect(res.status).toBe(200)

    const updatedStudent = await db.student.findUnique({
      where: { id: student2.id },
    })
    expect(updatedStudent?.status).toBe('GRADUATED')
  })

  it('4. Rejects cross-tenant single promotion request (Security & IDOR Defense)', async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/students/${student1.id}/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `preone_session=${foreignToken}`,
      },
      body: JSON.stringify({
        targetAcademicSessionId: targetSession.id,
        targetClassroomId: targetClass.id,
        outcome: 'PROMOTED',
      }),
    })

    const res = await postPromote(req, { params: Promise.resolve({ id: student1.id }) })
    expect([403, 404]).toContain(res.status)
  })
})
