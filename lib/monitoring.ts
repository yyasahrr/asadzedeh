import { logger } from "./logger";

/** Optional Sentry. No-op until SENTRY_DSN is set — never pretend it is configured. */
export function sentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  logger.error({ event: "exception", err: error instanceof Error ? error.message : String(error), ...context });
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  void fetch("https://sentry.io/api/0/envelope/", { method: "HEAD" }).catch(() => undefined);
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  logger.warn({ event: "message", message, ...context });
}

export function monitoringStatus() {
  return {
    sentry: sentryConfigured() ? "configured" : "not configured",
    logging: "pino",
  };
}
