import { describe, expect, it } from "vitest";
import { SESSION_TTL_MS, isSessionActive, sessionState } from "@/lib/auth";
import type { Session } from "@/lib/types";

const NOW = Date.parse("2026-09-07T12:00:00.000Z");

function session(overrides: Partial<Session> = {}): Session {
  return {
    token: "t",
    userId: "u-1",
    createdAt: "۱۶ شهریور ۱۴۰۵",
    lastSeen: new Date(NOW - 60_000).toISOString(),
    expiresAt: new Date(NOW + 60_000).toISOString(),
    ...overrides,
  };
}

describe("server-side session validity", () => {
  it("accepts a session inside its lifetime", () => {
    expect(sessionState(session(), NOW)).toBe("active");
    expect(isSessionActive(session(), NOW)).toBe(true);
  });

  it("rejects an unknown session", () => {
    expect(sessionState(undefined, NOW)).toBe("unknown");
    expect(sessionState(null, NOW)).toBe("unknown");
  });

  it("rejects a revoked session even while it is still in date", () => {
    const revoked = session({ revokedAt: new Date(NOW - 1000).toISOString() });
    expect(sessionState(revoked, NOW)).toBe("revoked");
    expect(isSessionActive(revoked, NOW)).toBe(false);
  });

  it("rejects a session past its expiry", () => {
    const expired = session({ expiresAt: new Date(NOW - 1).toISOString() });
    expect(sessionState(expired, NOW)).toBe("expired");
  });

  it("rejects a session whose expiry cannot be determined", () => {
    expect(sessionState(session({ expiresAt: undefined, lastSeen: undefined }), NOW)).toBe("expired");
    expect(sessionState(session({ expiresAt: "not-a-date" }), NOW)).toBe("expired");
  });

  it("derives an expiry from lastSeen for sessions written before expiresAt existed", () => {
    const legacy = session({
      expiresAt: undefined,
      lastSeen: new Date(NOW - SESSION_TTL_MS + 60_000).toISOString(),
    });
    expect(sessionState(legacy, NOW)).toBe("active");

    const stale = session({
      expiresAt: undefined,
      lastSeen: new Date(NOW - SESSION_TTL_MS - 60_000).toISOString(),
    });
    expect(sessionState(stale, NOW)).toBe("expired");
  });

  it("never accepts a session with no timestamp at all", () => {
    expect(isSessionActive({ token: "t", userId: "u", createdAt: "x" }, NOW)).toBe(false);
  });
});
