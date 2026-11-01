# PreOne Global Table Redesign Baseline Audit
**Task ID:** `PRE1-GLOBAL-TABLE-REDESIGN-002`  
**Feature:** Global Table UI/UX Redesign — Sidebar-Free Enterprise Management Architecture  
**Baseline Git SHA:** `267511b0ed8f5251cd90498708647e467a8a97bc` (branch `main`)  
**Date:** 2026-11-01  
**Reference Module:** Parents Management (`src/app/app/users/family/page.tsx`)  

---

## 1. System-Wide Architecture Inventory

### 1.1 Global Application Header
- **Component File:** `src/components/layout/AppShell.tsx` and `src/components/layout/AppHeader.tsx`
- **Layout & Slots:**
  - **Left:** PreOne brand mark (`PLogoWordmark`), institution name chip, and current breadcrumbs.
  - **Center:** Quick command search trigger (`⌘K`).
  - **Right:** Notification badge bell, Campus Branch switcher (`BranchContextSelect`), theme toggle (light/dark), user profile avatar chip with role badge (`OWNER`, `PRINCIPAL`, etc.).
- **Consistency Constraint:** No duplicate global header in page contents; page starts cleanly beneath application header.

### 1.2 Page Header Components
- **Primary Component:** `PageHead` (`src/components/preone/ui.tsx`)
- **Props:** `title`, `sub` / `subtitle`, `eyebrow`, `badge`, `breadcrumbs`, `actions`.
- **Usage Pattern:**
  - Standardized title with bold tracking.
  - Description rendered in muted secondary text.
  - Right-aligned actions supporting `GlobalActionMenu` and primary CTA buttons (`+ Add Parent`, `+ Add Staff`, etc.).

### 1.3 Page Structure & Sidebar-Free Content Area
- **Container Architecture:** Wide fluid container with max-width constraints: `w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5 pb-20`.
- **Sidebar-Free Compliance:**
  - No internal left navigation sidebar inside table workspaces.
  - Horizontal module navigation implemented via compact `GlobalModuleNavigation` pill tabs (`PARENTS` vs `GUARDIANS`).
  - View switcher segmented control (`TABLE` vs `HOUSEHOLDS` vs `SPREADSHEET`).

### 1.4 DataTable Component Infrastructure
- **Component File:** `src/components/preone/DataTable.tsx`
- **Capabilities:**
  - Generic type support `DataTable<T>`.
  - Density variants: `compact` (8px/12px padding, 12.5px font), `comfortable` (14px/16px padding, 13.5px font), `spacious` (18px/20px padding, 14px font).
  - Preference persistence via `tableKey` in `localStorage`.
  - Column sorting (client and server-side drivers).
  - Row selection: Select row, select page, select all matching across server pages.
  - Built-in pagination with rows per page selector (`10, 25, 50, 100`).
  - Adaptive mobile card view for screens `< 760px` with primary column header and key-value card bodies.
  - Horizontal touch rails (`overflow-x: auto`) for responsive tablet viewports.

### 1.5 Search & Filter Components
- **Primary Component:** `SearchFilterBar` (`src/components/preone/SearchFilterBar.tsx`)
- **Features:**
  - Unified search input with instant clear (`X`) button and `⌘K` keyboard shortcut.
  - Filter types: `branch`, `status`, `select`, `role`.
  - Active filter count and 1-click `Clear All` reset.
  - Embedded variant support directly attaching to table headers.

### 1.6 Summary Metric Cards
- **Component:** `KpiTile` (`src/components/preone/ui.tsx`) and `GlobalKpiCard` (`src/components/preone/GlobalKpiCard.tsx`)
- **Structure:**
  - Surface: `bg-card` with subtle border `border-border/70` and rounded corners `rounded-xl`.
  - Dimensions: Fixed vertical height (72px compact / 88px regular) to prevent layout shifts.
  - Visual hierarchy: Icon container with deterministic pastel tint, metric label, large numerical value, and optional metadata badge.

### 1.7 Global Badge System
- **Status Badges:** `StatusBadge` (`src/components/preone/ui.tsx`):
  - `ACTIVE`: `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20`
  - `SUSPENDED` / `LOCKED`: `bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20`
  - `PENDING`: `bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20`
  - `ARCHIVED` / `INACTIVE`: `bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20`
- **Role Badges:** `ROLE_BADGE` (`src/components/users/types.ts`):
  - `PARENT`: Dual-tone purple `b-purple`
  - `GUARDIAN`: Dual-tone amber `b-orange`
  - `OWNER` / `PRINCIPAL`: Indigo `b-primary`
  - `TEACHER`: Emerald `b-success`

### 1.8 Action Controls & Overflow Menus
- **Component:** `UserRowActions` (`src/components/users/UserRowActions.tsx`)
- **Patterns:**
  - Primary 1-click action buttons: View 360 profile (`Eye`), Edit parent (`Edit3`).
  - Overflow dropdown menu (`MoreHorizontal`):
    - Operational actions: Reset Password, Manage Pickup PIN, Unlock Account, Suspend Access, Resend Invitation.
    - Destructive actions: Delete Account (with confirmation modal).

### 1.9 Responsive Breakpoints
- **Breakpoints:**
  - `xs`: `< 640px` (Mobile portrait — transforms to adaptive cards).
  - `sm`: `640px - 767px` (Mobile landscape / large phones).
  - `md`: `768px - 1023px` (Tablet portrait — condensed columns with horizontal scroll rails).
  - `lg`: `1024px - 1279px` (Tablet landscape / small laptop).
  - `xl`: `1280px - 1439px` (Standard desktop).
  - `2xl`: `≥ 1440px` (Large enterprise widescreen display).

