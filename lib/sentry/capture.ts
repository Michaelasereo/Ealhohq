import * as Sentry from "@sentry/nextjs";

/**
 * Report an error to Sentry (server-side API routes / cron).
 * Falls back silently when Sentry is not configured so dev works without DSN.
 */
export function captureApiError(
  error: unknown,
  context?: { route?: string; extra?: Record<string, unknown> },
): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context?.route) scope.setTag("api.route", context.route);
    if (context?.extra) scope.setExtras(context.extra);
    Sentry.captureException(error);
  });
}
