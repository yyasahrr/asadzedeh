/**
 * In-process sliding-window rate limiter.
 * Redis is not required for V1. Multi-instance deploys should put a reverse-proxy limit in front.
 */

type Bucket = { times: number[] };

const buckets = new Map<string, Bucket>();

const MAX_KEYS = 20_000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    bucket.times = bucket.times.filter((t) => now - t < 3600_000);
    if (bucket.times.length === 0) buckets.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key) ?? { times: [] };
  bucket.times = bucket.times.filter((t) => now - t < windowMs);
  if (bucket.times.length >= limit) {
    const oldest = bucket.times[0] ?? now;
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) };
  }
  bucket.times.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.times.length, retryAfterSec: 0 };
}

export function clientKey(ip: string, scope: string): string {
  return `${scope}:${ip || "unknown"}`;
}

export const LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  otp: { limit: 8, windowMs: 15 * 60_000 },
  totp: { limit: 10, windowMs: 15 * 60_000 },
  certVerify: { limit: 30, windowMs: 15 * 60_000 },
  payment: { limit: 10, windowMs: 15 * 60_000 },
  upload: { limit: 20, windowMs: 60 * 60_000 },
  search: { limit: 60, windowMs: 60_000 },
} as const;