---

## 2. Reference Implementation Profile: Parents Management

### 2.1 File Paths
- **Main Page:** `src/app/app/users/family/page.tsx`
- **Supporting Components:**
  - `src/components/users/UserIdentityCell.tsx`
  - `src/components/users/UserContactCell.tsx`
  - `src/components/users/UserRolePlacementCell.tsx`
  - `src/components/users/UserRowActions.tsx`
  - `src/components/users/ContactActionStrip.tsx`
- **Modal Integrations:**
  - `AddFamilyModal.tsx`
  - `EditUserModal.tsx`
  - `User360Drawer.tsx`
  - `PickupPinModal.tsx`
  - `ResetPasswordModal.tsx`
  - `SuspendUserModal.tsx`
  - `DeleteUserModal.tsx`

### 2.2 Backend APIs & Contracts
- **Primary Endpoint:** `GET /api/v1/users`
  - **Query Params:** `role=PARENT|GUARDIAN`, `page=1`, `pageSize=25`, `branchId=<id>`, `status=<status>`, `q=<query>`
  - **Payload Structure:**
    - `data`: `UserRecord[]`
    - `meta`: `{ total, page, pageSize, totalPages, familyKpis: { totalParents, linkedStudents, multiChildParents, totalGuardians, authorizedPickupTotal, pinSetTotal } }`
- **Family Groups / Households Endpoint:** `GET /api/v1/users/family-groups`
  - **Query Params:** `page=1`, `pageSize=24`, `branchId=<id>`, `q=<query>`, `crossCampusOnly=true|false`
- **Account Actions:**
  - `POST /api/v1/users/[id]/unlock`
  - `POST /api/v1/users/[id]/resend-invite`
  - `PATCH /api/v1/users/[id]`
  - `DELETE /api/v1/users/[id]`

### 2.3 Authoritative Reference Metrics (5 Canonical Cards)
1. **Registered Parents:** Server-calculated distinct parent identities (`familyKpis.totalParents`).
2. **Linked Students:** Server-calculated distinct students associated with parents (`familyKpis.linkedStudents`).
3. **Fee Payers:** Distinct financially responsible parents authorized for invoices and billing.
4. **Multi-Child Parents:** Parents with siblings across classrooms/campuses (`familyKpis.multiChildParents`).
5. **Security Policy:** Constitutional safety standard (e.g. "Max 2 per student" / Pickup cryptographic verification).

### 2.4 Canonical Columns Structure for Redesign
1. **Selection:** Checkbox with indeterminate and select-all-matching support.
2. **Parent / Family Identity:**
   - Deterministic circular avatar with initials.
   - Verified full name.
   - Account username handle (`@username` or `@email`).
3. **Contact Details:**
   - Phone with phone icon and 1-click call/WhatsApp trigger.
   - Email with mail icon and 1-click copy action.
4. **Linked Children (Dedicated Column):**
   - Compact child avatar or avatar stack.
   - Child names with classroom badges (e.g., `Vihaan (Nursery A)`).
   - Multi-campus indicator when children attend different branches.
5. **Role & Status:**
   - Role badge (`Parent` / `Guardian`).
   - Lifecycle status badge (`Active` / `Suspended` / `Locked`).
   - Cryptographic Gate PIN and pickup authorization badges.
6. **Actions:**
   - Direct View 360 profile button.
   - Direct Edit Parent button.
   - More Actions dropdown menu for security & administrative operations.

---

## 3. Test Suites & Verification Baseline

| Test Suite | File Path | Focus | Baseline Result |
| :--- | :--- | :--- | :--- |
| **User Directory KPIs** | `tests/users/family-directory-kpis.test.ts` | Server-side aggregate KPIs & multi-child calculations | 9 pass, 0 fail |
| **Family Stabilization** | `tests/users/family-directory-stabilization.test.ts` | Profile retrieval, sibling linking, PIN lifecycle | 11 pass, 0 fail |
| **User Table Components** | `tests/users/user-table-components.test.ts` | Identity cell, contact cell, row actions | 5 pass, 0 fail |
| **Branch Isolation Audit** | `tests/security/users-family-branch-isolation-audit.test.ts` | Multi-campus boundaries & security | 14 pass, 0 fail |
| **Complete User Regression** | `tests/users/*.test.ts` (13 files) | All user module behaviors and persistence | 123 pass, 0 fail |
| **Security Negative Suite** | `scripts/verify-users-security-negative-e2e.ts` | Tenant/branch boundaries, privilege defense | 28 pass, 0 fail |

---

## 4. Redesign Action Plan

1. **Refine Parents Management Header & Metrics:**
   - Standardize page heading: `title="Parents Management"` with subtitle `"Manage parent accounts, linked students, and communication settings."`.
   - Primary action: `+ Add Parent` button directly beside `GlobalActionMenu`.
   - Organize the 5 summary metric cards in clean 5-column responsive row.
2. **Refine Search & Filter Toolbar:**
   - Align search placeholder: `"Search parent name, phone, email or admission number..."`.
   - Integrate branch, status, and role filters.
   - Clear filters action and column visibility toggle.
3. **Split Main Table into 6 Clear Columns:**
   - Separate `Linked Children` into its own dedicated, prominent column with child avatars and classroom chips.
   - Unify `Role & Status` into a clean dual-badge presentation.
4. **Enhance Mobile Presentation:**
   - Ensure cards display family identity, contact, child pills, and actions cleanly on 320px–430px viewports.
5. **Run Verification & Regression Testing:**
   - Verify all 123 tests pass and report final results.
