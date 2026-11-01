# PreOne Parent Portal — Complete Student-Centric Access Implementation Report
**Document ID:** `PRE1-PARENT-PORTAL-STUDENT-CENTRIC-ACCESS-001-REPORT`  
**Initiative:** Global Parent Portal Student-Centric Role Access, Navigation & Security Hardening  
**Target Roles:** `PARENT`, `GUARDIAN`  
**Execution Date:** 2026-11-01  
**Baseline Git SHA:** `267511b0ed8f5251cd90498708647e467a8a97bc`  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

Prior to this initiative, parents logging into PreOne were constrained to only 5 navigation destinations (`Dashboard`, `Fees`, `Finance`, `Transport`, `Announcements`). Even within several of those modules, navigation was fragmented, data was incomplete, and direct views for student identity, academics, daily care logs, issued inventory, and academic reports were missing or inaccessible.

This implementation successfully modernizes the PreOne Parent Portal into a complete, secure, student-centric experience across all **10 canonical modules**, backed by server-side relationship validation, defense-in-depth authorization against Insecure Direct Object References (IDOR), and reactive single-child/multi-child profile context switching.

---

## 2. Updated Role-Based Access Control (RBAC) Matrix

### 2.1 Capability Catalog Enhancements (`src/lib/auth/rbac-engine.ts`)
The following student-linked permissions were established in `CAPABILITY_CATALOG`:
- `students:read-linked`: View linked child/children profiles, classroom allocations, teacher details, and authorized pickups.
- `academics:read-linked`: Access child's learning goals, activity mastery stages, pre-work, and interactive learning library.
- `inventory:read-linked`: Inspect student-assigned books, kits, and uniforms with return status tracking.
- `reports:read-linked`: View and download published report cards, certificates, and term evaluations.
- `attendance:read-linked`: View attendance records, daily check-in/out timestamps, and absence remarks.
- `diary:read-linked`: View daily routine milestones (meals, naps, diaper/toilet, mood) and published teacher observations.
- `milestones:read-linked`: Track developmental milestones and growth tracking telemetry.
- `documents:read-linked`: Access published academic, medical, and administrative documents.
- `pickup:read-linked`: View authorized guardian pickup roster.
- `pickup:verify-linked`: View gate verification PIN and authorized QR status for pickup security.

### 2.2 Permissions Assignment (`src/lib/auth.ts`)
| Role | Capabilities Granted | Capabilities Strictly Denied |
| :--- | :--- | :--- |
| `PARENT` | `timeline:read`, `attendance:read-linked`, `diary:read-linked`, `milestones:read-linked`, `documents:read-linked`, `pickup:read-linked`, `pickup:verify-linked`, `announcements:read`, `transport:read`, `fees:read`, `payments:create`, `students:read-linked`, `academics:read-linked`, `inventory:read-linked`, `reports:read-linked` | Administrative CRUD, `users:*`, `staff:*`, `settings:*`, `academics:write`, `inventory:write`, `reports:write`, `students:write` |
| `GUARDIAN` | Same read capabilities as `PARENT` scoped to authorized wards | Administrative CRUD, billing payments (unless designated primary financial guarantor) |

---

## 3. Navigation Architecture Parity (`src/lib/nav.ts`)

`navForRole('PARENT')` now emits the complete set of 10 canonical modules with fallback permission sets:

```typescript
// Example from src/lib/nav.ts
{ name: 'Dashboard', href: '/app/dashboard', icon: 'LayoutDashboard', perms: ['timeline:read'] },
{ name: 'Students', href: '/app/students', icon: 'GraduationCap', perms: ['students:read', 'students:read-linked'] },
{ name: 'PreO Learning', href: '/app/learning', icon: 'BookOpen', perms: ['academics:read', 'academics:read-linked'] },
{ name: 'Daily Diary', href: '/app/daily-diary', icon: 'CalendarDays', perms: ['attendance:read', 'diary:read-linked', 'timeline:read'] },
{ name: 'Announcements', href: '/app/communication', icon: 'Bell', perms: ['announcements:read'] },
{ name: 'Inventory', href: '/app/inventory', icon: 'Package', perms: ['inventory:read', 'inventory:read-linked'] },
{ name: 'Fees', href: '/app/fees', icon: 'CreditCard', perms: ['fees:read'] },
{ name: 'Finance', href: '/app/finance', icon: 'DollarSign', perms: ['finance:read', 'fees:read'] },
{ name: 'Transport', href: '/app/transport', icon: 'Bus', perms: ['transport:read'] },
{ name: 'Reports', href: '/app/reports', icon: 'FileText', perms: ['reports:read', 'reports:read-linked'] },
```

---

