# PreOne Preschool Promotion Business Rules
**Specification:** `PRE1-STUDENT-LIFECYCLE-001`  
**Domain:** Student Lifecycle & Early Childhood Education (ECE) Academic Progression  
**Effective Version:** 1.0.0  

---

## 1. Core Preschool Philosophy & Guiding Principles

1. **Developmental Transition, Not Examination Result:**
   In early childhood education (ages 1.5 to 6), learning is non-linear and holistic. PreOne rejects any binary "Pass / Fail" academic grading system.
2. **No Failure Stigma:**
   A child who is not ready for the next level continues at the same developmental stage (`CONTINUE_CURRENT_LEVEL`). This is documented as a developmental decision, not a detention or academic failure.
3. **Continuity of Identity:**
   A student retains their unique student ID, admission number, historical portfolio, and family relationships across their entire lifecycle from enrollment to graduation.
4. **Holistic Assessment Inputs:**
   Decisions synthesize five distinct operational inputs:
   - **Age Readiness:** Calculated at a configured institutional cut-off date (e.g. July 31).
   - **Developmental Observations:** Milestones across 10 ECE developmental domains.
   - **Teacher Recommendation:** Class teacher's professional assessment sign-off.
   - **Institutional Approvals:** Multi-stage workflow (Teacher $\rightarrow$ Coordinator $\rightarrow$ Principal).
   - **Operational Feasibility:** Section capacity, teacher assignments, and financial clearance policy.

---

## 2. Six Distinct Lifecycle Outcomes

| Outcome Code | Meaning | Preschool Context | Target Allocation Action |
| :--- | :--- | :--- | :--- |
| `PROMOTED` | Child moves to the next developmental program. | Standard developmental progression (e.g. Playgroup $\rightarrow$ Nursery). | Marks old allocation `COMPLETED`, creates new `ACTIVE` allocation in next level section. |
| `CONTINUE_CURRENT_LEVEL` | Child continues in the same developmental program for the next academic year. | Child needs additional time to consolidate motor, speech, or social milestones. Normal in ECE. | Marks old allocation `COMPLETED`, creates new `ACTIVE` allocation in the *same* program level in the new session. |
| `SPECIAL_REVIEW` | Interdisciplinary evaluation or parent consultation required. | Borderline age, developmental delays, special education needs, or pending family consultation. | Placed in review queue; no allocation created until authorized resolution. |
| `GRADUATED` | Child completes the terminal preschool program. | Completion of Sr. KG / UKG. Child prepares for primary school. | Marks old allocation `COMPLETED`. Sets `Student.status = GRADUATED`. Issues leaving/completion certificate. |
| `WITHDRAWN` | Voluntary exit or family relocation. | Formal withdrawal initiated by parent/guardian. | Marks allocation `WITHDRAWN`. Assesses pending fees and settles deposit. |
| `TRANSFERRED` | Move to another campus branch. | Parent relocates near another branch of the school network. | Handled via inter-branch transfer with historical continuity. |

---

## 3. Configurable Progression Ladder

Schools may configure custom program ladders matching their pedagogical framework:

### Standard Ladder (Montessori / Kindergarten):
`INFANT` $\rightarrow$ `TODDLER` $\rightarrow$ `PLAYGROUP` $\rightarrow$ `NURSERY` $\rightarrow$ `LKG` $\rightarrow$ `UKG` $\rightarrow$ `GRADUATED`

### Alternative Ladder (Early Years Foundation):
`PRE_NURSERY` $\rightarrow$ `NURSERY` $\rightarrow$ `KG_1` $\rightarrow$ `KG_2` $\rightarrow$ `GRADUATED`

Each program definition configures:
- `code` & `name`
- `ageMinMonths` & `ageMaxMonths`
- `defaultNextProgramCode`
- `isTerminal` (indicates graduation boundary)
- `allowsSameLevelContinuation` (`true` by default)

---

## 4. Age Readiness & Cut-off Rules

1. **Cut-off Reference Date:**
   Age is calculated as of the configured institutional cut-off date (e.g., `July 31` or `September 1`) of the **target academic year**.
   $$\text{Age (months)} = \frac{\text{Cut-off Date} - \text{Date of Birth}}{\text{Average Month Duration}}$$
