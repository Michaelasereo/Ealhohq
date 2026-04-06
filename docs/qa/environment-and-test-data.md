# Environment and test data — Ealho Therapy QA

Paste this (or link this file) into your **Jira Epic description**, **Confluence** test space, or **Release** notes so QA and dev share one source of truth.

---

## Environments

| Name | Base URL | Purpose |
|------|----------|---------|
| Local | `http://localhost:3000` | Dev; requires `.env.local` |
| Staging | _[fill: e.g. https://staging.ealhohq.com]_ | Pre-prod QA |
| Production | _[fill: https://ealhohq.com]_ | Smoke after deploy |

**Required for app boot**

- `NEXT_PUBLIC_APP_URL` — must match the environment base URL (used for Paystack `callback_url` and redirects).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- Paystack: `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` (use **test** keys on non-prod)

**Paystack test mode**

- Use **Test** public and secret keys from the Paystack dashboard for staging/local.
- Use Paystack’s documented **test cards** and OTP behaviour for your region.
- Verify webhooks: staging must receive Paystack callbacks (or use manual `payment/verify` after redirect during QA).

**WhatsApp / email (optional for full paths)**

- If tokens are unset, some flows log errors but core UI may still work; mark tests **Blocked** for notification assertions when integrations are off.

---

## Seed accounts (`npx prisma db seed`)

Defined in [`prisma/seed.ts`](../../prisma/seed.ts). Passwords are for **non-production** only; rotate if these emails exist in prod.

| Role | Email | Password | Notes |
|------|--------|----------|--------|
| Admin | `admin@ealhohq.com` | `TestAdmin123!` | `/admin/login` |
| Therapist (approved) | `therapist1@ealhohq.com` | `TestTherapist123!` | `/therapist/dashboard` |
| Therapist (approved) | `therapist2@ealhohq.com` | `TestTherapist123!` | Second calendar |
| Client | `patient@ealhohq.com` | `TestPatient123!` | `/dashboard`; seeded with **2** credits, bronze tier |

**Session rate (seed)** — therapists use **₦20,000** per session (`sessionRate: 20000`) for pricing QA.

---

## Discount codes (after seed)

| Code | Type | Use in QA |
|------|------|-----------|
| `EALHO100` | 100% (full session) | Free finalize path via `payment/initialize` without Paystack charge when applicable |
| `EALHO10` | 10% | Partial discount before Paystack |

---

## Timezone

- Product times are **WAT (Africa/Lagos)**. Spot-check one booking: displayed slot vs email/WhatsApp copy vs DB `date` / `startTime`.

---

## Jira Epic snippet (copy-paste)

```text
Staging URL: [FILL]
Paystack: TEST keys only on staging
Seed users: see docs/qa/environment-and-test-data.md (admin@ealhohq.com, therapist1@ealhohq.com, patient@ealhohq.com)
Discounts: EALHO100, EALHO10 after prisma seed
```
