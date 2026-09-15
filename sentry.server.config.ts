import * as Sentry from "@sentry/nextjs";
import { scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub";

/**
 * Server-side Sentry.
 *
 * Initialising with no DSN is a genuine no-op: `Sentry.init` leaves the client
 * disabled, so nothing is sent and `/api/health` reports the honest status
 * (`not configured`). That is the correct state for a deployment that has not
 * been given credentials — it is never reported as configured.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  enabled: Boolean(process.env.SENTRY_DSN),

  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  release: process.env.SENTRY_RELEASE || undefined,

  // A modular monolith on a single Node process: sample modestly, and let
  // traces follow the request.
  tracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1") || 0,
  sendDefaultPii: false,

  beforeSend(event) {
    return scrubEvent(event);
  },
  beforeBreadcrumb(breadcrumb) {
    return scrubBreadcrumb(breadcrumb);
  },

  // Never let the reporter itself take the site down.
  ignoreErrors: ["ResizeObserver loop limit exceeded", "NEXT_REDIRECT", "NEXT_NOT_FOUND"],
});