2. **Age Eligibility Classifications:**
   - `AGE_ELIGIBLE`: Child's age falls within `[ageMinMonths, ageMaxMonths]`.
   - `AGE_BELOW_RECOMMENDED`: Child is younger than `ageMinMonths`.
   - `AGE_ABOVE_RECOMMENDED`: Child is older than `ageMaxMonths`.
   - `AGE_WAIVER_REQUIRED`: Age is within borderline margin ($\le 30$ days), requiring administrative waiver with recorded rationale.
3. **No Automatic Disqualification:**
   Borderline or non-standard age generates a warning and requires explicit sign-off from the Academic Coordinator or Principal, but does not block evaluation.

---

## 5. Developmental Readiness Domains

PreOne models 10 standard Early Childhood Education developmental domains:
1. **Language & Communication** (Speech, vocabulary, expressing needs)
2. **Cognitive Development** (Curiosity, problem-solving, pattern recognition)
3. **Fine Motor Skills** (Grip, cutlery, drawing, manipulating objects)
4. **Gross Motor Skills** (Balance, running, climbing, coordination)
5. **Social & Emotional** (Sharing, empathy, peer interaction, emotional regulation)
6. **Self-Care & Independence** (Potty independence, handwashing, self-feeding)
7. **Creative Expression** (Art, music, sensory play)
8. **Early Numeracy** (Counting, sorting, size comparisons)
9. **Early Literacy** (Phonics awareness, story comprehension)
10. **General Participation & Adaptability** (Routine following, focus, transition handling)

### Developmental Assessment Scale:
- `NOT_ASSESSED`
- `EMERGING` (Skill is just beginning to appear)
- `DEVELOPING` (Skill is progressing with educator scaffolding)
- `CONSISTENT` (Skill is demonstrated regularly across varied situations)
- `WELL_ESTABLISHED` (Skill is mastered and self-initiated)
- `SUPPORT_REQUIRED` (Specific pedagogical or therapeutic support advised)

---

## 6. Teacher Sign-Off & Approval Workflow

1. **Class Teacher Evaluation:**
   The lead teacher evaluates the child against developmental milestones and submits a recommendation:
   - `RECOMMENDED_FOR_PROMOTION`
   - `RECOMMENDED_TO_CONTINUE`
   - `REQUIRES_SPECIAL_REVIEW`
2. **Approval Hierarchy:**
   $$\text{Lead Teacher} \longrightarrow \text{Academic Coordinator} \longrightarrow \text{Principal / Owner}$$
3. **Audit Immutability:**
   Every recommendation and approval is stamped with `actorId`, `actorName`, `actorRole`, and `timestamp`. Decisions cannot be silently overwritten; corrections generate an auditable amendment log.

---

## 7. Capacity Guard & Section Balancing Strategies

When assigning students to sections in the target academic session:
- **`STRICT_REJECT`:** Blocks promotion into a section if current enrolled + incoming exceeds section capacity. Prevents violation of teacher-to-child safety ratios.
- **`WAITLIST_IF_FULL`:** Approves the promotion decision but sets target allocation status to `WAITLISTED`. The student remains queued until a seat is created or freed.
- **`AUTO_SECTION_BALANCE`:** Distributes students evenly across parallel sections (e.g., Nursery-A, Nursery-B) based on class size balance, age spread, and sibling continuity.

---

## 8. Financial Clearance & Arrears Policy

1. **Independent Ledger:** Academic evaluation and financial collection remain decoupled.
2. **Configurable Financial Policy:**
   - **`STRICT_HOLD`:** Outstanding balances above threshold generate an administrative hold requiring Accounts clearance before new section confirmation.
   - **`ROLLOVER_DUES` (Default):** Promotes child and carries unpaid invoice balance forward into the new academic year ledger without double-counting debt or marking old invoices paid.
   - **`CONDITIONAL_PROMOTION`:** Allows temporary enrollment with a configurable grace period (e.g. 15 days) for fee settlement.
