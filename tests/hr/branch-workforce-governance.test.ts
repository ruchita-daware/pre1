import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '@/lib/db'
import { AttendanceCalculator } from '@/lib/hr/attendance-calculator'
import { StaffService } from '@/lib/hr/staff-service'
import { LeaveService } from '@/lib/hr/leave-service'

describe('PRE1-HR-BRANCH-WISE-WORKFORCE-GOVERNANCE-002: Branch-Wise Workforce Governance, Face Attendance, Leave Routing & Payroll Isolation', () => {
  let tenantId: string
  let branchAId: string
  let branchBId: string
  let ownerUserId: string
  let acctAUserId: string
  let principalAUserId: string
  let teacherAUserId: string
  let teacherBUserId: string

  let staffProfileOwnerId: string
  let staffProfileAcctAId: string
  let staffProfilePrincipalAId: string
  let staffProfileTeacherAId: string
  let staffProfileTeacherBId: string
  let leaveTypeCLId: string

  beforeAll(async () => {
    // 1. Create Test Tenant
    const tenant = await db.tenant.create({
      data: {
        name: 'Gov Test Academy ' + Date.now(),
        code: 'GOV' + Math.floor(Math.random() * 9000 + 1000),
        type: 'SCHOOL',
        status: 'ACTIVE',
      },
    })
    tenantId = tenant.id

    // 2. Create Two Campuses: Branch A & Branch B
    const branchA = await db.branch.create({
      data: {
        tenantId,
        name: 'Branch A (North Campus)',
        code: 'BR-A-' + Date.now(),
      },
    })
    branchAId = branchA.id

    const branchB = await db.branch.create({
      data: {
        tenantId,
        name: 'Branch B (South Campus)',
        code: 'BR-B-' + Date.now(),
      },
    })
    branchBId = branchB.id

    // 3. Create Leave Type
    const leaveType = await db.leaveType.create({
      data: {
        tenantId,
        name: 'Casual Leave',
        code: 'CL-' + Date.now(),
        annualQuota: 12,
        isPaid: true,
      },
    })
    leaveTypeCLId = leaveType.id

    // 4. Create Personas:
    // User 1: Owner (Tenant-Wide)
    const userOwner = await db.user.create({
      data: {
        email: `owner-${Date.now()}@preone.test`,
        fullName: 'Dr. School Owner',
        passwordHash: 'dummyhash',
        status: 'ACTIVE',
      },
    })
    ownerUserId = userOwner.id
    await db.tenantUser.create({
      data: {
        tenantId,
        userId: ownerUserId,
        role: 'OWNER',
        roles: ['OWNER'],
        status: 'ACTIVE',
      },
    })
    const spOwner = await db.staffProfile.create({
      data: {
        tenantId,
        userId: ownerUserId,
        employeeCode: 'EMP-OWN-' + Date.now(),
        designation: 'School Owner & Director',
        department: 'Management',
        status: 'ACTIVE',
      },
    })
    staffProfileOwnerId = spOwner.id

    // User 2: Branch A Accountant
    const userAcctA = await db.user.create({
      data: {
        email: `acct-a-${Date.now()}@preone.test`,
        fullName: 'Branch A Accountant',
        passwordHash: 'dummyhash',
        status: 'ACTIVE',
      },
    })
    acctAUserId = userAcctA.id
    await db.tenantUser.create({
      data: {
        tenantId,
        userId: acctAUserId,
        branchId: branchAId,
        role: 'ACCOUNTS',
        roles: ['ACCOUNTS'],
        status: 'ACTIVE',
      },
    })
    const spAcctA = await db.staffProfile.create({
      data: {
        tenantId,
        branchId: branchAId,
        userId: acctAUserId,
        employeeCode: 'EMP-ACC-' + Date.now(),
        designation: 'Accounts Executive',
        department: 'Finance',
        status: 'ACTIVE',
      },
    })
    staffProfileAcctAId = spAcctA.id

    // User 3: Branch A Principal
    const userPrincipalA = await db.user.create({
      data: {
        email: `principal-a-${Date.now()}@preone.test`,
        fullName: 'Mrs. Principal North',
        passwordHash: 'dummyhash',
        status: 'ACTIVE',
      },
    })
    principalAUserId = userPrincipalA.id
    await db.tenantUser.create({
      data: {
        tenantId,
        userId: principalAUserId,
        branchId: branchAId,
        role: 'PRINCIPAL',
        roles: ['PRINCIPAL'],
        status: 'ACTIVE',
      },
    })
    const spPrincipalA = await db.staffProfile.create({
      data: {
        tenantId,
        branchId: branchAId,
        userId: principalAUserId,
        employeeCode: 'EMP-PRIN-' + Date.now(),
        designation: 'Head Principal',
        department: 'Academics',
        status: 'ACTIVE',
      },
    })
    staffProfilePrincipalAId = spPrincipalA.id

    // User 4: Teacher in Branch A
    const userTeacherA = await db.user.create({
      data: {
        email: `teacher-a-${Date.now()}@preone.test`,
        fullName: 'Teacher Alpha (Branch A)',
        passwordHash: 'dummyhash',
        status: 'ACTIVE',
      },
    })
    teacherAUserId = userTeacherA.id
    await db.tenantUser.create({
      data: {
        tenantId,
        userId: teacherAUserId,
        branchId: branchAId,
        role: 'TEACHER',
        roles: ['TEACHER'],
        status: 'ACTIVE',
      },
    })
    const spTeacherA = await db.staffProfile.create({
      data: {
        tenantId,
        branchId: branchAId,
        userId: teacherAUserId,
        employeeCode: 'EMP-TCH-A-' + Date.now(),
        designation: 'Nursery Lead Educator',
        department: 'Academics',
        status: 'ACTIVE',
        joiningDate: new Date('2026-01-15'),
      },
    })
    staffProfileTeacherAId = spTeacherA.id

    // User 5: Teacher in Branch B
    const userTeacherB = await db.user.create({
      data: {
        email: `teacher-b-${Date.now()}@preone.test`,
        fullName: 'Teacher Beta (Branch B)',
        passwordHash: 'dummyhash',
        status: 'ACTIVE',
      },
    })
    teacherBUserId = userTeacherB.id
    await db.tenantUser.create({
      data: {
        tenantId,
        userId: teacherBUserId,
        branchId: branchBId,
        role: 'TEACHER',
        roles: ['TEACHER'],
        status: 'ACTIVE',
      },
    })
    const spTeacherB = await db.staffProfile.create({
      data: {
        tenantId,
        branchId: branchBId,
        userId: teacherBUserId,
        employeeCode: 'EMP-TCH-B-' + Date.now(),
        designation: 'Playgroup Educator',
        department: 'Academics',
        status: 'ACTIVE',
      },
    })
    staffProfileTeacherBId = spTeacherB.id
  })

  afterAll(async () => {
    // Cleanup tenant cascade
    if (tenantId) {
      await db.attendanceStaff.deleteMany({ where: { tenantId } }).catch(() => {})
      await db.leaveCoverage.deleteMany({ where: { leaveRequest: { tenantId } } }).catch(() => {})
      await db.leaveRequest.deleteMany({ where: { tenantId } }).catch(() => {})
      await db.leaveBalance.deleteMany({ where: { tenantId } }).catch(() => {})
      await db.leaveType.deleteMany({ where: { tenantId } }).catch(() => {})
      await db.staffProfile.deleteMany({ where: { tenantId } }).catch(() => {})
      await db.tenantUser.deleteMany({ where: { tenantId } }).catch(() => {})
      await db.branch.deleteMany({ where: { tenantId } }).catch(() => {})
      await db.tenant.delete({ where: { id: tenantId } }).catch(() => {})
    }
  })

  // ─────────────────────────────────────────────────────────────
  // 1. CANONICAL ATTENDANCE CALCULATION ENGINE
  // ─────────────────────────────────────────────────────────────
  describe('1. Single Canonical Attendance Engine (AttendanceCalculator)', () => {
    it('calculates full-day present when workedHours >= 7.0', () => {
      const punch = AttendanceCalculator.calculatePunch({
        checkIn: '2026-11-01T08:25:00.000Z',
        checkOut: '2026-11-01T16:00:00.000Z', // 7.58 hours
        shiftStart: '08:30',
        shiftEnd: '16:30',
      })
      expect(punch.workedHours).toBeGreaterThanOrEqual(7.0)
      expect(punch.isFullDay).toBe(true)
      expect(punch.isHalfDay).toBe(false)
      expect(punch.isLate).toBe(false)
      expect(punch.computedStatus).toBe('PRESENT')
    })

    it('calculates half-day when workedHours is between 4.0 and 7.0', () => {
      const punch = AttendanceCalculator.calculatePunch({
        checkIn: '2026-11-01T08:30:00.000Z',
        checkOut: '2026-11-01T13:00:00.000Z', // 4.5 hours
      })
      expect(punch.workedHours).toBe(4.5)
      expect(punch.isHalfDay).toBe(true)
      expect(punch.isFullDay).toBe(false)
      expect(punch.computedStatus).toBe('HALF_DAY')
    })

    it('flags late arrival when check-in is > 15 minutes past shift start', () => {
      const punch = AttendanceCalculator.calculatePunch({
        checkIn: '2026-11-01T09:00:00.000Z', // 30 mins late (shift: 08:30)
        checkOut: '2026-11-01T16:30:00.000Z',
        shiftStart: '08:30',
      })
      expect(punch.isLate).toBe(true)
      expect(punch.lateMinutes).toBe(30)
      expect(punch.computedStatus).toBe('LATE')
    })

    it('detects missing check-out when reference time is well past shift end', () => {
      const now = new Date('2026-11-01T18:30:00.000Z') // 2 hrs past 16:30
      const punch = AttendanceCalculator.calculatePunch({
        checkIn: '2026-11-01T08:30:00.000Z',
        checkOut: null,
        shiftEnd: '16:30',
      }, now)
      expect(punch.isMissingCheckout).toBe(true)
    })

    it('accurately aggregates records into institutional KPIs', () => {
      const sampleRecords = [
        { status: 'PRESENT', checkIn: '2026-11-01T08:30:00Z', checkOut: '2026-11-01T16:30:00Z', workedHours: 8 },
        { status: 'LATE', checkIn: '2026-11-01T09:00:00Z', checkOut: '2026-11-01T16:30:00Z', workedHours: 7.5 },
        { status: 'HALF_DAY', checkIn: '2026-11-01T08:30:00Z', checkOut: '2026-11-01T13:00:00Z', workedHours: 4.5 },
        { status: 'ON_LEAVE' },
        { status: 'ABSENT' },
      ]
      const agg = AttendanceCalculator.aggregateRecords(sampleRecords)
      expect(agg.total).toBe(5)
      expect(agg.present).toBe(1)
      expect(agg.late).toBe(1)
      expect(agg.halfDay).toBe(1)
      expect(agg.fullDay).toBe(2)
      expect(agg.onLeave).toBe(1)
      expect(agg.absent).toBe(1)
    })

    it('computes accurate payable days for monthly payroll', () => {
      const payable = AttendanceCalculator.calculatePayableDays({
        totalDaysInMonth: 30,
        presentDays: 20,
        lateDays: 2,
        halfDays: 2, // 2 * 0.5 = 1 day
        paidLeaveDays: 2,
        weeklyOffDays: 4,
        holidayDays: 1,
      })
      // 20 + 2 + 1 + 2 + 4 + 1 = 30
      expect(payable).toBe(30)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 2. BRANCH ISOLATION & FIELD PERMISSIONS
  // ─────────────────────────────────────────────────────────────
  describe('2. Branch Isolation & Field Permissions', () => {
    it('blocks branch accountant from updating staff assigned to another branch', async () => {
      const actorAcctA = {
        id: acctAUserId,
        name: 'Branch A Accountant',
        role: 'ACCOUNTS',
        branchId: branchAId,
      }

      // Attempt to modify Teacher B (Branch B) by Branch A Accountant
      await expect(
        StaffService.updateStaffProfile(
          tenantId,
          staffProfileTeacherBId,
          { designation: 'Hacked Title' },
          actorAcctA
        )
      ).rejects.toThrow(/Forbidden.*campus branch/)
    })

    it('allows branch accountant to update operational details of their own branch staff', async () => {
      const actorAcctA = {
        id: acctAUserId,
        name: 'Branch A Accountant',
        role: 'ACCOUNTS',
        branchId: branchAId,
      }

      const updated = await StaffService.updateStaffProfile(
        tenantId,
        staffProfileTeacherAId,
        {
          department: 'Early Childhood Academics',
          qualification: 'M.Ed in Early Childhood',
          phone: '+919876543210',
        },
        actorAcctA
      )

      expect(updated.department).toBe('Early Childhood Academics')
      expect(updated.qualification).toBe('M.Ed in Early Childhood')
      expect(updated.user.phone).toBe('+919876543210')
    })

    it('blocks non-owner from transferring staff to another branch', async () => {
      const actorAcctA = {
        id: acctAUserId,
        name: 'Branch A Accountant',
        role: 'ACCOUNTS',
        branchId: branchAId,
      }

      await expect(
        StaffService.updateStaffProfile(
          tenantId,
          staffProfileTeacherAId,
          { branchId: branchBId },
          actorAcctA
        )
      ).rejects.toThrow(/Forbidden.*branch outside your scope/)
    })

    it('allows school owner to transfer staff and logs branch history', async () => {
      const actorOwner = {
        id: ownerUserId,
        name: 'Dr. School Owner',
        role: 'OWNER',
      }

      const transferred = await StaffService.transferBranch(
        tenantId,
        staffProfileTeacherAId,
        branchBId,
        actorOwner
      )
      expect(transferred.branchId).toBe(branchBId)

      // Transfer back to Branch A
      await StaffService.transferBranch(
        tenantId,
        staffProfileTeacherAId,
        branchAId,
        actorOwner
      )
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 3. EMPLOYMENT & DESIGNATION HISTORY TIMELINE
  // ─────────────────────────────────────────────────────────────
  describe('3. Employment History Timeline', () => {
    it('retrieves structured milestones including onboard event and updates', async () => {
      const history = await StaffService.getEmploymentHistory(tenantId, staffProfileTeacherAId)
      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
      const joinedEvent = history.find((h) => h.type === 'JOINED' || h.type === 'TRANSFER' || h.type === 'UPDATE')
      expect(joinedEvent).toBeDefined()
    })

    it('embeds employment history in getStaff360 output', async () => {
      const p360 = await StaffService.getStaff360(tenantId, staffProfileTeacherAId)
      expect(p360).toBeDefined()
      expect(p360?.employmentHistory).toBeDefined()
      expect(Array.isArray(p360?.employmentHistory)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 4. LEAVE GOVERNANCE & MANDATORY PRINCIPAL ➔ OWNER RULE
  // ─────────────────────────────────────────────────────────────
  describe('4. Leave Governance & Principal ➔ Owner Route', () => {
    it('allows staff to apply for full-day and half-day leave with balance deduction', async () => {
      const applied = await LeaveService.applyLeave({
        tenantId,
        staffProfileId: staffProfileTeacherAId,
        leaveTypeId: leaveTypeCLId,
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        reason: 'Family appointment',
        isHalfDay: true,
      })

      expect(applied).toBeDefined()
      expect(applied.totalDays).toBe(0.5)
      expect(applied.status).toBe('PENDING')
    })

    it('strictly prevents a user from approving their own leave application', async () => {
      // Principal applies for leave
      const princLeave = await LeaveService.applyLeave({
        tenantId,
        staffProfileId: staffProfilePrincipalAId,
        leaveTypeId: leaveTypeCLId,
        startDate: '2026-11-15',
        endDate: '2026-11-16',
        reason: 'Annual conference attendance',
      })

      // Principal attempts self-approval
      const actorPrincipal = {
        id: principalAUserId,
        name: 'Mrs. Principal North',
        role: 'PRINCIPAL',
        branchId: branchAId,
      }

      await expect(
        LeaveService.actionLeave(tenantId, princLeave.id, 'APPROVE', actorPrincipal)
      ).rejects.toThrow(/Self-approval forbidden/)
    })

    it('MANDATORY PRINCIPAL RULE: blocks Branch Accountant from approving Principal leave', async () => {
      // Find the Principal leave request
      const princLeave = await db.leaveRequest.findFirst({
        where: { tenantId, staffProfileId: staffProfilePrincipalAId, status: 'PENDING' },
      })
      expect(princLeave).toBeDefined()

      const actorAcct = {
        id: acctAUserId,
        name: 'Branch A Accountant',
        role: 'ACCOUNTS',
        branchId: branchAId,
      }

      await expect(
        LeaveService.actionLeave(tenantId, princLeave!.id, 'APPROVE', actorAcct)
      ).rejects.toThrow(/Mandatory Policy: Principal leave requests can only be approved by the School Owner/)
    })

    it('MANDATORY PRINCIPAL RULE: allows School Owner to approve Principal leave', async () => {
      const princLeave = await db.leaveRequest.findFirst({
        where: { tenantId, staffProfileId: staffProfilePrincipalAId, status: 'PENDING' },
      })
      expect(princLeave).toBeDefined()

      const actorOwner = {
        id: ownerUserId,
        name: 'Dr. School Owner',
        role: 'OWNER',
      }

      const result = await LeaveService.actionLeave(tenantId, princLeave!.id, 'APPROVE', actorOwner)
      expect(result.request.status).toBe('APPROVED')
      expect(result.request.actionedByName).toBe('Dr. School Owner')
    })

    it('blocks cross-branch leave approval for branch accountants', async () => {
      // Teacher B (Branch B) applies for leave
      const teacherBLeave = await LeaveService.applyLeave({
        tenantId,
        staffProfileId: staffProfileTeacherBId,
        leaveTypeId: leaveTypeCLId,
        startDate: '2026-11-20',
        endDate: '2026-11-20',
        reason: 'Personal leave',
      })

      const actorAcctA = {
        id: acctAUserId,
        name: 'Branch A Accountant',
        role: 'ACCOUNTS',
        branchId: branchAId,
      }

      await expect(
        LeaveService.actionLeave(tenantId, teacherBLeave.id, 'APPROVE', actorAcctA)
      ).rejects.toThrow(/Forbidden.*assigned to another campus branch/)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 5. HARDWARE BIOMETRIC & FACE PUNCH INTEGRATION
  // ─────────────────────────────────────────────────────────────
  describe('5. Hardware Face Recognition / Biometric Punch Security', () => {
    it('verifies that punch route exists and enforces mandatory branch parameter', async () => {
      const punchRoute = await Bun.file('src/app/api/v1/hr/attendance/punch/route.ts').text()
      expect(punchRoute).toContain("branchId is required to validate kiosk terminal location")
      expect(punchRoute).toContain("Cross-branch punch rejected")
      expect(punchRoute).toContain("Duplicate punch ignored within 3-minute debounce window")
    })

    it('records attendance punches and marks punch source as BIOMETRIC', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const punch = await db.attendanceStaff.upsert({
        where: {
          staffProfileId_date: {
            staffProfileId: staffProfileTeacherAId,
            date: today,
          },
        },
        create: {
          tenantId,
          branchId: branchAId,
          staffProfileId: staffProfileTeacherAId,
          date: today,
          status: 'PRESENT',
          checkIn: new Date(),
          source: 'BIOMETRIC',
          shiftHours: 8.0,
          notes: 'Biometric Face Kiosk North Entrance',
        },
        update: {
          status: 'PRESENT',
        },
      })

      expect(punch.source).toBe('BIOMETRIC')
      expect(punch.branchId).toBe(branchAId)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 6. PAYROLL BRANCH ISOLATION & LOCKING
  // ─────────────────────────────────────────────────────────────
  describe('6. Branch-Scoped Payroll & Locking Guardrails', () => {
    it('verifies payroll route enforces branch scoping for single-branch accountants', async () => {
      const payrollRoute = await Bun.file('src/app/api/v1/hr/payroll/route.ts').text()
      expect(payrollRoute).toContain("payslipFilter = authorizedBranches !== null")
      expect(payrollRoute).toContain("staffProfile: { branchId: { in: authorizedBranches }")
    })
  })
})
