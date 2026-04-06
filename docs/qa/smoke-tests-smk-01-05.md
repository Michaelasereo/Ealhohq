# P0 Smoke tests — SMK-01 … SMK-05

**When to run:** Every release candidate, production deploy, and critical hotfix.  
**Epic:** `Ealho — P0 Smoke Tests` (see [jira-epics.md](jira-epics.md)).  
**Labels:** `qa-smoke`, `p0-blocker`

Create **five Test issues** in Jira (one per ID below) or use this page as a **single Test Execution** checklist.

---

## Execution log (copy to Jira or spreadsheet)

| ID | Summary | Pass / Fail / Blocked | Bug link(s) | Executed by | Date |
|----|---------|----------------------|-------------|-------------|------|
| SMK-01 | Auth & role redirect | | | | |
| SMK-02 | Public book to payment step | | | | |
| SMK-03 | Paystack init + verify | | | | |
| SMK-04 | Session join (Agora) | | | | |
| SMK-05 | Therapist dashboard upcoming | | | | |

**Sign-off rule:** All SMK tests **Pass** before production, or documented **accepted risk** with product approval.

---

## SMK-01 — Auth & role redirect

**Preconditions:** Seed users available ([environment-and-test-data.md](environment-and-test-data.md)). Clear cookies or use private window between roles.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/login` | Login page loads |
| 2 | Log in as client (`patient@ealhohq.com`) | Redirect to `/dashboard` (or intended post-login URL) |
| 3 | Sign out; log in as `therapist1@ealhohq.com` | Redirect to `/therapist/dashboard` |
| 4 | Sign out; log in as `admin@ealhohq.com` via `/admin/login` if applicable | Access to admin area (`/admin/dashboard`) |

**Fail:** Wrong redirect, 401 loop, or role can access another role’s home URL.

---

## SMK-02 — Public book to payment step

**Preconditions:** At least one therapist with availability (seed).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/book` | Therapist list or booking entry loads |
| 2 | Select a therapist, pick a future slot | Reaches guest/payment details step without error |
| 3 | (Optional) Stop before real charge if policy is test-only | Payment step visible (Paystack trigger or amount summary) |

**Fail:** Slot errors, 500 on booking API, cannot reach payment step.

---

## SMK-03 — Paystack initialize + confirm payment

**Preconditions:** Test keys; valid pending booking awaiting payment OR complete mini-flow from SMK-02.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Trigger checkout (`payment/initialize` via UI) | Paystack authorization URL opens or modal works |
| 2 | Complete payment with **test** card | Redirect/callback returns to app |
| 3 | Verify booking paid | `payment/verify` or success UI; booking status confirmed in UI or DB |

**Fail:** Amount wrong currency/kobo, verify fails, double charge without idempotency handling.

---

## SMK-04 — Session join (video)

**Preconditions:** A **confirmed** booking in the join window (or test session seeded for QA).

| Step | Action | Expected |
|------|--------|----------|
| 1 | From email/dashboard, open session join URL (`/session/join` with expected query/token per app) | Page loads without 500 |
| 2 | Join video | Agora connects (camera/mic permission); no immediate disconnect |
| 3 | End / leave | Session can end without crash |

**Fail:** Cannot join, black screen with no error, Agora config missing in env.

---

## SMK-05 — Therapist dashboard & upcoming session

**Preconditions:** Therapist1 approved; optional upcoming booking for that therapist.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as `therapist1@ealhohq.com` | `/therapist/dashboard` loads |
| 2 | Confirm upcoming session list or empty state | No 500; data matches expectation |
| 3 | Open `/therapist/sessions` | List loads |

**Fail:** Pending therapist sees full dashboard; API errors.

---

## After a failure

1. Create a **Bug** in Jira; link to the failed SMK test.
2. Set **Priority** = Blocker if it breaks SMK-03 or SMK-04 on production path.
3. Re-run full smoke after fix.
