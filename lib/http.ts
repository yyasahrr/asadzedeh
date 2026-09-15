import { logger } from "./logger";

/**
 * Outbound HTTP with a hard timeout.
 *
 * Every external call in this app (payment gateway, SMS, geocoding, licensing)
 * previously used a bare `fetch`. Node's default is no timeout at all, so a
 * gateway that accepts the connection and then stalls holds a request handler
 * open indefinitely — which under load is how a slow dependency becomes an
 * outage.
 *
 * Retries are allowed only where they are safe:
 *  - the caller must declare the call idempotent, and
 *  - only a network failure or a 5xx/429 is retried.
 * A payment *creation* is never retried: a second attempt would create a second
 * transaction.
 */

export interface FetchOptions extends Omit<RequestInit, "signal"> {
  /** Abort after this many milliseconds. Defaults to 10s. */
  timeoutMs?: number;
  /** Retry a failed idempotent call. Never enable this for money movement. */
  retry?: { attempts?: number; baseDelayMs?: number };
  /** Event name for logs, e.g. "payment.verify". */
  event?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cap the retry backoff so a slow dependency cannot stall a request forever. */
function backoffMs(attempt: number, base: number): number {
  const exponential = base * 2 ** attempt;
  const jitter = Math.random() * base * 0.5;
  return Math.min(exponential + jitter, 8_000);
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError" || /timeout|aborted/i.test(error.message))
  );
}

/**
 * `fetch` with a timeout. Throws on network failure exactly like `fetch`, so
 * existing callers keep working unchanged.
 */
export async function fetchWithTimeout(input: string | URL, options: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retry, event = "http.request", ...init } = options;
  const cappedTimeout = Math.min(Math.max(timeoutMs, 1), MAX_TIMEOUT_MS);
  const attempts = retry ? Math.min(Math.max(retry.attempts ?? 2, 1), 4) : 1;
  const baseDelay = retry?.baseDelayMs ?? 250;

  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("request timed out")), cappedTimeout);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      const retryableStatus = RETRYABLE_STATUS.has(response.status);
      if (!retryableStatus || attempt === attempts - 1) return response;

      logger.warn({ event: `${event}.retry`, attempt: attempt + 1, status: response.status });
      await delay(backoffMs(attempt, baseDelay));
      continue;
    } catch (error) {
      lastError = error;
      const timedOut = isTimeout(error);
      // The caller opted into retries, which means the call is idempotent, so a
      // transient network failure (DNS blip, socket hang up) is worth another
      // attempt. A non-idempotent call never gets here: `attempts` is 1.
      if (attempt === attempts - 1) {
        logger.error({
          event: `${event}.failed`,
          attempt: attempt + 1,
          timedOut,
          err: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
      logger.warn({ event: `${event}.retry`, attempt: attempt + 1, timedOut: true });
      await delay(backoffMs(attempt, baseDelay));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("request failed");
}

/** Parse JSON without letting a malformed body become an unhandled rejection. */
export async function readJson<T = Record<string, unknown>>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
