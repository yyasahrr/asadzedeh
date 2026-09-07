/**
 * Sentry payload scrubbing.
 *
 * Everything here is deliberately defensive: an error report is sent to a
 * third party, so the default is to remove a field unless we are sure it is
 * safe. This runs in `beforeSend` on every event, and in `beforeBreadcrumb` on
 * every breadcrumb, so a secret can never ride along in a stack-adjacent dump.
 */

/** Field names whose values must never leave the process. */
const SENSITIVE_KEYS = [
  "password",
  "pass",
  "passwordhash",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "secret",
  "totp",
  "totpsecret",
  "recoverycode",
  "recoverycodes",
  "code",
  "token",
  "accesstoken",
  "refreshtoken",
  "sessiontoken",
  "session",
  "cookie",
  "cookies",
  "authorization",
  "auth",
  "apikey",
  "api_key",
  "appsecret",
  "app_secret",
  "merchantid",
  "authority",
  "dsn",
  "database_url",
  "databaseurl",
  "connectionstring",
  "privatekey",
  "private_key",
  "smtp_pass",
  "smtppassword",
  "app_secret",
  "appsecret",
];

/** Partial matches, because payloads nest things like `spotplayer.apiKey`. */
const SENSITIVE_FRAGMENTS = [
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "credential",
  "privatekey",
  "private_key",
  "signature",
  "otp",
  "totp",
  "recovery",
];

const REDACTED = "[redacted]";

/** Values that look like a bearer token, a JWT or a DSN, whatever the key is. */
const SECRET_VALUE_PATTERNS = [
  /^Bearer\s+[A-Za-z0-9._\-]+$/i,
  /^eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./, // JWT
  /^https:\/\/[a-f0-9]{32}@[a-z0-9.-]+\/\d+$/i, // Sentry DSN
  /^postgres(ql)?:\/\/[^@\s]+:[^@\s]+@/i, // connection string with a password
  /^[A-Za-z0-9._-]{40,}$/, // long opaque tokens
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (SENSITIVE_KEYS.includes(normalized)) return true;
  return SENSITIVE_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function looksLikeSecret(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/** Redact an object graph in place-safe fashion (never mutates the input). */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value === null || value === undefined) return value;

  if (typeof value === "string") return looksLikeSecret(value) ? REDACTED : value;
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) return value.slice(0, 50).map((item) => scrubValue(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key) ? REDACTED : scrubValue(item, depth + 1);
  }
  return output;
}

/**
 * Strip sensitive request headers. Cookies and Authorization are the two that
 * actually leak session tokens in practice.
 */
export function scrubHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return headers;
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (isSensitiveKey(lower) || lower === "x-csrf-token" || lower === "proxy-authorization") {
      output[key] = REDACTED;
    } else {
      output[key] = looksLikeSecret(value) ? REDACTED : value;
    }
  }
  return output;
}

/**
 * Drop query-string values for sensitive parameters, e.g.
 * `/api/payment/callback?Authority=0000...`.
 */
export function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const separator = url.indexOf("?");
  if (separator < 0) return url;
  const [base, query] = [url.slice(0, separator), url.slice(separator + 1)];
  const cleaned = query
    .split("&")
    .map((pair) => {
      const [key] = pair.split("=");
      return isSensitiveKey(decodeURIComponent(key ?? "")) ? `${key}=${REDACTED}` : pair;
    })
    .join("&");
  return `${base}?${cleaned}`;
}

export interface ScrubbableEvent {
  request?: {
    headers?: Record<string, string>;
    cookies?: unknown;
    data?: unknown;
    url?: string;
  };
  user?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
}

/**
 * The `beforeSend` hook. Returns the event with secrets removed, or `null` to
 * drop it entirely when there is nothing left worth sending.
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const next = { ...event };

  if (next.request) {
    next.request = {
      ...next.request,
      headers: scrubHeaders(next.request.headers) ?? {},
      cookies: REDACTED,
      data: scrubValue(next.request.data),
      url: scrubUrl(next.request.url),
    };
  }

  if (next.user) {
    // Keep an identifier for grouping, drop anything credential-shaped.
    next.user = scrubValue(next.user) as Record<string, unknown>;
  }
  if (next.extra) next.extra = scrubValue(next.extra) as Record<string, unknown>;
  if (next.contexts) next.contexts = scrubValue(next.contexts) as Record<string, unknown>;

  return next;
}

/** The `beforeBreadcrumb` hook. */
export function scrubBreadcrumb<T extends { data?: unknown; type?: string }>(breadcrumb: T): T {
  return { ...breadcrumb, data: scrubValue(breadcrumb.data) as T["data"] };
}

export const SENSITIVE_KEY_LIST = [...SENSITIVE_KEYS] as const;
