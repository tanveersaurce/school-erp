# Student Lifecycle State Machine (Phase 7)

## 1. Overview & Valid Transitions

EduSphere enforces a strict, deterministic state machine controlling student lifecycle progression. Arbitrary status mutations are rejected.

```
                  ┌────────────────┐
                  │    ADMITTED    │
                  └───────┬────────┘
                          │ (activate)
                          ▼
                  ┌────────────────┐
         ┌───────►│     ACTIVE     │◄──────┐
         │        └───┬───┬───┬────┘       │
(restore)│            │   │   │            │ (reinstate)
         │  (suspend) │   │   │ (graduate) │
         │            ▼   │   ▼            │
         │   ┌────────────┴┐ ┌───────────┐ │
         └───┤  SUSPENDED  │ │ GRADUATED │ │
             └─────────────┘ └───────────┘ │
                   │ (withdraw)            │
                   ▼                       │
             ┌─────────────┐               │
             │  WITHDRAWN  ├───────────────┘
             └──────┬──────┘
                    │ (archive)
                    ▼
             ┌─────────────┐
             │  ARCHIVED   │
             └─────────────┘
```

---

## 2. Transition Rules & Invariants

| From State    | Allowed Target States                                | Required Specific Permission                                                  | Default Action                              |
| :------------ | :--------------------------------------------------- | :---------------------------------------------------------------------------- | :------------------------------------------ |
| `ADMITTED`    | `ACTIVE`, `WITHDRAWN`                                | `student:activate` / `student:withdraw`                                       | Initial onboarding                          |
| `ACTIVE`      | `SUSPENDED`, `TRANSFERRED`, `WITHDRAWN`, `GRADUATED` | `student:suspend`, `student:transfer`, `student:withdraw`, `student:graduate` | Disciplinary, administrative, or completion |
| `SUSPENDED`   | `ACTIVE`, `WITHDRAWN`                                | `student:activate` / `student:withdraw`                                       | Reinstatement or departure                  |
| `TRANSFERRED` | `ACTIVE`, `ARCHIVED`                                 | `student:activate` / `student:archive`                                        | Cross-campus return or archival             |
| `WITHDRAWN`   | `ACTIVE`, `ARCHIVED`                                 | `student:activate` / `student:archive`                                        | Re-admission or long-term record keeping    |
| `GRADUATED`   | `ARCHIVED`                                           | `student:archive`                                                             | Final record archival                       |
| `ARCHIVED`    | (Terminal)                                           | -                                                                             | No transitions permitted                    |

---

## 3. Audit History Tracking

Every state transition:

1. Records previous and new status.
2. Captures the mandatory change `reason`.
3. Stamps `changedBy` user ID and ISO timestamp `changedAt`.
4. Dispatches an audit event to `AuditLog`.
