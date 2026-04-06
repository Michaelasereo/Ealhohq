# Jira Test / Story template — Ealho Therapy

Paste the block below into a Jira **Test** issue (Xray/Zephyr) or **Task** used as a test case.  
For **Story** templates, use the same structure in **Description** and move acceptance criteria to **Acceptance Criteria** field if your project uses it.

---

## Template (copy from next line)

```text
h3. Traceability
* Requirement / Story: [PROJ-123]
* Code / policy ref (optional): e.g. Terms §5, lib/cancellation/policy.ts

h3. Preconditions
* Environment: [staging | prod]
* URL base: [https://...]
* Accounts / data: [emails, seeded users, discount codes]
* Feature flags / config: [if any]

h3. Steps
# ...
# ...

h3. Expected result
* ...

h3. Execution (fill when running)
* Actual: 
* Evidence: [screenshot path, Paystack ref, booking ID]
* Result: ( ) Pass   ( ) Fail   ( ) Blocked
* Executed by: 
* Date: 

h3. Defects
* [PROJ-456] (if Fail)
```

---

## Jira Issue Creator — field mapping

| Section | Jira field (typical) |
|---------|----------------------|
| Summary | Short title: `[SMK-01] Login and role redirect` |
| Description | Full template above |
| Labels | e.g. `qa-smoke`, `role-client`, `env-staging` |
| Component | `Web` / `API` / `Integrations` / `Mobile-375` |
| Priority | P0 / P1 / P2 per plan |
| Fix version | Release under test |
| Epic Link | One of the Epics from [jira-epics.md](jira-epics.md) |
| Links | “Blocks” / “Relates to” Story |

---

## Story template (non-QA, for reference)

```text
h2. User story
As a [role], I want [goal], so that [benefit].

h2. Acceptance criteria
* Given ...
* When ...
* Then ...

h2. Out of scope
* ...
```
