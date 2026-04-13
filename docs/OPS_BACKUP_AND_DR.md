# Backups and disaster recovery (Supabase Postgres)

Ealho Therapy stores production data in **Supabase** (managed PostgreSQL). This document describes what to configure outside the app repo and how to recover.

## Automated backups (Supabase)

1. In the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Database** → **Backups**:
   - **Pro and above**: daily backups and **Point-in-Time Recovery (PITR)** are available per plan.
   - Note your **retention window** and upgrade the plan if you need longer history.

2. **Who can restore**: only project owners / org admins with dashboard access. Document who that is for your team.

## Before a risky migration

- Take a **manual backup** or ensure a recent automatic snapshot exists.
- For Prisma migrations, run against staging first when possible.

## Restore (high level)

1. Use Supabase dashboard **Restore** / support flow for your plan, or restore from a downloaded backup into a **new** database instance, then point `DATABASE_URL` / `DIRECT_URL` at the new instance (and update Netlify env vars) after verification.

2. **Never** paste production `DATABASE_URL` into public channels.

## Application secrets

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, and DB URLs in **Netlify** (or your host) environment only.
- Rotating Supabase keys may require redeploy and invalidating old sessions; plan a short maintenance window if needed.

## Related

- [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) — auth and SMTP
- [CRON_SETUP.md](../CRON_SETUP.md) — scheduled jobs
