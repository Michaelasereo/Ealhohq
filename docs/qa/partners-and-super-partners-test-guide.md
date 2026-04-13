# Partners & super partners — end-to-end test guide

Use this for **manual QA** of the admin **Partners** workspace: telehealth **super partners**, corporate **partners**, staff **CSV** import, and related APIs.

**Prerequisites**

| Requirement | Check |
|-------------|--------|
| DB migrations applied | `npx prisma migrate deploy` (with `DATABASE_URL` + `DIRECT_URL` loaded) |
| Prisma client | `npx prisma generate` after schema changes; **restart** `npm run dev` |
| Supabase Storage (logos) | Bucket `partner-logos` per [`SUPABASE_SETUP.md`](../../SUPABASE_SETUP.md) Step 8 if testing logo upload |
| Admin session | Log in at `/admin/login` (see [`environment-and-test-data.md`](./environment-and-test-data.md) for seed admin) |

**Navigation (admin, Partners shell)**

- **Overview** — `/admin/partners`
- **Super partners** — `/admin/partners/super-partners`
- **Partners** (corporate orgs) — `/admin/partners/list`
- **Clients / Credit pools / Reports / Settings** — other sidebar items as implemented

---

## 1. Super partners (telehealth / umbrella)

### 1.1 List (empty → populated)

1. Open **Super partners** (`/admin/partners/super-partners`).
2. **Expect:** Table loads without error; empty state copy if no rows.
3. **API (optional):** `GET /api/admin/super-partners` returns `{ success: true, data: [...] }` when authenticated as admin.

### 1.2 Create

1. Click **Add super partner**.
2. Enter **Name** (required). Optionally **Contact name**, **Contact email**.
3. **Save** / **Create**.
4. **Expect:** Row appears with **Active**, **Corporate partners** count `0`, **Added** date today.
5. **API:** `POST /api/admin/super-partners` with JSON `{ "name": "…" }` (plus optional contacts).

### 1.3 Edit

1. On a row, click **Edit**.
2. Change name/contacts; toggle **Active** off, save.
3. **Expect:** Row updates; inactive super partners **no longer appear** in the corporate partner **affiliation** dropdown for **new** partners, except where an existing corporate partner is still linked (then that row may show as “(inactive)” in edit — see corporate partner tests).

### 1.4 API errors (smoke)

- Unauthenticated: gated response (not 200 with data).
- Missing tables: `GET` should return a **structured error** (e.g. 503) with message to run migrations — not a blank 500 page.

---

## 2. Corporate partners (organisations)

### 2.1 List

1. Open **Partners** — `/admin/partners/list`.
2. **Expect:** Table columns include **Name**, **Affiliation**, **Slug**, **Status**, **Clients**, **Pool size**, **Actions** (Edit, Import CSV).

### 2.2 Create — independent

1. **Add partner**.
2. **Affiliation:** “Independent (not under a super partner)”.
3. Fill **Organisation name**, **Contact name**, **Contact email**; optional **Referral slug**; optional **logo** upload.
4. **Create**.
5. **Expect:** New row; **Affiliation** shows **Independent**; slug appears (auto-generated if left blank).

### 2.3 Create — under a super partner

1. Ensure at least one **active** super partner exists (§1).
2. **Add partner** → **Affiliation:** choose that super partner → create.
3. **Expect:** **Affiliation** column shows the super partner **name**.

### 2.4 Edit

1. Click **Edit** on a row.
2. Change affiliation, contacts, **Referral slug** (note: changes affect `?partner=SLUG` links), **Status**, **logo**.
3. **Save changes**.
4. **Expect:** Table reflects updates; `PATCH /api/admin/super-referral-partners/:id` succeeds.

### 2.5 Slug uniqueness

1. Edit partner A’s slug to match partner B’s existing slug (if B exists).
2. **Expect:** Error (e.g. conflict / clear message), no silent overwrite.

---

## 3. Staff CSV — sample file and import

### 3.1 Download sample (for HR)

1. On **Partners** list card description, use **Download sample staff CSV**  
   **or** open **Import CSV** and use **Download sample CSV** in the dialog.
2. **Expect:** File downloads (e.g. `ealho-partner-staff-sample.csv`); opens with header row  
   `name,email,gender,phone` and example rows (see `public/samples/partner-staff-sample.csv`).

### 3.2 Import — happy path

1. Click **Import CSV** on a corporate partner row.
2. **Choose file** and select a `.csv` (header + at least one valid `name` + `email` row). The file is sent as **multipart** upload to `POST /api/admin/super-referral-partners/:id/import-csv` (field `file`, plus `clientType`, `sendInvites`).
3. Alternatively, expand **Paste CSV text instead** and paste raw CSV (same as before) — JSON body with `csvText`.
4. Choose **Clinician** or **Non-clinician** (batch); optionally **Send invite emails now** (depends on Resend/config).
5. **Run import**.
6. **Expect:** Success summary; **Clients** count on the partner row increases when applicable; API returns `createdCount` / per-row errors.

### 3.3 Import — validation

1. Missing header or empty file → clear error.
2. Row missing name or email → row listed in errors.
3. Duplicate emails in batch / already registered users → behaviour per API (errors array); document actual messages during QA.

---

## 4. Cross-flow checks

| Step | What to verify |
|------|----------------|
| Super partner inactive | New corporate partner form does not list it; edit form may still show linked inactive super partner with “(inactive)” label. |
| Restart after `prisma generate` | Dev server restart so Prisma client matches DB (avoids stale model errors). |
| Migrations | `super_partners` table and `superPartnerId` on `super_referral_partners` exist after `20260412100000_super_partners`. |

---

## 5. Optional follow-ups (outside this guide’s scope)

- **Credit pools** approval and **monthly credits** cron — see [`CRON_SETUP.md`](../../CRON_SETUP.md).
- **Public booking** with `?partner=SLUG` — verify branding/logo after partner logo upload.
- **Paystack / coverage** flows — separate payment QA.

---

## Quick checklist (release smoke)

- [ ] Super partners: create, edit, active/inactive behaviour on dropdown  
- [ ] Corporate partners: create independent + under super partner, edit all fields including slug  
- [ ] Sample CSV downloads; import creates rows / shows sensible errors  
- [ ] Admin APIs return JSON errors (not opaque 500) when DB or auth misconfigured  
