# PreOne Promotion Architecture Baseline Audit
**Generated:** 2026-11-01  
**Baseline Git SHA:** `edde7460738a5ddcf4d961f68160fd65d2cad3c3`  
**Route Under Audit:** `/app/setup/promotion`  
**Scope:** Student Lifecycle, Academic Session Transition, Early Childhood Education (ECE) Promotion Engine

---

## 1. Executive Summary

This baseline audit evaluates the existing implementation of the Student Promotion and Academic Year Transition domain across PreOne. The evaluation covers database schemas, domain models, backend services, API routes, setup wizards, frontend UI, RBAC authorization, and test coverage.

### Key Architectural Discovery:
- **`ClassroomAssignment` vs. `StudentAllocation`:** The PreOne architecture documentation (PRD/ERD) references `ClassroomAssignment`. The actual Prisma schema implementation is `StudentAllocation` (`student_allocations` table). This model already captures `tenantId`, `studentId`, `academicSessionId`, `classroomId`, `programType`, and `status: StudentAllocationStatus` (`ACTIVE`, `COMPLETED`, `TRANSFERRED`, `PROMOTED`, `WITHDRAWN`).
- **Missing API Domain Configuration:** The Prisma enum `ConfigDomain` contains `PROMOTION`, but the route handler `src/app/api/v1/setup/config/[domain]/route.ts` hardcoded an allowlist of valid domains that omitted `PROMOTION`, resulting in a validation failure when accessing `/api/v1/setup/config/PROMOTION`.
- **Preschool Principle Alignment:** The existing codebase contained basic endpoints for moving students (`POST /api/v1/academic-years/[id]/promote` and `POST /api/v1/students/[id]/promote`), but lacked preschool-specific developmental readiness criteria, age cut-off rules, multi-stage approval workflows, and distinct lifecycle outcomes (`CONTINUE_CURRENT_LEVEL`, `SPECIAL_REVIEW`, `GRADUATED`).

---

## 2. Domain-by-Domain Current State Audit

### 2.1 Student Domain
| Component | Existing Implementation | Status | Gaps / Architectural Reconciliation |
| :--- | :--- | :---: | :--- |
| **`Student` Model** | `prisma/schema.prisma:393` | Complete | Contains `id`, `admissionNo`, `dob`, `gender`, `status` (`ACTIVE`, `INACTIVE`, `TRANSFERRED`, `GRADUATED`, `ARCHIVED`), `currentClassroomId`. |
| **`StudentAllocation`** | `prisma/schema.prisma:1167` | Complete | Realization of `ClassroomAssignment`. Statuses: `ACTIVE`, `COMPLETED`, `TRANSFERRED`, `PROMOTED`, `WITHDRAWN`. Tracks `startedAt`, `endedAt`, `reason`. |
| **`TimelineEntry`** | `prisma/schema.prisma:1115` | Complete | Supports `MILESTONE` types, utilized for recording academic session transitions. |
| **Single Promote API** | `POST /api/v1/students/[id]/promote` | Partial | Moves single student, verifies classroom seats, marks old allocation `COMPLETED`, creates new allocation. Lacks developmental sign-off and age waiver checks. |
| **Bulk Promote API** | `POST /api/v1/academic-years/[id]/promote` | Partial | Moves students by mapping `{from, to}` classrooms. Fails if target class is full; skips students already allocated. Lacks approval steps. |
| **Inter-Branch Transfer** | `POST /api/v1/students/[id]/transfer` | Complete | Validates branch access, updates allocation to `TRANSFERRED`. |
| **Graduation Lifecycle** | Missing | **Absent** | No dedicated `POST /api/v1/students/[id]/graduate` API or `StudentService.graduateStudent` method, despite `StudentStatus.GRADUATED` existing in Prisma. |

### 2.2 Academic Domain
| Component | Existing Implementation | Status | Gaps / Architectural Reconciliation |
| :--- | :--- | :---: | :--- |
| **`AcademicSession`** | `prisma/schema.prisma:314` | Complete | Statuses: `PLANNED`, `ACTIVE`, `CLOSING`, `CLOSED`, `ARCHIVED`. Multi-session support. |
| **`Classroom`** | `prisma/schema.prisma:351` | Complete | Includes `capacity`, `primaryTeacherId`, `programId`, `programType`. |
| **`Program`** | `prisma/schema.prisma:1318` | Complete | Master program entity with `code`, `name`, `ageMinMonths`, `ageMaxMonths`, `capacity`. |
| **`ProgramBranch`** | `prisma/schema.prisma:1347` | Complete | Maps master programs to branch campuses with capacity overrides. |
| **Progression Graph** | `CONFIG_FORMS['PROMOTION']` | Minimal | Only a static text note (`Playgroup → Nursery → LKG → UKG`). No structured program-to-program transition graph. |
| **Classroom Mapping Matrix**| Ad-hoc in API body | Incomplete | No persistent mapping or pre-validation interface before execution. |

