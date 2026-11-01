# PreOne Global Data Table Design System v2.0
## Enterprise-Grade Data Table Specification, Design Tokens & Responsive Architecture

**Initiative:** Global UI/UX Modernization  
**Specification Version:** 2.0  
**Status:** Approved Specification  
**Reference Implementation:** Parents Management (`src/app/app/users/family/page.tsx`)

---

## 1. Design Principles & Goals

PreOne Data Table Design System v2.0 provides an enterprise-grade, clean, responsive, and accessible table experience across all web, tablet, and mobile surfaces.

1. **Information Hierarchy First:** Visual hierarchy is governed by typography, calm backgrounds, and clear column groupings rather than dense borders and loud colors.
2. **Predictable Density:** Standard density modes allow users to toggle between data-dense views and high-readability modes.
3. **Responsive by Architecture:** Tables never simply shrink or overflow uncontrollably. On viewports below 768px, tables adapt into structured mobile record cards with clear touch targets.
4. **Accessible Semantics:** Semantic table markup (`<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`), `aria-sort`, visible focus rings, and high-contrast dual-tone badges ensure WCAG 2.1 AA compliance.
5. **Business Logic Separation:** The design system handles presentation, interaction states, and accessibility while delegating column definitions, data sources, filters, and actions to individual modules.

---

## 2. Design Tokens & Visual Variables

```css
:root {
  /* Surface & Border Tokens */
  --dt-surface: var(--bg-card, #FFFFFF);
  --dt-surface-subtle: var(--bg-subtle, #F8FAFC);
  --dt-border: var(--border-default, #E2E8F0);
  --dt-border-subtle: var(--border-subtle, #F1F5F9);
  --dt-header-bg: var(--table-header-bg, #F8FAFC);
  --dt-header-text: var(--text-secondary, #475569);
  --dt-header-border: var(--border-default, #E2E8F0);
  --dt-row-hover: var(--bg-hover, rgba(248, 250, 252, 0.85));
  --dt-row-selected: var(--primary-light, rgba(238, 242, 255, 0.65));
  --dt-row-selected-border: var(--primary, #6366F1);

  /* Radius Tokens */
  --dt-radius-wrap: var(--radius-xl, 16px);
  --dt-radius-card: var(--radius-lg, 12px);
  --dt-radius-badge: var(--radius-full, 9999px);
  --dt-radius-control: var(--radius-md, 8px);

  /* Elevation */
  --dt-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
  --dt-shadow-card: var(--shadow-card, 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04));
}

.dark, [data-theme="dark"] {
  --dt-surface: #0F172A;
  --dt-surface-subtle: #1E293B;
  --dt-border: rgba(148, 163, 184, 0.15);
  --dt-border-subtle: rgba(148, 163, 184, 0.08);
  --dt-header-bg: #111827;
  --dt-header-text: #94A3B8;
  --dt-header-border: rgba(148, 163, 184, 0.15);
  --dt-row-hover: rgba(30, 41, 59, 0.7);
  --dt-row-selected: rgba(99, 102, 241, 0.15);
}
```

---

## 3. Typography & Hierarchy

| Element | Font Family | Size | Weight | Line Height | Case / Spacing | Color |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Table Heading** | `var(--font-heading)` (Poppins) | 16–18px | Semibold (600) | 1.3 | Normal | `var(--text-primary)` |
| **Column Header** | `var(--font-heading)` (Poppins) | 11.5px | Semibold (600) | 1.2 | Uppercase / 0.045em | `var(--dt-header-text)` |
| **Primary Cell** | `var(--font-body)` (Nunito) | 13.5px | Semibold (600) | 1.35 | Normal | `var(--text-primary)` |
| **Secondary Cell** | `var(--font-body)` (Nunito) | 12px | Medium (500) | 1.3 | Normal | `var(--text-secondary)` |
| **Metadata / Handle** | `var(--font-mono)` / Nunito | 11px | Regular / Med | 1.25 | Normal | `var(--text-muted)` |
| **Numeric Value** | `var(--font-mono)` | 13px | Medium (500) | 1.2 | Tabular Numerals | `var(--text-primary)` |
| **Badge Label** | `var(--font-body)` | 11px | Semibold (600) | 1.15 | Normal | Semantic Variant |
| **Pagination** | `var(--font-body)` | 12.5px | Medium (500) | 1.2 | Normal | `var(--text-secondary)` |

