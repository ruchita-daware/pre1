# PreOne Parent Portal Student-Centric Access Baseline Audit

**Task ID:** `PRE1-PARENT-PORTAL-STUDENT-CENTRIC-ACCESS-001`  
**Initiative:** Parent Portal – Complete Student-Related Module Visibility & Role Access Enhancement  
**Baseline Git SHA:** `267511b0ed8f5251cd90498708647e467a8a97bc` on branch `main`  
**Timestamp:** 2026-11-01  

---

## 1. Executive Summary & Problem Analysis

In the current implementation of PreOne, the Parent and Guardian roles (`PARENT`, `GUARDIAN`) have restricted navigation and module visibility. While the backend possesses extensive capabilities across domains (students, academics, daily diary, fees, transport, inventory, announcements, and reports), the Parent Portal currently exposes only a limited subset:

- **Dashboard:** Displays `<ParentToday />` with basic telemetry (care timeline, observations, invoices, alerts).
- **Fees & Finance:** `/app/fees` and `/app/finance` display student invoices and receipts.
- **Transport:** `/app/transport` provides `<TransportClient />` with a dedicated parent tab.
- **Announcements:** `/app/communication` displays student and branch-filtered broadcasts.

Several essential student-related modules are missing from Parent navigation or redirect parents to `/app/dashboard`:
1. **Students (`/app/students`):** Hidden because `src/lib/nav.ts` requires `perm: 'students:read'`. Parents only hold `students:read-linked`.
2. **PreO Learning (`/app/learning`):** Hidden because `src/lib/nav.ts` requires `perm: 'academics:read'`. Parents hold no academic capability.
3. **Daily Diary (`/app/daily-diary`):** Hidden because `src/lib/nav.ts` requires `perm: 'attendance:read'`. Parents hold `diary:read-linked`.
4. **Inventory (`/app/inventory`):** Hidden because `src/lib/nav.ts` requires `perm: 'inventory:read'`. Parents hold no inventory capability.
5. **Reports & Analytics (`/app/reports`):** Hidden because `src/lib/nav.ts` requires `perm: 'reports:read'`. Parents hold no report capability.

---

## 2. Current Parent Portal Navigation Audit

Current navigation item mapping in `src/lib/nav.ts`:

| Module Key | Route | Current Required Permission | Parent Granted Permission | Current Parent Visibility | Defect / Reason |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `home` | `/app/home` | None | N/A | **Visible** | Default landing |
| `dashboard` | `/app/dashboard` | None | N/A | **Visible** | Routes to `<ParentToday />` |
| `students` | `/app/students` | `students:read` | `students:read-linked` | **HIDDEN** | Permission mismatch (`students:read` vs `students:read-linked`) |
| `learning` | `/app/learning` | `academics:read` | None | **HIDDEN** | Parent lacks learning capability |
| `daily-diary` | `/app/daily-diary` | `attendance:read` | `diary:read-linked` | **HIDDEN** | Permission mismatch (`attendance:read` vs `diary:read-linked`) |
| `communication` | `/app/communication` | `communication:read` | `communication:read` | **Visible** | Scoped via `isParentOnly` |
| `inventory` | `/app/inventory` | `inventory:read` | None | **HIDDEN** | Parent lacks student-assigned inventory capability |
| `finance` | `/app/finance` | `finance:read` | `finance:read` | **Visible** | Shows fee schedules and receipts |
| `transport` | `/app/transport` | `transport:read` | `transport:read` | **Visible** | Shows parent transport tab |
| `reports` | `/app/reports` | `reports:read` | None | **HIDDEN** | Parent lacks published reports capability |

---

## 3. Current Parent RBAC Audit & Access Matrix

### 3.1 Permissions in `src/lib/auth.ts`
```typescript
PARENT: [
  'timeline:read',
  'communication:read',
  'finance:read',
  'transport:read',
  'students:read-linked',
  'attendance:read-linked',
  'diary:read-linked',
  'milestones:read-linked',
  'documents:read-linked',
  'pickup:read-linked',
]
```

### 3.2 Gaps Identified in RBAC
1. **Academics / Learning:** No permission exists for parents to view student learning activities, curriculum, and goals. Need: `academics:read-linked`.
2. **Inventory:** No permission exists for parents to view items assigned to their student. Need: `inventory:read-linked`.
3. **Reports:** Parents have `documents:read-linked` for raw PDFs, but lack `reports:read-linked` for accessing `/app/reports` and reviewing student report cards.
4. **Navigation Matching:** `navForRole` only checks a single string `perm`. It must support multiple or fallback permissions (e.g. `students:read` OR `students:read-linked`).

---

## 4. Module-by-Module API and Service Availability

| Module | Existing Backend Endpoint | Existing Service | Missing Capabilities / Actions Required |
| :--- | :--- | :--- | :--- |
| **A. Dashboard** | `GET /api/v1/parent/today` | `db.guardian.findMany`, `StudentService` | Enhance with transport summary, learning summary & recent announcements. |
| **B. Students** | `GET /api/v1/students`, `GET /api/v1/students/[id]` | `StudentService.listStudents`, `StudentService.getStudentProfile` | Add dedicated `ParentStudentsView.tsx` with child switcher, health notes & classroom placements. |
| **C. Learning** | `GET /api/v1/academics/students/[studentId]/progress`, `GET /api/v1/academics/activities` | `AcademicService.getStudentProgress`, `AcademicService.listActivities` | Add `ParentLearningView.tsx` with pre-work activities, developmental goals & interactive preschool library. |
| **D. Inventory** | *None for parents* (`/api/v1/inventory/*` is admin only) | `db.stockIssue`, `db.studentKitIssuance` | Create `GET /api/v1/parent/inventory` and `ParentInventoryView.tsx` displaying student-assigned kits/items. |
| **E. Announcements** | `GET /api/v1/announcements` | Direct Prisma query in route | Already scopes to student's classroom and branch. |
| **F. Fees** | `GET /api/v1/parent/fees` | `FeeService.getParentChildrenFees` | Already has dedicated parent view in `/app/fees`. |
| **G. Finance** | `GET /api/v1/parent/fees` | `FeeService.getParentChildrenFees` | Already re-uses `/app/fees` dedicated parent view. |
| **H. Transport** | `GET /api/v1/transport/my-children` | `TransportService.getMyChildrenTransport` | Already has dedicated `'PARENT'` tab in `TransportClient.tsx`. |
| **I. Reports** | `GET /api/v1/parent/documents`, `GET /api/v1/academics/report-cards` | `ReportCardService`, `db.generatedProfileDocument` | Add `ParentReportsView.tsx` showing published report cards, attendance reports, and PDF previewer. |
| **J. Daily Diary** | `GET /api/v1/parent/daily-diary`, `GET /api/v1/parent/daily-report` | `DailyDiaryService.getParentDailyReport` | Add `ParentDailyDiaryView.tsx` showing daily timetable, meals, nap, activities, and teacher observations. |

---

## 5. Security & Boundary Guardrails

1. **Session-Derived Identity:** In every API, the guardian identity must be resolved from `session.uid` and `session.tenantId`.
2. **Server-Side Relationship Validation:** Every endpoint accepting a `studentId` query parameter must verify `db.studentGuardian` or `db.guardian` linkage before returning data.
3. **No Direct Object References (IDOR):** Attempting to query an unrelated student returns `403 Forbidden` ("You are not authorized to view records for this student").
4. **Data Minimization:** No vendor pricing, warehouse stock levels, staff notes, or unpublished records are exposed to parent endpoints.
5. **Multi-Child Consistency:** The selected child persists in browser storage across module transitions while every request independently authenticates the student ID.
