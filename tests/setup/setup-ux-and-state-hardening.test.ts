import { describe, it, expect } from 'bun:test'
import {
  canonicalSnapshot,
  snapshotsEqual,
  evaluateStep,
  type TenantContext,
} from '@/lib/setup/engine'

describe('PRE1-SETUP-UX-AND-STATE-HARDENING-001: Setup Engine & UX State Tests', () => {
  // ── ISSUE 1: CANONICAL SNAPSHOT COMPARISON & DRIFT AVOIDANCE ─────────
  describe('Issue 1: Snapshot Equality & Key-Sorted Serialization', () => {
    it('evaluates objects with differing key order as identical snapshots', () => {
      const dbSnapshot = {
        city: 'Pune',
        name: 'PreOne Preschool',
        email: 'admin@preone.test',
        phone: '9876543210',
        address: '123 Education Lane',
        hasSignature: false,
      }

      const inMemorySnapshot = {
        name: 'PreOne Preschool',
        email: 'admin@preone.test',
        phone: '9876543210',
        address: '123 Education Lane',
        city: 'Pune',
        hasSignature: false,
      }

      // Raw JSON.stringify would fail due to key ordering
      expect(JSON.stringify(dbSnapshot)).not.toBe(JSON.stringify(inMemorySnapshot))

      // canonicalSnapshot sorts keys deterministically
      expect(canonicalSnapshot(dbSnapshot)).toBe(canonicalSnapshot(inMemorySnapshot))
      expect(snapshotsEqual(dbSnapshot, inMemorySnapshot)).toBe(true)
    })

    it('detects genuine operational changes in snapshots', () => {
      const snapA = { name: 'PreOne', address: 'Old Address', city: 'Pune' }
      const snapB = { name: 'PreOne', address: 'New Address', city: 'Pune' }

      expect(snapshotsEqual(snapA, snapB)).toBe(false)
    })

    it('handles nested objects and arrays deterministically', () => {
      const complexA = {
        branches: [{ code: 'B2', name: 'West' }, { code: 'B1', name: 'East' }],
        settings: { z: 1, a: 2 },
      }
      const complexB = {
        settings: { a: 2, z: 1 },
        branches: [{ code: 'B2', name: 'West' }, { code: 'B1', name: 'East' }],
      }

      expect(snapshotsEqual(complexA, complexB)).toBe(true)
    })
  })

  // ── ISSUE 1 & ISSUE 5: SCHOOL PROFILE AND BRANCH EVALUATION ──────────
  describe('Issue 1 & 5: Step Evaluation and Dependency Decoupling', () => {
    const mockContext: TenantContext = {
      tenant: {
        id: 'tenant-test-1',
        name: 'PreOne Academy',
        code: 'PRE-TEST',
        email: 'admin@preone.test',
        phone: '9876543210',
        city: 'Pune',
        state: 'Maharashtra',
        address: '123 Education Street',
        website: 'https://preone.test',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
        logoUrl: 'https://cdn.preone.test/logo.png',
        principalSignatureUrl: null,
      },
      branches: [
        {
          id: 'branch-1',
          name: 'Main Campus',
          code: 'MAIN',
          timingOpen: '08:30',
          timingClose: '16:00',
          capacity: 100,
          isActive: true,
        },
        {
          id: 'branch-2',
          name: 'West Campus',
          code: 'WEST',
          timingOpen: '08:30',
          timingClose: '16:00',
          capacity: 80,
          isActive: true,
        },
      ],
      programs: [],
      programBranches: [],
      classrooms: [],
      facilities: [],
      currentSession: null,
      memberships: [],
      staffProfiles: [],
      calendarEvents: [],
      feePlans: [],
      feeStructures: [],
      subjects: [],
      programSubjects: [],
      classroomSubjects: [],
      curriculums: [],
      configs: {},
      studentCount: 0,
    }

    it('satisfies school_profile when all required contact & legal fields exist', () => {
      const ev = evaluateStep('school_profile', mockContext)
      expect(ev.satisfied).toBe(true)
      expect(ev.detail).toBe('School legal identity and contact complete')
      expect(ev.snapshot.name).toBe('PreOne Academy')
      expect(ev.snapshot.city).toBe('Pune')
    })

    it('fails school_profile with exact missing fields when incomplete', () => {
      const incompleteCtx: TenantContext = {
        ...mockContext,
        tenant: {
          ...mockContext.tenant,
          phone: null,
          address: null,
        },
      }
      const ev = evaluateStep('school_profile', incompleteCtx)
      expect(ev.satisfied).toBe(false)
      expect(ev.detail).toContain('Missing: phone, address')
    })

    it('evaluates branch status independently from program offerings', () => {
      // In mockContext, branches exist with valid hours, but programs list is empty.
      // Branch status MUST be satisfied and NOT marked DRIFT or BLOCKED solely due to programs.
      const branchEv = evaluateStep('branch', mockContext)
      expect(branchEv.satisfied).toBe(true)
      expect(branchEv.detail).toContain('2 branch(es) registered with valid operating hours')
    })

    it('evaluates branch-specific scope correctly for target branch', () => {
      const targetBranchEv = evaluateStep('branch', mockContext, 'branch-1')
      expect(targetBranchEv.satisfied).toBe(true)
      expect(targetBranchEv.detail).toContain('Campus "Main Campus" is active')

      const invalidBranchEv = evaluateStep('branch', mockContext, 'non-existent-branch')
      expect(invalidBranchEv.satisfied).toBe(false)
      expect(invalidBranchEv.detail).toContain('Selected campus is not active or does not exist')
    })
  })

  // ── ISSUE 5: PROGRAM CREATION AND BRANCH OFFERING LIFECYCLE ─────────
  describe('Issue 5: Program Creation vs Campus Offering Lifecycle Steps', () => {
    it('Scenario 1: Program not created -> unsatisfied', () => {
      const ctx: TenantContext = {
        ...mockContextBase(),
        programs: [],
        programBranches: [],
      }
      const ev = evaluateStep('programs', ctx)
      expect(ev.satisfied).toBe(false)
      expect(ev.detail).toBe('No active programs configured in school')
    })

    it('Scenario 2: Program created but not offered to any campus -> unsatisfied with unmapped campuses reason', () => {
      const ctx: TenantContext = {
        ...mockContextBase(),
        programs: [
          {
            id: 'prog-1',
            code: 'NUR',
            name: 'Nursery',
            programType: 'NURSERY',
            ageMinMonths: 36,
            ageMaxMonths: 48,
            capacity: 25,
            isActive: true,
          },
        ],
        programBranches: [], // Not offered to any branch yet
      }
      const ev = evaluateStep('programs', ctx)
      expect(ev.satisfied).toBe(false)
      expect(ev.detail).toContain('Campus(es) lacking program mapping: Main Campus, West Campus')
    })

    it('Scenario 3: Program offered to one branch only -> branch 1 satisfied, branch 2 unsatisfied', () => {
      const ctx: TenantContext = {
        ...mockContextBase(),
        programs: [
          {
            id: 'prog-1',
            code: 'NUR',
            name: 'Nursery',
            programType: 'NURSERY',
            ageMinMonths: 36,
            ageMaxMonths: 48,
            capacity: 25,
            isActive: true,
          },
        ],
        programBranches: [
          { id: 'pb-1', programId: 'prog-1', branchId: 'branch-1', capacity: 25, isActive: true },
        ],
      }

      // Branch 1 query
      const evBranch1 = evaluateStep('programs', ctx, 'branch-1')
      expect(evBranch1.satisfied).toBe(true)
      expect(evBranch1.detail).toContain('1 program(s) mapped and active for this campus')

      // Branch 2 query
      const evBranch2 = evaluateStep('programs', ctx, 'branch-2')
      expect(evBranch2.satisfied).toBe(false)
      expect(evBranch2.detail).toBe('No active programs mapped to this campus')

      // Tenant-level aggregation
      const evTenant = evaluateStep('programs', ctx)
      expect(evTenant.satisfied).toBe(false)
      expect(evTenant.detail).toContain('Campus(es) lacking program mapping: West Campus')
    })

    it('Scenario 4: Program offered to all branches -> fully satisfied', () => {
      const ctx: TenantContext = {
        ...mockContextBase(),
        programs: [
          {
            id: 'prog-1',
            code: 'NUR',
            name: 'Nursery',
            programType: 'NURSERY',
            ageMinMonths: 36,
            ageMaxMonths: 48,
            capacity: 25,
            isActive: true,
          },
        ],
        programBranches: [
          { id: 'pb-1', programId: 'prog-1', branchId: 'branch-1', capacity: 25, isActive: true },
          { id: 'pb-2', programId: 'prog-1', branchId: 'branch-2', capacity: 25, isActive: true },
        ],
      }

      const ev = evaluateStep('programs', ctx)
      expect(ev.satisfied).toBe(true)
      expect(ev.detail).toBe('1 master program(s) active across 2 campus mapping(s)')
    })
  })

  // ── ISSUE 2: BRANCH CONTEXT VALIDATION & ISOLATION ───────────────────
  describe('Issue 2: Branch Context Security & Validation', () => {
    const authorizedBranches = [
      { id: 'branch-main', name: 'Main Campus', code: 'MAIN' },
      { id: 'branch-north', name: 'North Campus', code: 'NORTH' },
    ]

    function resolveBranchContext(
      requestedId: string | null,
      storedId: string | null,
      branches: { id: string }[]
    ): string {
      const candidate = requestedId || storedId || 'ALL'
      if (candidate === 'ALL') return 'ALL'
      const isAuthorized = branches.some((b) => b.id === candidate)
      return isAuthorized ? candidate : 'ALL'
    }

    it('preserves valid branch context from URL parameter', () => {
      const resolved = resolveBranchContext('branch-north', 'branch-main', authorizedBranches)
      expect(resolved).toBe('branch-north')
    })

    it('falls back to stored branch context when URL parameter is missing', () => {
      const resolved = resolveBranchContext(null, 'branch-main', authorizedBranches)
      expect(resolved).toBe('branch-main')
    })

    it('strictly rejects unauthorized or cross-tenant branch IDs and safely falls back to ALL', () => {
      const maliciousBranchId = 'cross-tenant-branch-999'
      const resolvedFromUrl = resolveBranchContext(maliciousBranchId, null, authorizedBranches)
      expect(resolvedFromUrl).toBe('ALL')

      const resolvedFromStorage = resolveBranchContext(null, maliciousBranchId, authorizedBranches)
      expect(resolvedFromStorage).toBe('ALL')
    })

    it('preserves ALL explicitly without unintended defaulting', () => {
      const resolved = resolveBranchContext('ALL', 'branch-main', authorizedBranches)
      expect(resolved).toBe('ALL')
    })
  })
})

function mockContextBase(): TenantContext {
  return {
    tenant: {
      id: 'tenant-test-1',
      name: 'PreOne Academy',
      code: 'PRE-TEST',
      email: 'admin@preone.test',
      phone: '9876543210',
      city: 'Pune',
      state: 'Maharashtra',
      address: '123 Education Street',
      website: 'https://preone.test',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      logoUrl: null,
      principalSignatureUrl: null,
    },
    branches: [
      {
        id: 'branch-1',
        name: 'Main Campus',
        code: 'MAIN',
        timingOpen: '08:30',
        timingClose: '16:00',
        capacity: 100,
        isActive: true,
      },
      {
        id: 'branch-2',
        name: 'West Campus',
        code: 'WEST',
        timingOpen: '08:30',
        timingClose: '16:00',
        capacity: 80,
        isActive: true,
      },
    ],
    programs: [],
    programBranches: [],
    classrooms: [],
    facilities: [],
    currentSession: null,
    memberships: [],
    staffProfiles: [],
    calendarEvents: [],
    feePlans: [],
    feeStructures: [],
    subjects: [],
    programSubjects: [],
    classroomSubjects: [],
    curriculums: [],
    configs: {},
    studentCount: 0,
  }
}