*Note: All currency and numerical columns must specify `font-variant-numeric: tabular-nums` to guarantee vertical decimal alignment.*

---

## 4. Spacing, Row Heights & Density Modes

PreOne tables support three density modes, stored per table in user preferences (`localStorage`):

1. **Compact Mode (`density-compact`):**
   - Header Height: `40px` (padding: `8px 14px`)
   - Row Height: `48px–52px` (padding: `8px 14px`)
   - Best for: Finance schedules, audit logs, raw inventory ledger.
2. **Comfortable Mode (`density-comfortable` / Default):**
   - Header Height: `46px` (padding: `12px 16px`)
   - Row Height: `58px–64px` (padding: `12px 16px`)
   - Best for: Family directory, staff management, students, admissions.
3. **Spacious Mode (`density-spacious`):**
   - Header Height: `52px` (padding: `14px 18px`)
   - Row Height: `68px–76px` (padding: `16px 18px`)
   - Best for: Photo inspection tables, student portfolios, report cards.

---

## 5. Standardized Semantic Badge System

### 5.1 Status Categories & Semantic Mappings
Status badges use dual-tone styling (soft tinted background, subtle semantic border, distinct text color, status dot, and optional live pulse):

| Semantic Variant | Background | Border | Text | Status Dot | Statuses Mapped |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Success** | `bg-emerald-50 dark:bg-emerald-950/40` | `border-emerald-200 dark:border-emerald-800/60` | `text-emerald-700 dark:text-emerald-300` | Yes (Solid Emerald) | `ACTIVE`, `PAID`, `APPROVED`, `ENROLLED`, `PRESENT`, `QUALIFIED`, `CONVERTED`, `READY` |
| **Warning** | `bg-amber-50 dark:bg-amber-950/40` | `border-amber-200 dark:border-amber-800/60` | `text-amber-700 dark:text-amber-300` | Yes (Amber) | `PARTIALLY_PAID`, `LATE`, `ACHIEVEMENT`, `WARNING`, `DOCUMENT_PENDING` |
| **Urgent / Critical** | `bg-rose-50 dark:bg-rose-950/40` | `border-rose-200 dark:border-rose-800/60` | `text-rose-700 dark:text-rose-300` | Yes (Solid Rose) | `OVERDUE`, `REJECTED`, `ABSENT`, `SUSPENDED`, `LOCKED`, `ERROR`, `LOST` |
| **Pending / Pulse** | `bg-indigo-50 dark:bg-indigo-950/40` | `border-indigo-200 dark:border-indigo-800/60` | `text-indigo-700 dark:text-indigo-300` | Yes (Pulsing) | `PENDING`, `UNDER_REVIEW`, `IN_PROGRESS`, `WAITLISTED` |
| **Info / Tech** | `bg-sky-50 dark:bg-sky-950/40` | `border-sky-200 dark:border-sky-800/60` | `text-sky-700 dark:text-sky-300` | Optional | `NEW`, `SUBMITTED`, `ORDERED`, `TRANSFERRED`, `FEE_REMINDER` |
| **Neutral / Inactive** | `bg-slate-100 dark:bg-slate-850` | `border-slate-200 dark:border-slate-700` | `text-slate-600 dark:text-slate-400` | No | `INACTIVE`, `DRAFT`, `ARCHIVED`, `WITHDRAWN`, `CANCELLED` |

### 5.2 Role Categories
Roles must remain visually distinct from operational statuses to avoid semantic confusion:

| Role Category | Badge Color Theme | Display Label |
| :--- | :--- | :--- |
| **OWNER** | Purple (`bg-purple-50 text-purple-700 border-purple-200`) | Owner / Trust Head |
| **PRINCIPAL** | Blue (`bg-blue-50 text-blue-700 border-blue-200`) | Principal / Center Head |
| **COORDINATOR** | Cyan (`bg-cyan-50 text-cyan-700 border-cyan-200`) | Academic Coordinator |
| **TEACHER** | Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`) | Teacher / Educator |
| **STAFF** | Indigo (`bg-indigo-50 text-indigo-700 border-indigo-200`) | General Staff / Operations |
| **ACCOUNTS** | Amber (`bg-amber-50 text-amber-700 border-amber-200`) | Accounts & Finance |
| **RECEPTIONIST**| Pink (`bg-pink-50 text-pink-700 border-pink-200`) | Front Desk / Reception |
| **ATTENDANT** | Teal (`bg-teal-50 text-teal-700 border-teal-200`) | Attendant / Caregiver |
| **DRIVER** | Orange (`bg-orange-50 text-orange-700 border-orange-200`) | Driver / Transport |
| **PARENT** | Purple/Indigo (`bg-indigo-50 text-indigo-700 border-indigo-200`)| Parent |
| **GUARDIAN** | Amber/Orange (`bg-amber-50 text-amber-700 border-amber-200`)| Guardian |

---

## 6. Table Toolbar & Search Specification

The toolbar is an integrated header container positioned immediately above the table surface:

```
┌────────────────────────────────────────────────────────────────────────┐
│ [🔍 Search records... (⌘K)] [Campus: All ▾] [Status: All ▾]            │
│                         [Clear (2)] [Columns ▾] [Density ▾] [Export ▾] │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Left Section:**
   - Search Input with leading search icon, clear button (`×`), and optional keyboard shortcut hint (`⌘K`).
   - Debounced input (300ms) with direct pass-through to `onSearch`.
