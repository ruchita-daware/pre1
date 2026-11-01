# PreOne Global Data Table Audit & Inventory
**Initiative:** Global UI/UX Table Modernization & Responsive Component Architecture  
**Task ID:** `PRE1-UI-TABLE-001`  
**Git Baseline:** SHA `4a938a015d3c3478e7e525c9c01efece37e02933` (Branch: `main`)  
**Timestamp:** 2026-11-01  
**Scope:** Repository-wide audit of all tables, data grids, record lists, and management views.

---

## 1. Executive Summary

PreOne features a hybrid data presentation architecture developed across several iterative releases. While a core `DataTable` component (`src/components/preone/DataTable.tsx`) exists alongside specialized components like `ZenTable` (`src/components/preone/ZenTable.tsx`) and `SpreadsheetQuickGrid`, several modules continue to use ad-hoc raw HTML `<table>` implementations with inconsistent styling, missing mobile adaptations, fragmented badge systems, and divergent pagination controls.

This audit establishes the baseline inventory, categorizes all table instances across 15 functional domains, assesses their UX/architectural challenges, and defines the progressive migration strategy to PreOne Global Data Table Design System v2.0.

---

## 2. Reusable Component Inventory (Current State)

| Component Path | Current Capabilities | Limitations / Inconsistencies |
| :--- | :--- | :--- |
| `src/components/preone/DataTable.tsx` | - Client & server sorting<br>- Client & server pagination<br>- Selection & bulk actions<br>- Column visibility toggle<br>- Density toggles (`cozy` vs `compact`)<br>- Mobile card fallback `<div className="dt-mobile-cards">`<br>- CSV export with BOM | - Desktop row height variance (56px-70px)<br>- Mobile card displays raw cell values if renderers return plain strings<br>- Toolbar search is coupled to small inputs without badge counters<br>- Hardcoded CSS classes rely on legacy CSS variables |
| `src/components/preone/ZenTable.tsx` | - Deterministic pastel avatar palette<br>- `StudentIdentityChip`<br>- Dual-tone status pills<br>- Card grid transformations | - Tightly coupled to student roster workflows<br>- Not generalized for generic record tables |
| `src/components/preone/SearchFilterBar.tsx` | - Global debounced search<br>- Filter dropdown anchors<br>- Quick chips | - Duplicates search bar inside `DataTable.tsx` toolbar<br>- Some pages use both simultaneously |
| `src/components/preone/ui.tsx` (`StatusPill` & `StatusBadge`) | - 40+ semantic status mappings with dot, pulse, and variant tokens | - Several pages bypass this and write raw `<span className="badge b-purple">`<br>- Role badges are defined in `src/components/users/types.ts` separately from status pills |
| `src/components/users/UserIdentityCell.tsx` | - 3-line structured identity anatomy (Name, Handle/Role, Context/Students) | - Specialized for Users module; needs generic `RecordIdentityCell` pattern |
| `src/components/users/UserContactCell.tsx` | - Phone with format normalization, email with tooltip, micro-action strip | - Specialized for Users module; needs global contact cell abstraction |
| `src/components/users/UserRolePlacementCell.tsx` | - Dual badge (Role + Lifecycle) with pickup authorization & Gate PIN | - Staff vs Parent vs Guardian logic embedded inside cell |

---

## 3. Comprehensive Repository-Wide Table Inventory

### 3.1 Domain 1: Users & Family Management (Primary Reference)
* **Page:** `/app/users/family` (`src/app/app/users/family/page.tsx`)
  - **Classification:** `ADVANCED_DATA_TABLE`
  - **Component:** `DataTable` (`src/components/preone/DataTable.tsx`)
  - **Columns:**
    1. Selection Checkbox (`dt-col-check`, 38px)
    2. Parent Identity / Guardian Identity (`UserIdentityCell`, 40%)
    3. Contact Details (`UserContactCell`, 26%)
    4. Clearance / Role & Status (`UserRolePlacementCell`, 22%)
    5. Row Actions (`UserRowActions` with View, Edit, DropdownMenu, 12%)
  - **Search & Filter:** Search filter bar (debounced text search, Campus/Branch filter, Status filter, PARENTS vs GUARDIANS tab).
  - **Sorting:** Server & client sortable on `name` and `role`.
  - **Pagination:** Server-side pagination (default 25 rows/page, options: 10, 25, 50, 100).
  - **Bulk Actions:** Multi-select, select all on page, bulk field update modal, export selected.
  - **Permissions:** `users:read`, `users:write`, `users:delete`, branch-level restrictions.
  - **Responsive Behavior:** Converts to stacked `.dt-card` on screens <760px.
  - **Known UX Issues:**
    - Metric KPI cards have high vertical footprint.
    - Household view vs Table view toggle lacks smooth layout transitions.
    - In mobile card view, secondary details can feel dense.
  - **Migration Priority:** `REFERENCE_TARGET` (Phase A - Priority 1).

