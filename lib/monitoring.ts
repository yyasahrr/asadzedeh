import * as Sentry from "@sentry/nextjs";
import { logger } from "./logger";

/**
 * Monitoring facade.
 *
 * Logging via Pino is always on and is the primary record. Sentry is an
 * optional external destination: it is only "configured" when a client is
 * actually initialised and enabled, never merely because a DSN string exists.
 */

export function sentryConfigured(): boolean {
  const client = Sentry.getClient();
  return Boolean(client && client.getOptions().enabled !== false);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  logger.error({ event: "exception", err: error instanceof Error ? error.message : String(error), ...context });
  if (!sentryConfigured()) return;
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  logger.warn({ event: "message", message, ...context });
  if (!sentryConfigured()) return;
  Sentry.captureMessage(message, { extra: context });
}

export function monitoringStatus() {
  return {
    sentry: sentryConfigured() ? "configured" : "not configured",
    logging: "pino",
  };
}
