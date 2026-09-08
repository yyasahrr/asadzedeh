import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, PaymentSettings } from "@/lib/types";

/**
 * Payment gateway layer.
 *
 * These pin the things that cost money if they drift: which driver handles which
 * provider, that amounts leave the app in Rial, that an unconfigured gateway
 * refuses instead of silently charging nobody, and that a verify response which
 * does not match the order is rejected rather than trusted.
 *
 * No test here contacts a real gateway — every call is answered by a stub, so
 * nothing can be charged.
 */

const realFetch = globalThis.fetch;

let settings: PaymentSettings;
let demoAllowed = true;

vi.mock("@/lib/store", () => ({
  getSettings: () => ({ payment: settings }),
}));

// Production forbids demo payments, which is the only context where an
// unconfigured gateway surfaces its own error instead of the demo message.
vi.mock("@/lib/env", () => ({
  demoPaymentAllowed: () => demoAllowed,
}));

function order(over: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    student: "سارا محمدی",
    item: "دوره قالی‌بافی",
    amount: 250_000, // Toman
    status: "در انتظار پرداخت",
    phone: "09120000002",
    ...over,
  } as Order;
}

/** Records every request the drivers make. */
const calls: { url: string; init?: RequestInit; body: unknown }[] = [];

function stub(responses: Record<string, unknown | string>) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init, body: init?.body ? String(init.body) : undefined });
    for (const [match, payload] of Object.entries(responses)) {
      if (url.includes(match)) {
        const body = typeof payload === "string" ? payload : JSON.stringify(payload);
        return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
      }
    }
    return new Response(JSON.stringify({ error: "unexpected" }), { status: 404 });
  }) as typeof fetch;
}

beforeEach(() => {
  calls.length = 0;
  demoAllowed = true;
  settings = { provider: "zarinpal", merchantId: "M-123", secret: "", sandbox: true };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.clearAllMocks();
});

describe("gateway registry", () => {
  it("registers every real gateway and never demo", async () => {
    const { getDriver, listDrivers } = await import("@/lib/gateways/registry");
    expect(listDrivers().map((d) => d.id).sort()).toEqual(["idpay", "payping", "zarinpal", "zibal"]);
    expect(getDriver("zarinpal")?.id).toBe("zarinpal");
    // demo is the absence of a gateway, not one of them
    expect(getDriver("demo")).toBeUndefined();
  });

  it("marks only the OAuth gateway as needing a secret", async () => {
    const { listDrivers } = await import("@/lib/gateways/registry");
    const needing = listDrivers().filter((d) => d.needsSecret).map((d) => d.id);
    expect(needing).toEqual(["payping"]);
  });
});

describe("configured-gateway guard", () => {
  it("treats an empty credential as demo mode outside production", async () => {
    settings = { provider: "zarinpal", merchantId: "", secret: "", sandbox: true };
    const { requestPayment } = await import("@/lib/payment");
    const r = await requestPayment(order(), "https://shop.test/cb");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("درگاه نمایشی فعال است");
    expect(calls).toHaveLength(0);
  });

  it("refuses an unconfigured gateway outright in production", async () => {
    demoAllowed = false;
    settings = { provider: "zarinpal", merchantId: "", secret: "", sandbox: false };
    const { requestPayment } = await import("@/lib/payment");
    const r = await requestPayment(order(), "https://shop.test/cb");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("درگاه پرداخت پیکربندی نشده است");
    expect(calls).toHaveLength(0);
  });

  it("refuses an OAuth gateway that is missing its secret", async () => {
    demoAllowed = false;
    settings = { provider: "payping", merchantId: "client-1", secret: "", sandbox: false };
    const { requestPayment } = await import("@/lib/payment");
    const r = await requestPayment(order(), "https://shop.test/cb");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("درگاه پرداخت پیکربندی نشده است");
    expect(calls).toHaveLength(0);
  });

  it("never short-circuits to demo in production", async () => {
    demoAllowed = false;
    settings = { provider: "demo", merchantId: "", secret: "", sandbox: true };
    const { isDemoPayment, verifyPayment } = await import("@/lib/payment");
    expect(isDemoPayment()).toBe(false);
    // and verify does not mint a fake reference either
    const r = await verifyPayment(order(), "x");
    expect(r.ok).toBe(false);
  });

  it("refuses an unknown provider rather than failing at the gateway", async () => {
    settings = { provider: "nope" as PaymentSettings["provider"], merchantId: "x", secret: "", sandbox: false };
    const { requestPayment } = await import("@/lib/payment");
    const r = await requestPayment(order(), "https://shop.test/cb");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("درگاه پرداخت پشتیبانی‌نشده");
  });
});