### 3.2 Domain 2: Staff Management
* **Page:** `/app/users/staff` (`src/app/app/users/staff/page.tsx`)
  - **Classification:** `ADVANCED_DATA_TABLE`
  - **Component:** `DataTable` (`src/components/preone/DataTable.tsx`)
  - **Columns:** Staff Identity (40%), Contact (26%), Role & Placement (22%), Actions (12%).
  - **Search & Filter:** Role tabs, campus branch filter, employment status filter, invitations sub-tab.
  - **Sorting & Pagination:** Server-side (25 per page).
  - **Bulk Actions:** Status change, branch assignment, export CSV.
  - **Responsive Behavior:** Mobile cards via `dt-mobile-cards`.
  - **Migration Priority:** Phase A - Priority 2.

### 3.3 Domain 3: Students Management
* **Page:** `/app/students` (`src/app/app/students/page.tsx`)
  - **Classification:** `ADVANCED_DATA_TABLE` & `SPECIALIZED_GRID`
  - **Component:** `DataTable` with dual view switcher (`Table` vs `RosterCardGrid`).
  - **Columns:** Student Identity (Photo, Name, Adm #), Classroom / Division, Parent/Guardian, Status & Attendance, Actions.
  - **Search & Filter:** Search, Branch, Classroom, Status, Fee status.
  - **Sorting & Pagination:** Server-side pagination.
  - **Migration Priority:** Phase A - Priority 3.

### 3.4 Domain 4: Admissions Sub-modules
* **Page:** `/app/admissions/enquiries` (`src/app/app/admissions/enquiries/page.tsx`)
  - **Classification:** `STANDARD_TABLE` (Ad-hoc)
  - **Current Implementation:** Raw `<table className="table-frosted">`.
  - **Columns:** Ref #, Branch, Parent/Contact, Child, Program, Source, Date, Next Reminder, Status, Actions.
  - **Known UX Issues:** No mobile card transformation; causes horizontal clipping on small screens.
  - **Migration Priority:** Phase B - Priority 1.
* **Page:** `/app/admissions/applications` (`src/app/app/admissions/applications/page.tsx`)
  - **Classification:** `STANDARD_TABLE` (Ad-hoc)
  - **Current Implementation:** Raw `<table className="table-frosted">`.
  - **Migration Priority:** Phase B - Priority 2.
* **Page:** `/app/admissions/admitted` (`src/app/app/admissions/admitted/page.tsx`)
  - **Classification:** `STANDARD_TABLE` (Ad-hoc)
  - **Migration Priority:** Phase B - Priority 3.
* **Page:** `/app/admissions/classroom-placements` (`src/app/app/admissions/classroom-placements/page.tsx`)
  - **Classification:** `STANDARD_TABLE` (Ad-hoc)
  - **Migration Priority:** Phase B - Priority 4.
* **Page:** `/app/admissions/reports` (`src/app/app/admissions/reports/page.tsx`)
  - **Classification:** `REPORT_TABLE`
  - **Migration Priority:** Phase B - Priority 5.

### 3.5 Domain 5: Audit & Security Logging
* **Page:** `/app/audit` (`src/app/app/audit/page.tsx`)
  - **Classification:** `STANDARD_TABLE` (Raw `.dtable`)
  - **Current Implementation:** `<table className="dtable w-full min-w-[880px]">`.
  - **Known UX Issues:** Hidden completely on screens <760px because `.dtable` has `display: none !important` without `.dt-mobile-cards` fallback.
  - **Migration Priority:** Phase B - Priority 6.

### 3.6 Domain 6: Fees & Financial Management
* **Page:** `/app/fees` (`src/app/app/fees/page.tsx`)
  - **Classification:** `ADVANCED_DATA_TABLE` (Ad-hoc tables)
  - **Current Implementation:** Three distinct raw tables (Fee Schedules, Invoices, Transactions).
  - **Columns:** Student Name, Admission #, Campus/Class, Fee Item & Period, Due Date, Amount Due, Paid, Remaining, Status, Actions.
  - **Known UX Issues:** Inconsistent row heights, lack of unified bulk selection, currency values lack monospace tabular alignment.
  - **Migration Priority:** Phase C - Priority 1.

### 3.7 Domain 7: Attendance Management
* **Page:** `/app/attendance` (`src/app/app/attendance/page.tsx`)
  - **Classification:** `SPECIALIZED_GRID`
  - **Current Implementation:** Roster grid with quick roll-call toggles (`FastRollCall`).
  - **Migration Priority:** Phase C - Priority 2.

### 3.8 Domain 8: Observations & Academics
* **Page:** `/app/learning`, `/app/preo-learning`, `/app/academics`
  - **Classification:** `RESPONSIVE_CARD_LIST` & `SIMPLE_LIST`
  - **Migration Priority:** Phase C - Priority 3.

### 3.9 Domain 9: Inventory & Procurement
* **Page:** `/app/inventory` (`src/app/app/inventory/InventoryClient.tsx`)
  - **Classification:** `STANDARD_TABLE` (Raw `.table`)
  - **Current Implementation:** 8 separate table instances for stock items, purchase orders, transfers.
  - **Migration Priority:** Phase D - Priority 1.

### 3.10 Domain 10: Transport Management
* **Page:** `/app/transport` (`src/app/app/transport/TransportClient.tsx`)
  - **Classification:** `STANDARD_TABLE` (Raw `.table`)
  - **Current Implementation:** Vehicles, drivers, routes, stops, and roster tables.
  - **Migration Priority:** Phase D - Priority 2.

### 3.11 Domain 11: Classrooms & Setup
* **Page:** `/app/classrooms` (`src/app/app/classrooms/page.tsx`), `/app/setup/[step]`
  - **Classification:** `STANDARD_TABLE`
  - **Current Implementation:** `<table className="dtable">` and `<table className="table-frosted">`.
  - **Migration Priority:** Phase D - Priority 3.

---

## 4. Key Inconsistencies & UX Defects Discovered

1. **Abrupt Mobile Cutoff:**
   `globals.css` line 3432 applies `@media (max-width: 760px) { .dtable { display: none !important; } }`. Pages that render raw `<table className="dtable">` without providing `.dt-mobile-cards` completely disappear on mobile viewports.
2. **Typography & Font Weight Divergence:**
   Table headers alternate between `font-semibold uppercase tracking-wider text-[11px]` (in ad-hoc tables) and `11.5px Poppins uppercase` (in `globals.css`). Cell primary text alternates between `12.5px`, `13px`, and `14px`.
3. **Numeric and Financial Alignment:**
   Currency figures in Fees and Inventory are often left-aligned without tabular numerals (`font-variant-numeric: tabular-nums`), impairing vertical scanning.
4. **Status & Role Badge Fragmentations:**
   Ad-hoc tables render inline CSS spans (`bg-green-100 text-green-800 rounded px-2`), bypassing `StatusPill` and `StatusBadge` design tokens.
5. **Action Overflow vs Direct Buttons:**
   Some tables cram 4-5 buttons in the row action column, causing horizontal overflow, while others use a 3-dot dropdown menu.
6. **Summary Metric Cards:**
   Top metric tiles differ in height, border radiuses, and icon backgrounds across Parents, Students, and Fees.

---

## 5. Architectural Strategy for Global Table Design System v2.0

To resolve these inconsistencies without breaking existing business logic:
1. **Enhance `DataTable.tsx` as the core Global Component Engine**:
   - Standardize typography, density modes (`compact`: 48px, `comfortable`: 56px, `spacious`: 68px).
   - Enhance the toolbar with integrated search, filter badges, and action slots.
   - Upgrade the mobile transformation engine to automatically generate structured mobile cards even for generic columns.
   - Improve pagination controls with unified accessible layout and responsive page size selector.
2. **Standardize Badge & Token Architecture**:
   - Provide clean semantic variants: `success`, `warning`, `urgent`, `pending`, `info`, `neutral`, `primary`, `purple`.
   - Provide role badge mappings that harmonize with status badges.
3. **Execute Reference Implementation**:
   - Modernize `/app/users/family` (Parents Management) as the gold standard enterprise reference.
4. **Progressive Rollout**:
   - Phase A: Parents, Staff, Students.
   - Phase B: Admissions, Audit.
   - Phase C: Fees, Attendance.
   - Phase D: Inventory, Transport, Setup.
