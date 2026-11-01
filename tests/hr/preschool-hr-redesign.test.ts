import { describe, it, expect } from 'bun:test'
import { getHrNavConfig, LEGACY_HR_NAV_ITEMS } from '@/components/preone/module-navigation.config'
import type { HRTabKey, HRPrimarySection } from '@/components/hr/types'

describe('PRE1-HR-PRESCHOOL-SIMPLIFICATION-REDESIGN-001: Complete Preschool HR Simplification & Architecture Verification', () => {
  // ── 1. Navigation Architecture & Normalization ──
  describe('1. Six-Section Navigation Architecture', () => {
    it('verifies getHrNavConfig returns exactly the 6 primary preschool sections', () => {
      const navItems = getHrNavConfig()
      expect(navItems).toHaveLength(6)

      const ids = navItems.map((item) => item.id)
      expect(ids).toEqual(['overview', 'staff', 'attendance', 'leave', 'payroll', 'reports'])

      const labels = navItems.map((item) => item.label)
      expect(labels).toEqual(['Overview', 'Staff', 'Attendance', 'Leave', 'Payroll', 'Reports'])
    })

    it('attaches pending badge to the Leave section when pending requests exist', () => {
      const navWithBadge = getHrNavConfig({ pendingRequestsCount: 5 })
      const leaveItem = navWithBadge.find((item) => item.id === 'leave')
      expect(leaveItem).toBeDefined()
      expect(leaveItem?.badge).toBe(5)
      expect(leaveItem?.badgeVariant).toBe('warning')
    })

    it('preserves legacy tab identifiers for deep-link and test backwards compatibility', () => {
      const legacyIds = LEGACY_HR_NAV_ITEMS.map((item) => item.id)
      expect(legacyIds).toContain('dashboard')
      expect(legacyIds).toContain('employees')
      expect(legacyIds).toContain('schedule')
      expect(legacyIds).toContain('payroll')
      expect(legacyIds).toContain('performance')
      expect(legacyIds).toContain('training')
      expect(legacyIds).toContain('requests')
      expect(legacyIds).toContain('reports')
    })
  })

  // ── 2. Page Controller & Legacy URL Normalization ──
  describe('2. Controller Tab Normalization & Backward Compatibility', () => {
    it('verifies page.tsx normalizes legacy tabs into the primary 6 sections', async () => {
      const pageFile = await Bun.file('src/app/app/hr/page.tsx').text()

      // normalizeTab function must map legacy routes
      expect(pageFile).toContain("if (raw === 'dashboard') return 'overview'")
      expect(pageFile).toContain("if (raw === 'employees') return 'staff'")
      expect(pageFile).toContain("if (raw === 'schedule' || raw === 'training' || raw === 'performance') return 'staff'")
      expect(pageFile).toContain("if (raw === 'requests') return 'leave'")
    })

    it('verifies page.tsx renders all 6 primary section components in <main>', async () => {
      const pageFile = await Bun.file('src/app/app/hr/page.tsx').text()

      // 1. Overview
      expect(pageFile).toContain("tab === 'overview'")
      expect(pageFile).toContain('<HRDashboardTab')

      // 2. Staff
      expect(pageFile).toContain("tab === 'staff'")
      expect(pageFile).toContain('<HREmployeesTab')

      // 3. Attendance
      expect(pageFile).toContain("tab === 'attendance'")
      expect(pageFile).toContain('<HRAttendanceTab')

      // 4. Leave
      expect(pageFile).toContain("tab === 'leave'")
      expect(pageFile).toContain('<HRLeaveTab')

      // 5. Payroll
      expect(pageFile).toContain("tab === 'payroll'")
      expect(pageFile).toContain('<HRPayrollTab')

      // 6. Reports
      expect(pageFile).toContain("tab === 'reports'")
      expect(pageFile).toContain('<HRReportsTab')
    })
  })

  // ── 3. Overview Section & Pending Actions Hub ──
  describe('3. Overview Section & Pending Actions Hub', () => {
    it('verifies HRDashboardTab displays the Action Items Requiring Attention hub', async () => {
      const overviewFile = await Bun.file('src/components/hr/HRDashboardTab.tsx').text()

      // Must have Pending Actions Hub
      expect(overviewFile).toContain('Action Items Requiring Attention')
      expect(overviewFile).toContain('Direct shortcuts to pending approvals')

      // Must have direct action links
      expect(overviewFile).toContain("onNavigateTab('leave')")
      expect(overviewFile).toContain("onNavigateTab('attendance')")
      expect(overviewFile).toContain("onNavigateTab('payroll')")
      expect(overviewFile).toContain("onNavigateTab('staff')")
    })

    it('verifies Overview KPIs link directly to primary sections', async () => {
      const overviewFile = await Bun.file('src/components/hr/HRDashboardTab.tsx').text()

      expect(overviewFile).toContain("tab: 'staff' as HRTabKey")
      expect(overviewFile).toContain("tab: 'attendance' as HRTabKey")
      expect(overviewFile).toContain("tab: 'leave' as HRTabKey")
      expect(overviewFile).toContain("tab: 'payroll' as HRTabKey")
    })
  })

  // ── 4. Staff Section & Sub-View Consolidation ──
  describe('4. Staff Section Sub-Views & Staff 360 Drawer', () => {
    it('verifies HREmployeesTab incorporates secondary views without cluttering primary nav', async () => {
      const staffFile = await Bun.file('src/components/hr/HREmployeesTab.tsx').text()

      // Sub-views bar
      expect(staffFile).toContain('Staff Directory')
      expect(staffFile).toContain('Classroom Allocations')
      expect(staffFile).toContain('Compliance & Safety')
      expect(staffFile).toContain('Appraisals & Reviews')

      // Sub-view component integrations
      expect(staffFile).toContain('<HRScheduleTab')
      expect(staffFile).toContain('<HRTrainingTab')
      expect(staffFile).toContain('<HRPerformanceTab')
    })

    it('verifies Staff360Drawer has been simplified to exactly 5 clean tabs', async () => {
      const drawerFile = await Bun.file('src/components/hr/Staff360Drawer.tsx').text()

      // Type must be 5 tabs
      expect(drawerFile).toContain("type SubTab = 'overview' | 'employment' | 'salary' | 'attendance' | 'documents'")

      // Sub-navigation buttons
      expect(drawerFile).toContain("{ key: 'overview', label: 'Overview' }")
      expect(drawerFile).toContain("{ key: 'employment', label: 'Employment' }")
      expect(drawerFile).toContain("{ key: 'salary', label: 'Salary & Bank' }")
      expect(drawerFile).toContain("{ key: 'attendance', label: 'Attendance & Leaves' }")
      expect(drawerFile).toContain("{ key: 'documents', label: 'Documents & Compliance' }")
    })

    it('verifies sensitive PII (Aadhaar, PAN, Bank Details) is masked with lock badges in Staff 360', async () => {
      const drawerFile = await Bun.file('src/components/hr/Staff360Drawer.tsx').text()

      // Masked Aadhaar
      expect(drawerFile).toContain("•••• •••• ${staff.aadhaarNumber.slice(-4)}")

      // Masked Account Number
      expect(drawerFile).toContain("accountNumberMasked || '••••••••'")

      // Lock icon used on confidential fields
      expect(drawerFile).toContain('<Lock size={11}')
    })
  })

  // ── 5. Preschool Attendance & Leave Integrations ──
  describe('5. Daily Attendance & Leave with Classroom Educator Impact', () => {
    it('verifies HRLeaveTab surfaces classroom coverage impact and substitute routing', async () => {
      const leaveFile = await Bun.file('src/components/hr/HRLeaveTab.tsx').text()

      // Classroom coverage header & badge
      expect(leaveFile).toContain("header: 'Classroom Coverage'")
      expect(leaveFile).toContain('row.coverages[0].classroom.name')
      expect(leaveFile).toContain('Approve & Route Substitute Coverage')
    })

    it('verifies HRAttendanceTab integrates GlobalDatePicker and punch correction', async () => {
      const attFile = await Bun.file('src/components/hr/HRAttendanceTab.tsx').text()

      // Must allow opening correction modal
      expect(attFile).toContain('onOpenCorrection')
      expect(attFile).toContain('Attendance Correction')
      expect(attFile).toContain('<GlobalDatePicker')
    })
  })

  // ── 6. Payroll & Financial Integrity ──
  describe('6. Accountant-Friendly Payroll Pipeline & Locking', () => {
    it('verifies HRPayrollTab supports the complete lifecycle pipeline', async () => {
      const payrollFile = await Bun.file('src/components/hr/HRPayrollTab.tsx').text()

      // Cycle actions
      expect(payrollFile).toContain('onOpenProcessPayroll')
      expect(payrollFile).toContain('onOpenDisburse')
      expect(payrollFile).toContain('onExportBankFile')
    })
  })
})
