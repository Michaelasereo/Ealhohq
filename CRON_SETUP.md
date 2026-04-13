# Cron Job Setup

Since this project runs on Netlify, use cron-job.org to trigger the daily email sequence.

## Setup Steps

1. Go to cron-job.org and create a free account.
2. Click **CREATE CRONJOB**.
3. Configure:
   - **Title:** Ealho Email Sequence
   - **URL:** `https://ealho.com/api/cron/email-sequence`
   - **Method:** GET
   - **Execution schedule:** Daily at 08:00 WAT (set 07:00 UTC)
   - **Headers:**
     - Key: `Authorization`
     - Value: `Bearer YOUR_CRON_SECRET_HERE`
4. Save and enable.

## Partner monthly credits (employer pool)

Syncs active partner staff `monthlyCreditsRemaining` with the **approved** pool for the current month (WAT). The route is safe to call on a schedule; it only applies database updates on the **1st** of each month in West Africa Time.

1. Create a second job (or combine with your existing cron provider).
2. Configure:
   - **URL:** `https://YOUR_DOMAIN/api/cron/partner-monthly-credits`
   - **Method:** GET
   - **Execution schedule:** Once daily (the handler **no-ops** except on the 1st WAT), or monthly on day 1 if your provider supports it.
   - **Headers:**
     - Key: `Authorization`
     - Value: `Bearer YOUR_CRON_SECRET_HERE` (same `CRON_SECRET` as other cron routes)

If the request is not on the 1st (WAT), the response is `{ success: true, skipped: true }` — useful for daily schedules without double-applying credits.

## Environment Variables

Set these in Netlify:

- `CRON_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## Testing Locally

Use the development-only endpoint:

`POST http://localhost:3000/api/test/email-sequence`

This route is disabled in production.
