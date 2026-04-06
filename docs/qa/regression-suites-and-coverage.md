# Regression suites (P1) and coverage tracking — Jira

Use this for **sprint regression** after P0 smoke passes. Map each row to **Test** issues in Jira under the Epics in [jira-epics.md](jira-epics.md).

---

## Role-based suites (create one Jira Test per row or group)

### Suite A — Client (`role-client`, label `qa-regression`)

| ID | Area | Coverage hint |
|----|------|----------------|
| CLI-01 | Dashboard stats / next / recent | `/dashboard`, `/api/patient/dashboard` |
| CLI-02 | Logged-in book flow | `/dashboard/book`, create booking |
| CLI-03 | Credits purchase | `/credits`, Paystack, balance + tier |
| CLI-04 | Pay with credits | Booking deducts credit; insufficient blocked |
| CLI-05 | Sessions: reschedule | Max 2; block &lt;2h before start |
| CLI-06 | Sessions: cancel | Policy windows vs Terms §5 |
| CLI-07 | Feedback | Submit once |
| CLI-08 | Profile | Update + validation |
| CLI-09 | Messages | Thread list + send |

### Suite B — Guest (`role-guest`)

| ID | Area |
|----|------|
| GST-01 | Guest checkout end-to-end |
| GST-02 | Discount invalid / expired / limit |
| GST-03 | EALHO100 full discount path |
| GST-04 | Anonymous session alias |

### Suite C — Therapist (`role-therapist`)

| ID | Area |
|----|------|
| THR-01 | Pending cannot access dashboard |
| THR-02 | Therapist cancel session + client notification path |
| THR-03 | Session room + post-session |
| THR-04 | Rebook invite + client confirm/decline |
| THR-05 | Earnings page vs list price |
| THR-06 | Availability → slots on public book |

### Suite D — Admin (`role-admin`)

| ID | Area |
|----|------|
| ADM-01 | Therapists list + earnings split edit |
| ADM-02 | Discounts CRUD |
| ADM-03 | Admin sessions |
| ADM-04 | Chat overview / flagged |
| ADM-05 | Adjust patient credits + transactions |

### Suite E — Integrations (`integrations`)

| ID | Area |
|----|------|
| INT-01 | Paystack webhook idempotency (no double credit) |
| INT-02 | Cron reminders (staging trigger) |
| INT-03 | Refer / lead flows |
| INT-04 | Terms & Privacy links |

---

## Coverage tracking (per sprint / fix version)

**Jira setup**

1. Create a **Filter** saved as:  
   `project = PROJ AND labels = qa-regression AND fixVersion = "X.Y.Z"`  
   (replace `PROJ` and version).

2. Add a **Dashboard** gadget:
   - **Created vs resolved** (Bugs from QA), or  
   - **Two dimensional filter statistics**: Rows = `Labels`, Columns = `Status` for tests.

3. For **percentage coverage** (manual tests):
   - Use a **Test Execution** in Xray/Zephyr **or** a **Spreadsheet** / **Google Sheet** linked from the Epic with formula:  
     `Passed / (Passed + Failed + Blocked)` for the fix version.

**Sprint log template (paste in Jira Epic comment or Confluence)**

| Fix version | Total P1 tests planned | Passed | Failed | Blocked | Coverage % | Notes |
|-------------|------------------------|--------|--------|---------|------------|-------|
| X.Y.Z | | | | | | e.g. INT-02 blocked (cron not in staging) |

**Coverage % rule of thumb (from QA plan)**

- **Sign-off:** P0 100% Pass; P1 target e.g. **≥95%** Pass (excluding agreed Blocked with reason).

---

## Linking to Bugs

- Failed regression → **Bug** issue.
- Bug **Fix version** = same release as regression.
- Link type: **Relates to** or **Blocks** the Test Execution / Story.