## 4. Module-by-Module Delivery & Implementation Details

### Module 1: Dashboard (`/app/dashboard`)
- **Route:** `src/app/app/dashboard/ParentToday.tsx`
- **Enhancements:**
  - Integrated persistent student selector via `src/lib/parent/use-parent-students.ts` and `ParentStudentSelector`.
  - Added real-time **Transport Summary Snapshot** (`/api/v1/transport/my-children`) displaying route name, vehicle number, driver contact, and current dispatch status.
  - Added **Recent Announcements Snapshot** (`/api/v1/announcements?limit=2`) displaying priority notices directly on the daily hub.
  - Live routine telemetry (meals, naps, bathroom) and quick links to Learning and Fee schedules.

### Module 2: Students (`/app/students`)
- **Route:** `src/app/app/students/page.tsx` $\rightarrow$ `src/components/parent/ParentStudentsView.tsx`
- **Features:**
  - Multi-child switcher tab rail with active badge and instant reactivity.
  - Complete identity profile: Admission No, DOB, Blood Group, Program, Classroom, and Branch.
  - Primary Class Teacher card with designation and communication contact.
  - Health, allergies, and emergency medical directives card.
  - Authorized Pickup Roster with relationship indicators and gate authorization badges.
  - Zero staff-only controls: Edit, delete, enroll, and administrative status actions are suppressed.

### Module 3: PreO Learning / Academics (`/app/learning`)
- **Route:** `src/app/app/learning/page.tsx` $\rightarrow$ `src/components/parent/ParentLearningView.tsx`
- **Backend API:** `src/app/api/v1/academics/students/[studentId]/progress/route.ts` & `src/app/api/v1/academics/activities/route.ts`
- **Features:**
  - **Tab 1: My Child's Activities & Goals**: Displays developmental milestones across Learning Areas (Literacy, Numeracy, Motor Skills) with status badges (`Achieved`, `In Progress`, `Emerging`).
  - **Tab 2: PreO Learning Library**: Digital preschool interactive activity cards with thumbnail previews and step-by-step activity launcher for parent-child home engagement.
  - Server-side IDOR defense: Rejects any attempt to view progress of an unlinked student with `403 Forbidden`.

### Module 4: Daily Diary (`/app/daily-diary`)
- **Route:** `src/app/app/daily-diary/page.tsx` $\rightarrow$ `src/components/parent/ParentDailyDiaryView.tsx`
- **Backend API:** `src/app/api/v1/parent/daily-diary/route.ts` & `src/app/api/v1/parent/today/route.ts`
- **Features:**
  - Date picker with single-click navigation (Previous Day, Next Day, Today).
  - Attendance Status Hero: Real-time Check-In / Check-Out timestamps and attendance status badge.
  - Daily Routine Telemetry: Visual feed of Meals & Snacks eaten, Nap duration, Toilet/Diaper logs, and Mood indicators.
  - Classroom Daily Timetable & Schedule.
  - Teacher notes and published developmental observations.

### Module 5: Announcements (`/app/communication`)
- **Route:** `src/app/app/communication/CommunicationClient.tsx`
- **Features:**
  - Parents access broadcast announcements and circulars relevant to their branch and enrolled classrooms.
  - Search and filter by category (Academic, Transport, Event, Emergency).

### Module 6: Inventory (`/app/inventory`)
- **Route:** `src/app/app/inventory/InventoryClient.tsx` $\rightarrow$ `src/components/parent/ParentInventoryView.tsx`
- **Backend API:** `src/app/api/v1/parent/inventory/route.ts`
- **Features:**
  - Dedicated endpoint querying `db.stockIssue` where `studentId` belongs to parent's linked children.
  - Shows student-assigned textbooks, uniform kits, activity stationery, and educational equipment.
  - Tracks status: `ISSUED`, `RETURNED`, `PARTIALLY_RETURNED` with issuance dates and quantities.
  - **Data Minimization:** Strictly strips wholesale unit costs, warehouse storage locations, and vendor metadata from parent payloads.

### Module 7 & 8: Fees & Finance (`/app/fees` & `/app/finance`)
- **Route:** `src/app/app/fees/page.tsx`
- **Features:**
  - Outstanding dues summary, upcoming installments, and fee breakdown by head (Tuition, Transport, Activity).
  - Integrated online payment modal (`/api/v1/payments`) with instant receipt download.
  - Multi-child fee balance switching.

### Module 9: Transport (`/app/transport`)
- **Route:** `src/app/app/transport/TransportClient.tsx`
- **Features:**
  - Automatically activates parent view showing assigned vehicle, route stops, expected pickup/drop times, driver name, and emergency vehicle phone contact.
  - Live transport alert banner for active trips.

