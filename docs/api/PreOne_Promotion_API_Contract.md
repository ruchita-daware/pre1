# PreOne Promotion API Contract
**Specification:** `PRE1-STUDENT-LIFECYCLE-001`  
**Base URL:** `/api/v1`  
**Format:** REST / JSON  

---

## 1. Overview of Endpoints

| Method | Endpoint | Description | Permissions Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/setup/config/PROMOTION` | Read active promotion business rules & policies | `settings:read` |
| `PUT` | `/api/v1/setup/config/PROMOTION` | Update promotion business rules & progression ladder | `settings:write` |
| `GET` | `/api/v1/promotions/preview` | Preview promotion candidates with calculated eligibility | `settings:read` or `students:read` |
| `POST` | `/api/v1/promotions/batch` | Execute atomic batch promotion for mapped classrooms | `settings:write` |
| `POST` | `/api/v1/students/{id}/promote` | Execute individual student promotion | `students:write` |
| `POST` | `/api/v1/students/{id}/graduate` | Mark student as graduated from terminal program | `students:write` |

---

## 2. API Specifications

### 2.1 GET `/api/v1/setup/config/PROMOTION`
Retrieves effective promotion policy configuration.

#### Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "progressionLadder": [
      { "from": "PLAYGROUP", "to": "NURSERY", "terminal": false },
      { "from": "NURSERY", "to": "LKG", "terminal": false },
      { "from": "LKG", "to": "UKG", "terminal": false },
      { "from": "UKG", "to": "GRADUATED", "terminal": true }
    ],
    "cutOffMonth": 7,
    "cutOffDay": 31,
    "requireTeacherSignOff": true,
    "capacityGuardStrategy": "WAITLIST_IF_FULL",
    "financialPolicy": "ROLLOVER_DUES",
    "allowsSameLevelContinuation": true
  }
}
```

---

### 2.2 GET `/api/v1/promotions/preview`
Generates a live simulation of students eligible for year-end transition between two academic sessions.

#### Query Parameters:
- `sourceSessionId` (string, required)
- `targetSessionId` (string, required)
- `branchId` (string, optional)

#### Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "sourceSession": { "id": "uuid", "name": "2025-26" },
    "targetSession": { "id": "uuid", "name": "2026-27" },
    "summary": {
      "totalEligible": 42,
      "readyToPromote": 38,
      "continueCurrentLevel": 2,
      "graduating": 2,
      "specialReview": 0
    },
    "candidates": [
      {
        "studentId": "std-001",
        "admissionNo": "PRE-2025-001",
        "name": "Aarav Sharma",
        "dob": "2022-04-15",
        "ageAtCutOff": "3y 3m",
        "currentClassroom": { "id": "cls-1", "name": "Playgroup A" },
        "currentProgram": "PLAYGROUP",
        "proposedProgram": "NURSERY",
        "proposedClassroom": { "id": "cls-2", "name": "Nursery A", "capacity": 20, "enrolled": 14 },
        "ageEligibility": "AGE_ELIGIBLE",
        "teacherSignOff": "RECOMMENDED_FOR_PROMOTION",
        "suggestedOutcome": "PROMOTED",
        "outstandingDuesCents": 0
      }
    ]
  }
}
```

---

### 2.3 POST `/api/v1/promotions/batch`
Executes an atomic batch transition based on administrator-reviewed decisions.

#### Request Body:
```json
{
  "sourceSessionId": "uuid-old-session",
  "targetSessionId": "uuid-new-session",
  "decisions": [
    {
      "studentId": "std-001",
      "outcome": "PROMOTED",
      "targetClassroomId": "cls-target-001",
      "notes": "Developmentally ready for Nursery"
    },
    {
      "studentId": "std-002",
      "outcome": "CONTINUE_CURRENT_LEVEL",
      "targetClassroomId": "cls-target-same-level",
      "notes": "Consolidating speech milestones"
    },
    {
      "studentId": "std-003",
      "outcome": "GRADUATED",
      "notes": "Completed Sr. KG curriculum"
    }
  ]
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "processedCount": 3,
    "promotedCount": 1,
    "continuedCount": 1,
    "graduatedCount": 1,
    "failedCount": 0,
    "results": [
      { "studentId": "std-001", "status": "SUCCESS", "outcome": "PROMOTED" },
      { "studentId": "std-002", "status": "SUCCESS", "outcome": "CONTINUE_CURRENT_LEVEL" },
      { "studentId": "std-003", "status": "SUCCESS", "outcome": "GRADUATED" }
    ]
  }
}
```

---

### 2.4 POST `/api/v1/students/{id}/graduate`
Executes graduation for a student finishing the terminal program.

#### Request Body:
```json
{
  "graduationDate": "2026-03-31T00:00:00.000Z",
  "certificateNumber": "GRAD-2026-0042",
  "remarks": "Successfully completed Senior KG with honors"
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "studentId": "uuid",
    "status": "GRADUATED",
    "graduatedAt": "2026-03-31T00:00:00.000Z",
    "certificateNumber": "GRAD-2026-0042"
  }
}
```
