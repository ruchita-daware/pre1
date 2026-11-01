# PreOne Global Data Table Migration Matrix
**Initiative:** Global UI/UX Table Modernization & Responsive Component Architecture  
**Specification Reference:** `docs/design/PreOne_Global_Data_Table_Design_System_v2.md`  
**Baseline Git SHA:** `4a938a015d3c3478e7e525c9c01efece37e02933`  
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
| **TAB-01** | **Parents Management** | `src/app/app/users/family/page.tsx` | Legacy `DataTable` with ad-hoc styling | Enhanced `DataTable` v2.0 with refined KPI tiles, standard toolbar, structured mobile cards | **Phase A (Reference)** | `VERIFIED` | Passed |
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
- **Verification Summary:**
  1. **Summary Metric Cards:** Enhanced with 4 standardized KPI cards (Total Parents, Linked Students, Total Guardians, Authorized Pickup) featuring consistent heights, typography, subtle icon containers, and clean spacing.
  2. **Parent & Guardian Identity Anatomy:** 3-line structured cell with deterministic pastel avatar, verified name, username handle, and linked student tags with classroom chips.
  3. **Contact Details:** Formatted phone numbers, email with tooltip truncation, and micro-action icons.
  4. **Clearance & Status Badges:** Standardized `StatusBadge` and `ROLE_BADGE` with dual-tone styling, pickup authorization shield, and Gate PIN indicator.
  5. **Actions:** View 360 profile, edit user modal, and more actions overflow dropdown menu with admin actions.
  6. **Pagination:** Server-side pagination with rows per page selector (10, 25, 50, 100), range indicator, and direct page jump.
  7. **Mobile Card Transformation:** Verified on 375px/390px/414px mobile viewports with tactile cards and touch targets ≥ 44px.