### Module 10: Reports (`/app/reports`)
- **Route:** `src/app/app/reports/page.tsx` $\rightarrow$ `src/components/parent/ParentReportsView.tsx`
- **Backend API:** `src/app/api/v1/parent/documents/route.ts` & `src/app/api/v1/academics/report-cards/route.ts`
- **Features:**
  - Consolidated term-wise Report Cards and Progress Dossiers.
  - Issued Certificates of Completion and Event Participation.
  - Integrated `PdfViewerModal` for instant in-browser preview without leaving the portal.
  - Term Attendance Summary & Fee Clearance confirmation badges.

---

## 5. Security & IDOR Defense Architecture

Every parent-facing endpoint enforces strict server-side relationship validation. Frontend-only role gating was rejected:

```typescript
// Canonical Pattern across parent endpoints:
const isLinked = await db.studentGuardian.findFirst({
  where: {
    studentId,
    guardian: {
      userId: session.uid,
      tenantId: session.tenantId,
      deletedAt: null,
    },
  },
  select: { id: true },
})

if (!isLinked) {
  return Errors.forbidden('You are not authorized to view records for this student')
}
```

### Security Defenses Verified:
1. **Cross-Tenant Isolation:** Parents cannot query students belonging to other tenants (returns `403 Forbidden` / `404 Not Found`).
2. **Cross-Family Isolation:** Parents cannot query students within the same tenant if not explicitly linked via `StudentGuardian` (returns `403 Forbidden`).
3. **Data Minimization:** Internal staff remarks, unpublished draft observations, vendor costs, and gate PINs of other guardians are filtered out at the SQL selection level.

---

## 6. Automated Test Results

### 6.1 Parent Student-Centric Access Suite
- **File:** `tests/parent/parent-student-centric-access.test.ts`
- **Result:** **14 / 14 Tests Passing (100%)**
  - Section 1: RBAC Matrix & Navigation Coverage (4/4 passed)
  - Section 2: Student-Assigned Inventory API & Security (2/2 passed)
  - Section 3: Student Learning Progress & Pre-work Authorization (2/2 passed)
  - Section 4: Daily Diary & Reports Relationship Authorization (4/4 passed)
  - Section 5: Multi-Child Support & Relationship Integrity (2/2 passed)

### 6.2 Regression Test Suites
- `tests/dashboard/parent-dashboard-persona.test.tsx`: **18 / 18 Tests Passing (100%)**
- `tests/api/report-cards-parent-audit.test.ts`: **1 / 1 Tests Passing (100%)**
- `tests/security/users-family-branch-isolation-audit.test.ts`: **14 / 14 Tests Passing (100%)**
- `scripts/verify-users-security-negative-e2e.ts`: **28 / 28 Tests Passing (100%)**
- `tests/users`: **123 / 123 Tests Passing (100% across 13 files)**

---

## 7. Files Changed and Created

### Files Created:
1. `docs/audits/PRE1_Parent_Portal_Student_Centric_Access_Baseline.md`
2. `docs/audits/PRE1_Parent_Portal_Student_Centric_Access_Implementation_Report.md`
3. `src/lib/parent/use-parent-students.ts`
4. `src/components/parent/ParentStudentSelector.tsx`
5. `src/components/parent/ParentStudentsView.tsx`
6. `src/components/parent/ParentLearningView.tsx`
7. `src/components/parent/ParentDailyDiaryView.tsx`
8. `src/components/parent/ParentInventoryView.tsx`
9. `src/components/parent/ParentReportsView.tsx`
10. `src/app/api/v1/parent/inventory/route.ts`
11. `tests/parent/parent-student-centric-access.test.ts`

### Files Modified:
1. `src/lib/auth/rbac-engine.ts`
2. `src/lib/auth.ts`
3. `src/lib/nav.ts`
4. `src/app/app/dashboard/ParentToday.tsx`
5. `src/app/app/students/page.tsx`
6. `src/app/app/learning/page.tsx`
7. `src/app/app/daily-diary/page.tsx`
8. `src/app/app/inventory/InventoryClient.tsx`
9. `src/app/app/reports/page.tsx`
10. `src/app/api/v1/academics/students/[studentId]/progress/route.ts`
11. `src/app/api/v1/academics/activities/route.ts`

---

## 8. Git Status & Repository Cleanliness
- **Current Git Branch:** `main`
- **Zero Discards / Zero Resets:** Complied with preflight rule. All uncommitted changes preserved.
- **Database Migrations:** None required. Reused existing Prisma models (`db.studentGuardian`, `db.stockIssue`, `db.studentReportCard`, `db.generatedProfileDocument`).
