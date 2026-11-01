import { describe, it, expect, beforeAll } from 'bun:test'
import { NextRequest } from 'next/server'
import { can, signSession, SESSION_COOKIE } from '@/lib/auth'
import { navForRole } from '@/lib/nav'
import { CAPABILITY_CATALOG, ALL_CAPABILITY_IDS } from '@/lib/auth/rbac-engine'
import { GET as getParentInventory } from '@/app/api/v1/parent/inventory/route'
import { GET as getStudentProgress } from '@/app/api/v1/academics/students/[studentId]/progress/route'
import { GET as getParentToday } from '@/app/api/v1/parent/today/route'
import { GET as getParentDailyDiary } from '@/app/api/v1/parent/daily-diary/route'
import { GET as getParentDocuments } from '@/app/api/v1/parent/documents/route'
import { db } from '@/lib/db'

describe('PRE1-PARENT-PORTAL-STUDENT-CENTRIC-ACCESS-001 — Security & RBAC Suite', () => {
  const ts = Date.now().toString()
  let tenantA: any
  let branchA: any
  let parentUserA: any
  let guardianRecordA: any
  let student1A: any
  let student2A: any
  let sessionTokenParentA: string

  let tenantB: any
  let branchB: any
  let parentUserB: any
  let studentB: any
  let sessionTokenParentB: string

  let testInventoryItem: any
  let testStockIssue: any

  beforeAll(async () => {
    // ── Create Tenant A ──
    tenantA = await db.tenant.create({
      data: {
        code: `PTA-${ts.slice(-6)}`,
        name: `Parent Portal Academy ${ts}`,
        status: 'ACTIVE',
      },
    })

    branchA = await db.branch.create({
      data: {
        tenantId: tenantA.id,
        name: 'Alpha Campus',
        code: `BR-A-${ts.slice(-4)}`,
        isMain: true,
      },
    })

    await db.academicSession.create({
      data: {
        tenantId: tenantA.id,
        name: '2026-2027 Academic Year',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        status: 'ACTIVE',
        isCurrent: true,
      },
    })

    // Create 2 students for Parent A in Tenant A
    student1A = await db.student.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA.id,
        firstName: 'Aarav',
        lastName: 'Sharma',
        admissionNo: `ADM-A1-${ts.slice(-4)}`,
        dob: new Date('2021-04-10'),
        gender: 'MALE',
        status: 'ACTIVE',
      },
    })

    student2A = await db.student.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA.id,
        firstName: 'Ananya',
        lastName: 'Sharma',
        admissionNo: `ADM-A2-${ts.slice(-4)}`,
        dob: new Date('2023-01-15'),
        gender: 'FEMALE',
        status: 'ACTIVE',
      },
    })

    // Parent A user
    parentUserA = await db.user.create({
      data: {
        email: `parentA.${ts}@example.com`,
        username: `parent_a_${ts}`,
        fullName: 'Rajesh Sharma',
        passwordHash: 'dummyHashForSecurity',
        status: 'ACTIVE',
      },
    })

    await db.tenantUser.create({
      data: {
        tenantId: tenantA.id,
        userId: parentUserA.id,
        role: 'PARENT',
        roles: ['PARENT'],
        status: 'ACTIVE',
      },
    })

    guardianRecordA = await db.guardian.create({
      data: {
        tenantId: tenantA.id,
        userId: parentUserA.id,
        fullName: 'Rajesh Sharma',
        relationship: 'FATHER',
        phone: `+9198765${ts.slice(-5)}`,
        email: parentUserA.email,
      },
    })

    // Link Parent A to Student 1A and Student 2A
    await db.studentGuardian.create({
      data: {
        studentId: student1A.id,
        guardianId: guardianRecordA.id,
        relationship: 'FATHER',
        isPrimary: true,
        canPickup: true,
        pickupStatus: 'AUTHORIZED',
      },
    })

    await db.studentGuardian.create({
      data: {
        studentId: student2A.id,
        guardianId: guardianRecordA.id,
        relationship: 'FATHER',
        isPrimary: true,
        canPickup: true,
        pickupStatus: 'AUTHORIZED',
      },
    })

    // Sign session token for Parent A
    sessionTokenParentA = await signSession({
      uid: parentUserA.id,
      email: parentUserA.email,
      name: parentUserA.fullName,
      tenantId: tenantA.id,
      branchId: branchA.id,
      role: 'PARENT',
      roles: ['PARENT'],
    })

    // ── Create Inventory records for Student 1A in Tenant A ──
    const location = await db.inventoryLocation.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA.id,
        name: 'Main Classroom Store',
        code: `LOC-${ts.slice(-4)}`,
      },
    })

    const cat = await db.inventoryCategory.create({
      data: {
        tenantId: tenantA.id,
        name: 'Books & Stationery',
        code: `CAT-${ts.slice(-6)}`,
      },
    })

    const unit = await db.inventoryUnit.create({
      data: {
        tenantId: tenantA.id,
        name: 'Piece',
        code: `UNT-${ts.slice(-6)}`,
        symbol: 'pc',
      },
    })

    testInventoryItem = await db.inventoryItem.create({
      data: {
        tenantId: tenantA.id,
        categoryId: cat.id,
        unitId: unit.id,
        name: 'Nursery Rhyme & Activity Book',
        sku: `BK-${ts.slice(-6)}`,
        description: 'Complete term 1 interactive activity book',
      },
    })

    testStockIssue = await db.stockIssue.create({
      data: {
        tenantId: tenantA.id,
        branchId: branchA.id,
        issueNumber: `ISSUE-${ts.slice(-6)}`,
        locationId: location.id,
        destinationType: 'STUDENT',
        studentId: student1A.id,
        issuedById: parentUserA.id,
        issuedByName: 'School Store Manager',
        status: 'COMPLETED',
        notes: 'Handed over on first day of term',
        items: {
          create: [
            {
              itemId: testInventoryItem.id,
              quantity: 1,
              returnedQuantity: 0,
            },
          ],
        },
      },
    })

    // ── Create Foreign Tenant B (Cross-Tenant & Cross-Family Defense) ──
    tenantB = await db.tenant.create({
      data: {
        code: `PTB-${ts.slice(-6)}`,
        name: `Foreign School ${ts}`,
        status: 'ACTIVE',
      },
    })

    branchB = await db.branch.create({
      data: {
        tenantId: tenantB.id,
        name: 'Branch Beta',
        code: `BR-B-${ts.slice(-4)}`,
        isMain: true,
      },
    })

    studentB = await db.student.create({
      data: {
        tenantId: tenantB.id,
        branchId: branchB.id,
        firstName: 'ForeignChild',
        lastName: 'Verma',
        admissionNo: `ADM-B1-${ts.slice(-4)}`,
        dob: new Date('2021-08-20'),
        gender: 'MALE',
        status: 'ACTIVE',
      },
    })

    parentUserB = await db.user.create({
      data: {
        email: `parentB.${ts}@example.com`,
        username: `parent_b_${ts}`,
        fullName: 'Foreign Parent',
        passwordHash: 'dummyHashB',
        status: 'ACTIVE',
      },
    })

    await db.tenantUser.create({
      data: {
        tenantId: tenantB.id,
        userId: parentUserB.id,
        role: 'PARENT',
        roles: ['PARENT'],
        status: 'ACTIVE',
      },
    })

    sessionTokenParentB = await signSession({
      uid: parentUserB.id,
      email: parentUserB.email,
      name: parentUserB.fullName,
      tenantId: tenantB.id,
      branchId: branchB.id,
      role: 'PARENT',
      roles: ['PARENT'],
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 1. RBAC & NAVIGATION TESTS
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. RBAC Matrix & Navigation Coverage', () => {
    it('grants PARENT all student-centric read capabilities in ROLE_PERMISSIONS', () => {
      expect(can('PARENT', 'students:read-linked')).toBe(true)
      expect(can('PARENT', 'academics:read-linked')).toBe(true)
      expect(can('PARENT', 'inventory:read-linked')).toBe(true)
      expect(can('PARENT', 'reports:read-linked')).toBe(true)
      expect(can('PARENT', 'timeline:read')).toBe(true)
      expect(can('PARENT', 'diary:read-linked')).toBe(true)
      expect(can('PARENT', 'communication:read')).toBe(true)
      expect(can('PARENT', 'finance:read')).toBe(true)
      expect(can('PARENT', 'transport:read')).toBe(true)
    })

    it('strictly denies PARENT administrative CRUD and school-wide write capabilities', () => {
      expect(can('PARENT', 'students:write')).toBe(false)
      expect(can('PARENT', 'academics:write')).toBe(false)
      expect(can('PARENT', 'inventory:write')).toBe(false)
      expect(can('PARENT', 'reports:write')).toBe(false)
      expect(can('PARENT', 'users:write')).toBe(false)
      expect(can('PARENT', 'settings:write')).toBe(false)
      expect(can('PARENT', 'communication:broadcast')).toBe(false)
      expect(can('PARENT', 'finance:write')).toBe(false)
      expect(can('PARENT', 'payroll:process')).toBe(false)
      expect(can('PARENT', 'platform:manage')).toBe(false)
    })

    it('returns all 10 canonical modules for navForRole("PARENT")', () => {
      const items = navForRole('PARENT').map((n) => n.key)
      expect(items).toContain('home')
      expect(items).toContain('dashboard')
      expect(items).toContain('students')
      expect(items).toContain('daily-diary')
      expect(items).toContain('finance')
      expect(items).toContain('transport')
      expect(items).toContain('inventory')
      expect(items).toContain('learning')
      expect(items).toContain('reports')
      expect(items).toContain('communication')

      // Ensure administrative modules are NOT leaked to parent
      expect(items).not.toContain('setup')
      expect(items).not.toContain('users')
      expect(items).not.toContain('hr')
      expect(items).not.toContain('audit')
      expect(items).not.toContain('platform')
    })

    it('confirms all student-linked capabilities are cataloged in CAPABILITY_CATALOG', () => {
      expect(ALL_CAPABILITY_IDS.has('students:read-linked')).toBe(true)
      expect(ALL_CAPABILITY_IDS.has('academics:read-linked')).toBe(true)
      expect(ALL_CAPABILITY_IDS.has('inventory:read-linked')).toBe(true)
      expect(ALL_CAPABILITY_IDS.has('reports:read-linked')).toBe(true)
      expect(ALL_CAPABILITY_IDS.has('diary:read-linked')).toBe(true)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PARENT INVENTORY API TESTS
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Student-Assigned Inventory API & Security', () => {
    it('allows Parent A to view items assigned to their linked child (student1A)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/inventory?studentId=${student1A.id}`,
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getParentInventory(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data.items)).toBe(true)
      expect(json.data.items.length).toBeGreaterThanOrEqual(1)

      const item = json.data.items[0]
      expect(item.itemName).toBe('Nursery Rhyme & Activity Book')
      expect(item.studentId).toBe(student1A.id)
      expect(item.quantityIssued).toBe(1)
      expect(item.status).toBe('ISSUED')

      // Security check: Unit cost and vendor prices must NEVER be exposed
      expect((item as any).unitCost).toBeUndefined()
      expect((item as any).costPrice).toBeUndefined()
      expect((item as any).supplier).toBeUndefined()
    })

    it('IDOR Defense: Rejects Parent A accessing items for unrelated studentB in Tenant B (403 Forbidden)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/inventory?studentId=${studentB.id}`,
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getParentInventory(req)
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error?.message).toContain('not authorized')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ACADEMICS & LEARNING PROGRESS API TESTS
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Student Learning Progress & Pre-work Authorization', () => {
    it('allows Parent A to view learning progress for linked student1A', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/academics/students/${student1A.id}/progress`,
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getStudentProgress(req, { params: Promise.resolve({ studentId: student1A.id }) })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toBeDefined()
      expect(json.data.student.id).toBe(student1A.id)
    })

    it('IDOR Defense: Rejects Parent A accessing learning progress for foreign studentB (403 Forbidden)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/academics/students/${studentB.id}/progress`,
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getStudentProgress(req, { params: Promise.resolve({ studentId: studentB.id }) })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error?.message).toContain('not authorized')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. DAILY DIARY & DOCUMENTS RELATIONSHIP VALIDATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Daily Diary & Reports Relationship Authorization', () => {
    it('allows Parent A to view daily diary for linked student1A', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/daily-diary?studentId=${student1A.id}`,
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getParentDailyDiary(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.student.id).toBe(student1A.id)
    })

    it('IDOR Defense: Rejects Parent A querying daily diary for unrelated studentB (403 Forbidden)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/daily-diary?studentId=${studentB.id}`,
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getParentDailyDiary(req)
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error?.message).toContain('not authorized')
    })

    it('allows Parent A to list documents for student1A', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/documents?studentId=${student1A.id}`,
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getParentDocuments(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data)).toBe(true)
    })

    it('IDOR Defense: Rejects Parent A querying documents for unrelated studentB (403 Forbidden)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/documents?studentId=${studentB.id}`,
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getParentDocuments(req)
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error?.message).toContain('not authorized')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 5. MULTI-CHILD SELECTOR SUPPORT
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Multi-Child Support & Relationship Integrity', () => {
    it('returns both linked children (student1A and student2A) for Parent A in parent/today', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/parent/today',
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getParentToday(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.children.length).toBe(2)

      const ids = json.data.children.map((c: any) => c.id)
      expect(ids).toContain(student1A.id)
      expect(ids).toContain(student2A.id)
      expect(ids).not.toContain(studentB.id)
    })

    it('allows switching to student2A and queries specifically student2A data', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/today?studentId=${student2A.id}`,
        {
          headers: { cookie: `${SESSION_COOKIE}=${sessionTokenParentA}` },
        }
      )

      const res = await getParentToday(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.children.length).toBe(1)
      expect(json.data.children[0].id).toBe(student2A.id)
    })
  })
})
