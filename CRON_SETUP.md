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

## Environment Variables

Set these in Netlify:

- `CRON_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## Testing Locally

Use the development-only endpoint:

`POST http://localhost:3000/api/test/email-sequence`

This route is disabled in production.