2. **Middle Section:**
   - Module filter selectors with active filter indicator dots.
   - When filters are active, a "Clear Filters (N)" button appears.
3. **Right Section:**
   - Bulk action indicators when rows are selected.
   - Column visibility popover with checkbox toggles for non-mandatory columns.
   - Density selector (`Compact` vs `Comfortable` vs `Spacious`).
   - CSV Export action button.

---

## 7. Row Interactions & Actions

1. **Row Hover:**
   - Subtle background tint transition (`140ms ease`).
   - Action buttons emerge with smooth opacity (`opacity: 1` on hover/focus).
2. **Row Click:**
   - Clicking anywhere on the row (except interactive checkboxes, links, or buttons) triggers `onRowClick`.
3. **Action Column (Right-Aligned):**
   - Maximum 2 primary icon buttons visible directly on the row (`View 360`, `Edit`).
   - More actions are organized into an accessible overflow kebab menu (`MoreVertical` / `MoreHorizontal`).
   - Destructive actions (e.g. `Delete`, `Suspend`, `Deactivate`) are placed in a separated section with clear red danger styling and require a modal confirmation.

---

## 8. Bulk Selection & Actions

When one or more rows are selected:
1. A sticky floating or docked **Bulk Action Bar** appears above the table.
2. Displays:
   - Selected count badge (`N selected`).
   - "Select all N matching records across pages" link when all items on the current page are selected.
   - Contextual actions: `Bulk Update Fields`, `Status Change`, `Export Selected CSV`, `Delete Selected`.
   - `Clear Selection` action button.
3. Selection states are maintained across page switches if configured.

---

## 9. Responsive Breakpoints & Adaptive Presentation

| Breakpoint | Width Range | Table Behavior |
| :--- | :--- | :--- |
| **Desktop Large** | `≥ 1440px` | Full table with spacious or comfortable layout. Complete column set visible. |
| **Desktop Normal** | `1024px – 1439px` | Comfortable layout. Full table with horizontal rail scroll if total width exceeds screen. |
| **Tablet** | `768px – 1023px` | Sticky header preserved. Checkbox column pinned. Lower-priority columns collapsed via column visibility. |
| **Mobile** | `< 768px` | **Adaptive Card Transformation:** Raw table hidden. Content renders as stacked, tactile record cards (`.dt-card`). Primary identity in card header; badges and key-value fields in structured 2-column grid; 44px+ touch-friendly action buttons. |

---

## 10. Empty, Loading, and Error States

1. **Loading State:**
   - Skeleton rows (`ZenTableSkeleton`) match the active column structure and selected density mode, preventing layout cumulative shift (CLS).
2. **Empty State:**
   - **No Records Created:** Clean educational empty state illustration with primary "Add First Record" CTA.
   - **No Search / Filter Matches:** "No matching records found for query" with a single-click "Clear Filters" action.
3. **Error State:**
   - Warning icon, readable error summary, and an explicit "Retry" button. Never silently renders an empty table on network failure.

---

## 11. Accessibility (WCAG 2.1 AA)

- Tables use semantic elements: `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`.
- Column sorting exposes `aria-sort="ascending"` / `aria-sort="descending"`.
- All icon buttons feature explicit `aria-label` and `title` attributes.
- Keyboard navigation: Full row selection via `Space`, row click via `Enter`, arrow key navigation where supported.
- Color contrast: All text meets minimum `4.5:1` contrast ratio against respective surfaces. Status is never communicated by color alone.