describe("zarinpal", () => {
  it("converts Toman to Rial and returns the gate URL", async () => {
    stub({ "payment/request.json": { data: { code: 100, authority: "AUTH-9" } } });
    const { requestPayment } = await import("@/lib/payment");
    const r = await requestPayment(order({ amount: 250_000 }), "https://shop.test/cb");
    expect(r.ok).toBe(true);
    expect(r.authority).toBe("AUTH-9");
    expect(r.payUrl).toContain("/pg/StartPay/AUTH-9");
    const body = JSON.parse(calls[0].body as string);
    expect(body.amount).toBe(2_500_000); // Rial
    expect(body.callback_url).toBe("https://shop.test/cb?order=ord-1");
  });

  it("treats code 101 as already verified", async () => {
    stub({ "payment/verify.json": { data: { code: 101, ref_id: 55 } } });
    const { verifyPayment } = await import("@/lib/payment");
    const r = await verifyPayment(order(), "AUTH-9");
    expect(r).toEqual({ ok: true, alreadyVerified: true, refId: "55" });
  });
});

describe("idpay", () => {
  beforeEach(() => {
    settings = { provider: "idpay", merchantId: "KEY-1", secret: "", sandbox: true };
  });

  it("authenticates by header and honours the sandbox flag", async () => {
    stub({ "/payment": { id: "TX-1", link: "https://idpay.ir/p/ws/abc" } });
    const { requestPayment } = await import("@/lib/payment");
    const r = await requestPayment(order(), "https://shop.test/cb");
    expect(r.ok).toBe(true);
    expect(r.payUrl).toBe("https://idpay.ir/p/ws/abc");
    const h = calls[0].init?.headers as Record<string, string>;
    expect(h["X-API-KEY"]).toBe("KEY-1");
    expect(h["X-SANDBOX"]).toBe("1");
  });

  it("accepts every status that means the money moved", async () => {
    for (const status of [100, 101, 200]) {
      calls.length = 0;
      stub({ "payment/verify": { status, track_id: 880 } });
      const { verifyPayment } = await import("@/lib/payment");
      const r = await verifyPayment(order(), "TX-1");
      expect(r.ok).toBe(true);
      expect(r.refId).toBe("880");
      // only the first confirmation is a new one
      expect(r.alreadyVerified).toBe(status !== 100);
    }
  });

  it("rejects a status that means unpaid", async () => {
    stub({ "payment/verify": { status: 2, error_message: "پرداخت ناموفق" } });
    const { verifyPayment } = await import("@/lib/payment");
    const r = await verifyPayment(order(), "TX-1");
    expect(r.ok).toBe(false);
  });
});

describe("zibal", () => {
  beforeEach(() => {
    settings = { provider: "zibal", merchantId: "zibal-merchant", secret: "", sandbox: false };
  });

  it("uses the literal sandbox merchant when sandbox is on", async () => {
    settings = { ...settings, sandbox: true };
    stub({ "merchant/start": { result: 100, trackId: 777 } });
    const { requestPayment } = await import("@/lib/payment");
    await requestPayment(order(), "https://shop.test/cb");
    expect(JSON.parse(calls[0].body as string).merchant).toBe("zibal");
  });

  it("refuses a verified amount that does not match the order", async () => {
    // The gateway says "paid" but for a different sum. Trusting that ref would
    // hand the customer an order they did not pay for.
    stub({ "merchant/verify": { result: 100, status: 1, refNumber: 42, amount: 1_000 } });
    const { verifyPayment } = await import("@/lib/payment");
    const r = await verifyPayment(order({ amount: 250_000 }), "777");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("همخوانی ندارد");
  });

  it("accepts a verified amount that does match", async () => {
    stub({ "merchant/verify": { result: 100, status: 1, refNumber: 42, amount: 2_500_000 } });
    const { verifyPayment } = await import("@/lib/payment");
    const r = await verifyPayment(order({ amount: 250_000 }), "777");
    expect(r).toEqual({ ok: true, refId: "42" });
  });
});

describe("payping", () => {
  beforeEach(() => {
    settings = { provider: "payping", merchantId: "client-1", secret: "sec-1", sandbox: false };
  });

  it("exchanges the client pair for a token before paying", async () => {
    stub({ "oauth/token": { access_token: "TOK-1" }, "/v2/pay": "CODE-9" });
    const { requestPayment } = await import("@/lib/payment");
    const r = await requestPayment(order(), "https://shop.test/cb");
    expect(r.ok).toBe(true);
    expect(r.authority).toBe("CODE-9");
    expect(r.payUrl).toContain("/pay/gotoipg/CODE-9");
    expect(calls[0].url).toContain("oauth/token");
    const h = calls[1].init?.headers as Record<string, string>;
    expect(h.authorization).toBe("Bearer TOK-1");
  });

  it("fails closed when the token exchange fails", async () => {
    globalThis.fetch = (async () => new Response("{}", { status: 401 })) as typeof fetch;
    const { requestPayment } = await import("@/lib/payment");
    const r = await requestPayment(order(), "https://shop.test/cb");
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});
