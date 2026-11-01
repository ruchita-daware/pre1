# PreOne Promotion Engine Test Plan
**Specification:** `PRE1-STUDENT-LIFECYCLE-001`  
**Domain:** Quality Assurance & Automated Regression  
**Coverage Target:** 100% Critical Lifecycle Paths  

---

## 1. Test Strategy & Scope

The testing strategy validates that:
1. Student records transition safely without data destruction or orphaned allocations.
2. Age calculations adhere to configured cut-off dates and leap-year boundaries.
3. ECE progression supports all 6 outcomes (`PROMOTED`, `CONTINUE_CURRENT_LEVEL`, `SPECIAL_REVIEW`, `GRADUATED`, `WITHDRAWN`, `TRANSFERRED`).
4. Capacity limits and concurrency locks prevent over-booking classroom sections.
5. Multi-tenant and branch boundaries are strictly enforced.
6. Parent accounts and historical observations/reports remain intact.

---

## 2. Test Suite Matrix

### Suite A: Program Progression & Rules Engine
- `TC-PROG-01`: Valid standard progression (Playgroup $\rightarrow$ Nursery $\rightarrow$ LKG $\rightarrow$ UKG).
- `TC-PROG-02`: Same-level continuation (`CONTINUE_CURRENT_LEVEL`) creates new active allocation in same program type.
- `TC-PROG-03`: Terminal program completion transitions to `GRADUATED`.
- `TC-PROG-04`: Invalid target classroom rejection (classroom belongs to mismatched program).

### Suite B: Age Eligibility & Cut-Off Calculations
- `TC-AGE-01`: Age calculation using configured July 31 cut-off date.
- `TC-AGE-02`: Underage student flagged as `AGE_BELOW_RECOMMENDED` with waiver requirement.
- `TC-AGE-03`: Overage student flagged as `AGE_ABOVE_RECOMMENDED`.
- `TC-AGE-04`: Authorized age waiver allows promotion with audit entry.

### Suite C: Capacity Guards & Concurrency
- `TC-CAP-01`: Promotion permitted when target section has available seats.
- `TC-CAP-02`: Promotion rejected under `STRICT_REJECT` when target section is at full capacity ($20/20$).
- `TC-CAP-03`: Promotion sets status to `WAITLISTED` under `WAITLIST_IF_FULL` strategy.
- `TC-CAP-04`: Concurrency locking (`FOR UPDATE`) prevents two parallel promotion requests from exceeding capacity.

### Suite D: Student & Allocation State Transitions
- `TC-STU-01`: Old `StudentAllocation` marked `COMPLETED` with timestamp and reason.
- `TC-STU-02`: New `StudentAllocation` created as `ACTIVE` in target session.
- `TC-STU-03`: `Student.currentClassroomId` pointer updated to new section.
- `TC-STU-04`: Idempotency: re-running promotion for already-promoted student does not create duplicate allocations.

### Suite E: Parent Portal & Historical Continuity
- `TC-PAR-01`: Parent user account and credentials preserved untouched.
- `TC-PAR-02`: Parent portal (`/api/v1/parent/today`) reflects new classroom and new lead teacher.
- `TC-PAR-03`: Historical observations and past report cards remain accessible under past academic session queries.

### Suite F: Security & Multi-Tenant Isolation
- `TC-SEC-01`: Tenant B user cannot promote or access Tenant A students (HTTP 403 / 404).
- `TC-SEC-02`: Branch-restricted user cannot promote students into a foreign branch section without authorization.
- `TC-SEC-03`: Non-privileged role (e.g. Teacher without coordinator delegation) cannot execute batch promotion.