### 2.3 Developmental Assessment Domain
| Component | Existing Implementation | Status | Gaps / Architectural Reconciliation |
| :--- | :--- | :---: | :--- |
| **`Observation`** | `prisma/schema.prisma:1095` | Complete | Tracks teacher observations, milestone tags, concerns (`NORMAL`, `MONITOR`, `CRITICAL`), status (`DRAFT`, `PUBLISHED`). |
| **`StudentProgress`** | `prisma/schema.prisma:2178` | Complete | Tracks curriculum activity stages (`NOT_STARTED`, `INTRODUCED`, `DEVELOPING`, `ACHIEVED`). |
| **`StudentReportCard`** | `prisma/schema.prisma:4188` | Complete | Evaluates term performance with JSON `fieldValues`, teacher remarks, template binding. |
| **Teacher Sign-Off Workflow**| None | **Absent** | No structured teacher readiness sign-off (`RECOMMENDED_FOR_PROMOTION`, `RECOMMENDED_TO_CONTINUE`, `REQUIRES_SPECIAL_REVIEW`). |
| **Developmental Domains**| Dispersed | Incomplete | No consolidated evaluation across 10 ECE developmental areas (Fine/Gross Motor, Speech, Social-Emotional, Self-Care, etc.). |

### 2.4 Family Domain
| Component | Existing Implementation | Status | Gaps / Architectural Reconciliation |
| :--- | :--- | :---: | :--- |
| **`Guardian` / Links** | `prisma/schema.prisma:451, 476` | Complete | Parents and guardians linked via `StudentGuardian`. User accounts preserved across years. |
| **Parent Portal API** | `GET /api/v1/parent/today` | Complete | Reads `currentClassroom` and `primaryTeacher` dynamically. Once student pointer moves, portal automatically reflects the new classroom. |
| **Pickup Authorizations** | `prisma/schema.prisma:3763` | Complete | Hashed PINs and guardian authorizations remain linked to student identity, not single sessions. |
| **Multi-Year History View** | Single session view | Incomplete | Parent portal does not yet have an academic-year switcher to browse past year report cards and daily care history. |

### 2.5 Financial Domain
| Component | Existing Implementation | Status | Gaps / Architectural Reconciliation |
| :--- | :--- | :---: | :--- |
| **`Invoice` & `Payment`** | `prisma/schema.prisma:900+` | Complete | Tracks balances (`balanceCents`), status (`ISSUED`, `PARTIALLY_PAID`, `OVERDUE`). Scoped to student and academic session. |
| **Carry-Forward Engine** | Inactive Config Key | Incomplete | `preserveUnpaidBalance: true` exists in default setup JSON, but no automated carryover or conditional hold logic runs on batch promotion. |

### 2.6 Security & RBAC Domain
| Component | Existing Implementation | Status | Gaps / Architectural Reconciliation |
| :--- | :--- | :---: | :--- |
| **RBAC Roles** | `src/lib/roles.ts` | Complete | Canonical roles: `OWNER`, `PRINCIPAL`, `COORDINATOR`, `TEACHER`, `ACCOUNTS`, `RECEPTIONIST`. |
| **Tenant & Branch Scope** | `src/lib/auth-api.ts` | Complete | Multi-tenant isolation enforced via `requireApi` and `requireBranchAccess`. |
| **Approval Hierarchy** | Minimal | Incomplete | Batch promotion can be triggered by anyone with `settings:write`, lacking coordinator/principal tiered sign-off. |

### 2.7 UI Pages
| Component | Existing Implementation | Status | Gaps / Architectural Reconciliation |
| :--- | :--- | :---: | :--- |
| **`/app/setup/promotion`** | `src/app/app/setup/[step]/page.tsx` | Minimal | Generic 4-field `ConfigForm` rendering: `progressionMappingNote`, `requireTeacherSignOff`, `capacityGuardStrategy`, `preserveUnpaidBalance`. |
| **Promotion Control Hub** | None | **Absent** | No multi-tab dashboard, no classroom mapping matrix, no candidate review table, no execution wizard. |

---

## 3. Architectural Conflicts & Safe Reconciliation Plan

1. **Entity Name Alignment (`ClassroomAssignment` $\leftrightarrow$ `StudentAllocation`):**
   - *Architecture Reference:* PRD refers to `ClassroomAssignment`.
   - *Database Reality:* Prisma model is `StudentAllocation` (`student_allocations`).
   - *Resolution:* Retain `StudentAllocation` to prevent breaking existing database foreign keys and demo data. In domain interfaces, reference it as the allocation record for an academic session.
2. **`ConfigDomain.PROMOTION` API Fix:**
   - *Bug:* `VALID_DOMAINS` in `src/app/api/v1/setup/config/[domain]/route.ts` rejected `PROMOTION`.
   - *Resolution:* Add `'PROMOTION'`, `'INVENTORY'`, and `'MOOD_ENVIRONMENT'` to `VALID_DOMAINS` array.
3. **Preschool Promotion Decision Engine:**
   - *ECE Principle:* Replace binary pass/fail with six distinct lifecycle decisions:
     1. `PROMOTED`
     2. `CONTINUE_CURRENT_LEVEL` (developmental retention without stigma)
     3. `SPECIAL_REVIEW` (interdisciplinary review needed)
     4. `GRADUATED` (completion of highest program)
     5. `WITHDRAWN` (voluntary exit)
     6. `TRANSFERRED` (campus/branch transfer)

---

## 4. Test Coverage Baseline
- **Existing Promotion Tests:** 0 tests dedicated to `POST /api/v1/academic-years/[id]/promote` or `StudentService.promoteStudent`.
- **Existing Admissions Progression Tests:** Covered in `tests/admissions/zero-retype-progression.test.ts`.
- **Required New Test Suites:**
  - Comprehensive unit and integration test suite (`tests/promotion/promotion-engine.test.ts`) covering all 11 test dimensions specified in Section 27.
