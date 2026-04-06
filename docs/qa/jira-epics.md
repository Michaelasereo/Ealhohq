# Jira Epics — Ealho Therapy QA

Create one **Epic** per row. Link **Stories** or **Tasks** under each Epic for features; attach **Test** issues (or Sub-tasks) for verifiable scenarios.

## Global fields (apply to all Epics)

| Field | Suggested value |
|-------|-----------------|
| Project | Your Ealho project key |
| Issue type | Epic |
| Labels | `qa-regression`, `ealho-therapy` |
| Fix version | Current release train (when tracking QA scope) |

---

## Epic 1 — QA / P0 Smoke (every release)

| Field | Value |
|-------|--------|
| **Epic name** | `Ealho — P0 Smoke Tests` |
| **Summary** | Release-blocking smoke: auth, book, Paystack, session join, therapist dashboard |
| **Description** | Run before every production deploy and after hotfixes. Child issues: SMK-01 … SMK-05 (see [smoke-tests-smk-01-05.md](smoke-tests-smk-01-05.md)). |
| **Labels** | `qa-smoke`, `p0-blocker`, `role-multi` |
| **Component** | `Web`, `API`, `Integrations` |

---

## Epic 2 — Client (registered)

| Field | Value |
|-------|--------|
| **Epic name** | `Ealho — Client: dashboard, booking, credits, sessions` |
| **Summary** | Logged-in client journeys: `/dashboard`, `/dashboard/book`, `/credits`, `/sessions`, `/profile`, `/messages` |
| **Description** | Covers `/api/patient/*`, credit purchase/use, reschedule, cancel, feedback. |
| **Labels** | `qa-regression`, `role-client` |
| **Component** | `Web`, `API` |

---

## Epic 3 — Guest booking & discounts

| Field | Value |
|-------|--------|
| **Epic name** | `Ealho — Guest booking & discounts` |
| **Summary** | Public `/book` flow without account; guest details; Paystack; discount codes including 100% off |
| **Description** | Align with `app/api/booking/create`, `app/api/payment/initialize`, `app/api/discount/validate`. |
| **Labels** | `qa-regression`, `role-guest`, `payment` |
| **Component** | `Web`, `API`, `Integrations` |

---

## Epic 4 — Therapist

| Field | Value |
|-------|--------|
| **Epic name** | `Ealho — Therapist: sessions, video, rebook, earnings` |
| **Summary** | Pending gate, sessions list, cancel, Agora session room, rebook invite, earnings split display, availability |
| **Description** | Routes under `/therapist/*` and `app/api/therapist/*`, `app/api/sessions/cancel`. |
| **Labels** | `qa-regression`, `role-therapist` |
| **Component** | `Web`, `API`, `Integrations` |

---

## Epic 5 — Admin

| Field | Value |
|-------|--------|
| **Epic name** | `Ealho — Admin: therapists, discounts, sessions, chat` |
| **Summary** | Admin dashboard, therapists (incl. earnings split), discounts CRUD, sessions, chat moderation, patient credits |
| **Description** | Routes under `/admin/*` and `app/api/admin/*`. |
| **Labels** | `qa-regression`, `role-admin` |
| **Component** | `Web`, `API` |

---

## Epic 6 — Integrations & background jobs

| Field | Value |
|-------|--------|
| **Epic name** | `Ealho — Integrations: Paystack webhooks, cron, referrals` |
| **Summary** | Paystack webhook idempotency, credit purchase finalization, cron reminders, refer API, legal pages |
| **Description** | Lower frequency; run each sprint or before major payment changes. |
| **Labels** | `qa-regression`, `integrations` |
| **Component** | `Integrations`, `API` |

---

## Epic 7 — Mobile spot-check (375px)

| Field | Value |
|-------|--------|
| **Epic name** | `Ealho — Mobile 375px spot-check` |
| **Summary** | Patient-facing critical paths at 375px width |
| **Description** | Subset of P0 + client dashboard/book. Label tests `Mobile-375`. |
| **Labels** | `qa-regression`, `Mobile-375`, `role-client` |
| **Component** | `Mobile-375`, `Web` |

---

## Child issue naming (suggested)

- Smoke: `SMK-01` … `SMK-05` as **Summary** prefix for Test issues.
- Regression: `CLI-###`, `GST-###`, `THR-###`, `ADM-###`, `INT-###` by area.

Link failed tests to **Bug** issues with **“blocks”** or **“is caused by”** link type toward the release Story when applicable.
