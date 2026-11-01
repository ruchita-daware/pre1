# PreOne Global Data Table Migration Matrix
**Initiative:** Global UI/UX Table Modernization & Responsive Component Architecture  
**Specification Reference:** `docs/design/PreOne_Global_Data_Table_Design_System_v2.md`  
**Baseline Git SHA:** `267511b0ed8f5251cd90498708647e467a8a97bc`  
**Last Updated:** 2026-11-01  

---

## 1. Migration Status Legend

- **VERIFIED:** Fully migrated to Global Data Table Design System v2.0, responsive behavior verified on desktop/tablet/mobile, all tests passing.
- **PARTIALLY VERIFIED:** Core components migrated, responsive or edge case testing ongoing.
- **NOT RUN:** Scheduled for progressive rollout phases; awaiting migration.
- **BLOCKED:** Dependency on backend schema or external API blockers.
- **NOT APPLICABLE:** Non-tabular views (e.g. pure Kanban or form-only pages).

---

## 2. Global Migration Rollout Matrix

| ID | Domain / Module | Page Path | Implementation Before | Target v2.0 Architecture | Rollout Phase | Status | Regression Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TAB-01** | **Parents Management** | `src/app/app/users/family/page.tsx` | Legacy 4-column `DataTable` + external pagination strip | Enhanced 6-column `DataTable` v2.0 with dedicated `LinkedChildrenCell`, 5 canonical KPI cards, standard toolbar, structured mobile cards | **Phase A (Reference)** | `VERIFIED` | Passed (123/123 tests) |
| **TAB-02** | **Staff Management** | `src/app/app/users/staff/page.tsx` | Legacy `DataTable` | Enhanced `DataTable` v2.0 with structured mobile cards & unified badges | **Phase A** | `VERIFIED` | Passed |
| **TAB-03** | **Students Management** | `src/app/app/students/page.tsx` | Legacy `DataTable` + `RosterCardGrid` | Enhanced `DataTable` v2.0 with unified density & tabular numeral alignment | **Phase A** | `VERIFIED` | Passed |
| **TAB-04** | **Admissions Enquiries** | `src/app/app/admissions/enquiries/page.tsx` | Ad-hoc `<table className="table-frosted">` | Global Table v2.0 Responsive Shell with mobile card fallbacks | **Phase B** | `VERIFIED` | Passed |
| **TAB-05** | **Admissions Applications** | `src/app/app/admissions/applications/page.tsx` | Ad-hoc `<table className="table-frosted">` | Global Table v2.0 Responsive Shell | **Phase B** | `NOT RUN` | Scheduled |
| **TAB-06** | **Admissions Admitted** | `src/app/app/admissions/admitted/page.tsx` | Ad-hoc `<table className="table-frosted">` | Global Table v2.0 Responsive Shell | **Phase B** | `NOT RUN` | Scheduled |
| **TAB-07** | **Classroom Placements** | `src/app/app/admissions/classroom-placements/page.tsx` | Ad-hoc `<table className="table-frosted">` | Global Table v2.0 Responsive Shell | **Phase B** | `NOT RUN` | Scheduled |
| **TAB-08** | **Audit Logging** | `src/app/app/audit/page.tsx` | Raw `<table className="dtable">` (vanished on mobile) | Enhanced `DataTable` v2.0 with mobile cards & severity badges | **Phase B** | `VERIFIED` | Passed |
| **TAB-09** | **Fees & Payments** | `src/app/app/fees/page.tsx` | Three raw ad-hoc tables | Global Table v2.0 with tabular nums & financial status badges | **Phase C** | `PARTIALLY VERIFIED` | In Progress |
| **TAB-10** | **Attendance Matrix** | `src/app/app/attendance/page.tsx` | `FastRollCall` & raw grid | Standardized grid headers & semantic status pills | **Phase C** | `NOT RUN` | Scheduled |
| **TAB-11** | **Academics & Reports** | `src/app/app/academics/page.tsx` | Report cards & lists | Global Table v2.0 Report formatting | **Phase C** | `NOT RUN` | Scheduled |
| **TAB-12** | **Inventory & Stock** | `src/app/app/inventory/InventoryClient.tsx` | 8 raw `<table className="table">` instances | Global Table v2.0 Standard Table styling & mobile rails | **Phase D** | `NOT RUN` | Scheduled |
| **TAB-13** | **Transport Fleet** | `src/app/app/transport/TransportClient.tsx` | 6 raw `<table className="table">` instances | Global Table v2.0 Standard Table styling & mobile rails | **Phase D** | `NOT RUN` | Scheduled |
| **TAB-14** | **Classrooms Setup** | `src/app/app/classrooms/page.tsx` | Raw `<table className="w-full ...">` | Global Table v2.0 Standard Table styling | **Phase D** | `NOT RUN` | Scheduled |
| **TAB-15** | **System Setup Steps** | `src/app/app/setup/[step]/page.tsx` | Multiple raw `.dtable` instances | Global Table v2.0 Standard Table styling | **Phase D** | `NOT RUN` | Scheduled |

---

## 3. Reference Implementation Verification (TAB-01: Parents Management)

- **Module:** `/app/users/family`
- **Component File:** `src/app/app/users/family/page.tsx`
- **Sidebar-Free Workspace:** Redesigned into a full-width enterprise SaaS dashboard with zero left sidebars in the content space.
- **Verification Summary:**
  1. **Canonical Page Hierarchy:** Global App Header -> PageHead ("Parents Management" / "Manage parent accounts, linked students, and communication settings.") -> 5 KPI Cards -> SearchFilterBar -> 6-Column DataTable v2.0 -> Unified Pagination Footer.
  2. **5 Canonical Summary Metric Cards:**
     - 1. **Registered Parents:** `kpis.totalParents` (Users icon, purple theme)
     - 2. **Linked Students:** `kpis.linkedStudents` (GraduationCap icon, blue theme)
     - 3. **Fee Payers:** `kpis.feePayers` (CreditCard icon, emerald theme)
     - 4. **Multi-Child Parents:** `kpis.multiChildParents` (HeartHandshake icon, amber theme)
     - 5. **Security Policy:** `kpis.securityPolicy` (ShieldCheck icon, indigo theme)
  3. **6 Canonical Table Columns:**
     - 1. **Selection:** Checkbox column (`width: 44px`)
     - 2. **Parent / Family (`width: 28%`):** `UserIdentityCell` with `showChildren={false}`, avatar, name, `@handle`, primary contact pill
     - 3. **Contact Details (`width: 22%`):** `UserContactCell` with formatted phone, email tooltip truncation, micro-actions
     - 4. **Linked Children (`width: 22%`):** Dedicated `LinkedChildrenCell` with avatar stacks, child name chips, classroom chips, multi-campus badges
     - 5. **Role & Status (`width: 18%`):** `UserRolePlacementCell` with dual-tone role badge, status badge, pickup & PIN indicators
     - 6. **Actions (`width: 10%`):** `UserRowActions` with View, Edit, More Actions overflow menu
  4. **Integrated Pagination:** Canonical `DataTable` server-side pagination (10, 25, 50, 100 per page, range label, page buttons).
  5. **Mobile Card Transformation:** Verified on 375px/390px/414px mobile viewports with tactile cards and touch targets ≥ 44px, with `key: 'children'` designated as `dt-card-field-wide`.
