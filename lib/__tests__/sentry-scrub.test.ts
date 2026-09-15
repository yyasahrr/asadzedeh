import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent, scrubHeaders, scrubUrl, scrubValue } from "@/lib/sentry-scrub";

const R = "[redacted]";

describe("sentry scrubbing — nothing secret may leave the process", () => {
  it("redacts every credential-shaped key, at any depth", () => {
    const scrubbed = scrubValue({
      password: "hunter2",
      passwordHash: "$2b$12$abc",
      totp: { secret: "JBSWY3DPEHPK3PXP", recoveryCodes: ["AAAA-BBBB"] },
      session: { token: "az_live_abc" },
      cookie: "az_session=abc",
      authorization: "Bearer abc",
      apiKey: "sk-123",
      databaseUrl: "postgres://u:p@host/db",
      nested: { deeper: { stillDeeper: { appSecret: "x" } } },
    }) as Record<string, Record<string, unknown> | string>;

    expect(scrubbed.password).toBe(R);
    expect(scrubbed.passwordHash).toBe(R);
    expect(scrubbed.totp).toBe(R);
    expect(scrubbed.session).toBe(R);
    expect(scrubbed.cookie).toBe(R);
    expect(scrubbed.authorization).toBe(R);
    expect(scrubbed.apiKey).toBe(R);
    expect(scrubbed.databaseUrl).toBe(R);
    const nested = scrubbed.nested as { deeper: { stillDeeper: { appSecret: string } } };
    expect(nested.deeper.stillDeeper.appSecret).toBe(R);
  });

  it("redacts by shape even when the key looks innocent", () => {
    const scrubbed = scrubValue({
      value: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc",
      other: "Bearer abcdef123456",
      url: "https://abc123def456abc123def456abc123de@sentry.io/1",
      dsn: "postgres://user:hunter2@db.internal:5432/app",
      opaque: "a".repeat(60),
    }) as Record<string, string>;

    for (const key of ["value", "other", "url", "dsn", "opaque"]) {
      expect(scrubbed[key], key).toBe(R);
    }
  });

  it("leaves ordinary values alone", () => {
    const scrubbed = scrubValue({
      orderId: "AZ-1042",
      amount: 1_500_000,
      status: "paid",
      slug: "carpet-basics",
      items: [{ slug: "rug", qty: 2 }],
    }) as Record<string, unknown>;

    expect(scrubbed).toEqual({
      orderId: "AZ-1042",
      amount: 1_500_000,
      status: "paid",
      slug: "carpet-basics",
      items: [{ slug: "rug", qty: 2 }],
    });
  });

  it("does not mutate the caller's object", () => {
    const original = { password: "hunter2", name: "سارا" };
    scrubValue(original);
    expect(original.password).toBe("hunter2");
  });

  it("stops recursing instead of blowing the stack", () => {
    const deep: Record<string, unknown> = { leaf: "x" };
    let cursor = deep;
    for (let i = 0; i < 20; i += 1) {
      cursor.child = { leaf: `level-${i}` };
      cursor = cursor.child as Record<string, unknown>;
    }
    expect(() => scrubValue(deep)).not.toThrow();
  });
});

describe("request headers", () => {
  it("redacts cookies and authorization", () => {
    const headers = scrubHeaders({
      cookie: "az_session=secret",
      authorization: "Bearer secret",
      "x-csrf-token": "abc",
      "content-type": "application/json",
      host: "asadzedeh.ir",
    })!;

    expect(headers.cookie).toBe(R);
    expect(headers.authorization).toBe(R);
    expect(headers["x-csrf-token"]).toBe(R);
    expect(headers["content-type"]).toBe("application/json");
    expect(headers.host).toBe("asadzedeh.ir");
  });
});

describe("query strings", () => {
  it("redacts sensitive parameters from a payment callback URL", () => {
    const cleaned = scrubUrl("/api/payment/callback?Authority=000000&Status=OK&order=AZ-1")!;
    expect(cleaned).toContain("Authority=[redacted]");
    expect(cleaned).toContain("Status=OK");
    expect(cleaned).toContain("order=AZ-1");
    expect(cleaned).not.toContain("000000");
  });

  it("leaves a URL without a query untouched", () => {
    expect(scrubUrl("/dashboard/orders")).toBe("/dashboard/orders");
    expect(scrubUrl(undefined)).toBeUndefined();
  });
});

describe("the beforeSend hook", () => {
  it("scrubs the whole event surface", () => {
    const event = scrubEvent({
      request: {
        url: "/auth?next=%2Fdashboard&password=x",
        headers: { cookie: "az_session=abc", host: "asadzedeh.ir" },
        cookies: { az_session: "abc" },
        data: { phone: "09120000001", password: "hunter2" },
      },
      user: { id: "u-1", email: "a@b.c", password: "hunter2" },
      extra: { sessionToken: "abc", orderId: "AZ-1" },
      contexts: { payment: { merchantId: "M1", amount: 1000 } },
    });

    expect(event.request!.cookies).toBe(R);
    expect(event.request!.headers!.cookie).toBe(R);
    expect(event.request!.url).not.toContain("%2Fdashboard&password=x");
    expect((event.request!.data as Record<string, string>).password).toBe(R);
    expect((event.request!.data as Record<string, string>).phone).toBe("09120000001");
    expect(event.user!.password).toBe(R);
    expect(event.user!.id).toBe("u-1");
    expect(event.extra!.sessionToken).toBe(R);
    expect(event.extra!.orderId).toBe("AZ-1");
    expect((event.contexts!.payment as Record<string, unknown>).merchantId).toBe(R);
  });
});

describe("the beforeBreadcrumb hook", () => {
  it("scrubs breadcrumb data", () => {
    const crumb = scrubBreadcrumb({
      type: "http",
      data: { url: "/auth", password: "hunter2", status: 200 },
    });
    expect((crumb.data as Record<string, unknown>).password).toBe(R);
    expect((crumb.data as Record<string, unknown>).status).toBe(200);
  });
});
