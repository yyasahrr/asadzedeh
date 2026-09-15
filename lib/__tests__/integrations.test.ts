import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/lib/types";

/**
 * MeliPayamak (ملی پیامک) and Zibal (زیبال) — the two integrations this
 * deployment launches with.
 *
 * Neither can be called for real from a test run, so `fetch` is stubbed and the
 * assertions are on the wire format: the URL, the headers, the body and how each
 * provider's success/failure vocabulary is translated. That is the part that
 * breaks silently — a wrong field name returns a well-formed HTTP 200 and a
 * message nobody receives.
 */

const APP_SECRET = "test-secret-for-ci-only-0123456789";

function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init: RequestInit = {}) => {
      const url = String(input);
      calls.push({ url, init });
      return handler(url, init);
    }),
  );
  return calls;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "AZ-9100",
    student: "هنرجوی تست",
    item: "گبه‌بافی (آنلاین)",
    amount: 1_750_000,
    status: "در انتظار پرداخت",
    date: "۱۵ شهریور ۱۴۰۵",
    phone: "09121112233",
    ...overrides,
  } as Order;
}

/** Fresh modules per case: `getEnv()` and the settings cache both memoise. */
async function loadModules(env: Record<string, string>) {
  Object.assign(process.env, { NODE_ENV: "production", APP_SECRET, PGLITE_DIR: "memory" }, env);
  vi.resetModules();
  const store = await import("@/lib/store");
  // The document cache hangs off `globalThis`, so it survives `resetModules()`.
  // Reset the two integration blocks explicitly or one case's stored settings
  // leak into the next.
  const { defaultSettings } = await import("@/lib/seed");
  store.writeDb({
    settings: {
      ...store.getSettings(),
      sms: defaultSettings.sms,
      payment: defaultSettings.payment,
    },
  });
  return {
    store,
    integrations: await import("@/lib/integrations"),
    sms: await import("@/lib/sms"),
    zibal: (await import("@/lib/gateways/zibal")).zibal,
    payment: await import("@/lib/payment"),
  };
}

/** Variables that must be *absent*, not empty, between cases. */
const CLEARED_ENV = [
  "SMS_PROVIDER",
  "SMS_API_KEY",
  "SMS_API_SECRET",
  "SMS_SENDER",
  "SMS_SENDER_NUMBER",
  "SMS_TEMPLATE_ID",
  "MELIPAYAMAK_USERNAME",
  "MELIPAYAMAK_PASSWORD",
  "PAYMENT_PROVIDER",
  "PAYMENT_MERCHANT_ID",
  "PAYMENT_SECRET",
  "PAYMENT_SANDBOX",
  "ZIBAL_MERCHANT",
] as const;

function clearEnv() {
  for (const key of CLEARED_ENV) delete process.env[key];
}

beforeEach(() => {
  clearEnv();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  Object.assign(process.env, { NODE_ENV: "test" });
  clearEnv();
});

describe("integration configuration", () => {
  it("defaults to demo providers when nothing is configured", async () => {
    const { integrations } = await loadModules({});
    expect(integrations.effectiveSmsSettings().provider).toBe("demo");
    expect(integrations.effectivePaymentSettings().provider).toBe("demo");
    expect(integrations.smsConfigured()).toBe(false);
    expect(integrations.paymentConfigured()).toBe(false);
  });

  it("takes MeliPayamak credentials from the environment", async () => {
    const { integrations } = await loadModules({
      MELIPAYAMAK_USERNAME: "asadzedeh-user",
      MELIPAYAMAK_PASSWORD: "panel-secret",
      SMS_SENDER_NUMBER: "3000505",
    });
    const sms = integrations.effectiveSmsSettings();
    // Provider is inferred, so two variables are enough to go live.
    expect(sms.provider).toBe("melipayamak");
    expect(sms.apiKey).toBe("asadzedeh-user");
    expect(sms.secret).toBe("panel-secret");
    expect(sms.sender).toBe("3000505");
    expect(integrations.smsConfigured()).toBe(true);
  });

  it("takes the Zibal merchant from the environment and leaves sandbox off", async () => {
    const { integrations } = await loadModules({ ZIBAL_MERCHANT: "zibal-merchant-123" });
    const payment = integrations.effectivePaymentSettings();
    expect(payment.provider).toBe("zibal");
    expect(payment.merchantId).toBe("zibal-merchant-123");
    expect(payment.sandbox).toBe(false);
    expect(integrations.paymentConfigured()).toBe(true);
    expect(integrations.paymentSandbox()).toBe(false);
  });

  it("uses the stored settings when the environment says nothing", async () => {
    const { integrations, store } = await loadModules({});
    store.writeDb({
      settings: {
        ...store.getSettings(),
        payment: { provider: "zarinpal", merchantId: "from-database", secret: "", sandbox: false },
      },
    });
    expect(integrations.effectivePaymentSettings()).toMatchObject({
      provider: "zarinpal",
      merchantId: "from-database",
    });
  });

  it("lets the environment override what the admin panel stored", async () => {
    const { integrations, store } = await loadModules({
      ZIBAL_MERCHANT: "from-env",
      PAYMENT_PROVIDER: "zibal",
    });
    store.writeDb({
      settings: {
        ...store.getSettings(),
        payment: { provider: "zarinpal", merchantId: "from-database", secret: "", sandbox: false },
      },
    });
    expect(integrations.effectivePaymentSettings()).toMatchObject({
      provider: "zibal",
      merchantId: "from-env",
    });
  });

  it("honours an explicit sandbox switch from the environment", async () => {
    const { integrations } = await loadModules({ ZIBAL_MERCHANT: "m", PAYMENT_SANDBOX: "true" });
    expect(integrations.paymentSandbox()).toBe(true);
  });

  it("reports integration state without leaking a credential", async () => {
    const { integrations } = await loadModules({
      MELIPAYAMAK_USERNAME: "asadzedeh-user",
      MELIPAYAMAK_PASSWORD: "panel-secret",
      ZIBAL_MERCHANT: "zibal-merchant-123",
    });
    const json = JSON.stringify(integrations.integrationStatus());
    expect(json).not.toContain("panel-secret");
    expect(json).not.toContain("asadzedeh-user");
    expect(json).not.toContain("zibal-merchant-123");
    expect(integrations.integrationStatus().payment.configured).toBe(true);
    expect(integrations.integrationStatus().sms.configured).toBe(true);
  });

  it("warns in production about an unconfigured gateway and panel", async () => {
    const { integrations } = await loadModules({});
    const warnings = integrations.integrationWarnings();
    expect(warnings.some((w) => w.includes("درگاه پرداخت"))).toBe(true);
    expect(warnings.some((w) => w.includes("سامانه پیامک"))).toBe(true);
  });
});

describe("MeliPayamak driver", () => {
  it("posts the documented form fields to the panel endpoint", async () => {
    const calls = stubFetch(() => jsonResponse({ RetStatus: 1, StrRetStatus: "OK", Value: 12345 }));
    const { sms } = await loadModules({});
    const driver = sms.getSmsDriver("melipayamak")!;

    const result = await driver.send(["09121112233"], "سفارش شما ثبت شد", {
      apiKey: "asadzedeh-user",
      secret: "panel-secret",
      sender: "3000505",
      templateId: "",
    });

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://rest.payamak-panel.com/api/SendSMS/SendSMS");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({ "content-type": "application/x-www-form-urlencoded" });
    const form = new URLSearchParams(String(calls[0].init.body));
    expect(form.get("username")).toBe("asadzedeh-user");
    expect(form.get("password")).toBe("panel-secret");
    expect(form.get("from")).toBe("3000505");
    expect(form.get("to")).toBe("09121112233");
    expect(form.get("text")).toBe("سفارش شما ثبت شد");
    expect(form.get("isFlash")).toBe("false");
  });

  it("sends a one-time code through the service-number template when configured", async () => {
    const calls = stubFetch(() => jsonResponse({ RetStatus: 1, Value: 999 }));
    const { sms } = await loadModules({});
    const driver = sms.getSmsDriver("melipayamak")!;

    const result = await driver.sendCode!("09121112233", "482913", {
      apiKey: "asadzedeh-user",
      secret: "panel-secret",
      sender: "3000505",
      templateId: "74812",
    });

    expect(result.ok).toBe(true);
    expect(calls[0].url).toBe("https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber");
    const form = new URLSearchParams(String(calls[0].init.body));
    expect(form.get("bodyId")).toBe("74812");
    expect(form.get("text")).toBe("482913");
    // A template send must not also carry a freeform message.
    expect(form.has("from")).toBe(false);
  });

  it("falls back to a freeform code message when no template is set", async () => {
    const calls = stubFetch(() => jsonResponse({ RetStatus: 1, Value: 999 }));
    const { sms } = await loadModules({});
    await sms.getSmsDriver("melipayamak")!.sendCode!("09121112233", "482913", {
      apiKey: "u",
      secret: "p",
      sender: "3000505",
      templateId: "",
    });
    expect(calls[0].url).toBe("https://rest.payamak-panel.com/api/SendSMS/SendSMS");
    expect(new URLSearchParams(String(calls[0].init.body)).get("text")).toContain("482913");
  });

  it("reports the panel's own error text when it refuses", async () => {
    stubFetch(() => jsonResponse({ RetStatus: 0, StrRetStatus: "اعتبار کافی نیست", Value: -1 }));
    const { sms } = await loadModules({});
    const result = await sms.getSmsDriver("melipayamak")!.send(["09121112233"], "x", {
      apiKey: "u",
      secret: "p",
      sender: "3000505",
      templateId: "",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("اعتبار کافی نیست");
  });

  it("refuses to send without the web-service password", async () => {
    const calls = stubFetch(() => jsonResponse({ RetStatus: 1, Value: 1 }));
    const { sms } = await loadModules({});
    const result = await sms.getSmsDriver("melipayamak")!.send(["09121112233"], "x", {
      apiKey: "u",
      secret: "",
      sender: "3000505",
      templateId: "",
    });
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("surfaces a failure when any recipient fails", async () => {
    let n = 0;
    stubFetch(() => {
      n += 1;
      return jsonResponse(n === 1 ? { RetStatus: 1, Value: 1 } : { RetStatus: 0, StrRetStatus: "شماره نامعتبر", Value: 0 });
    });
    const { sms } = await loadModules({});
    const result = await sms.getSmsDriver("melipayamak")!.send(["09121112233", "0912000"], "x", {
      apiKey: "u",
      secret: "p",
      sender: "3000505",
      templateId: "",
    });
    expect(result.ok).toBe(false);
  });
});

describe("Zibal driver", () => {
  const creds = { merchantId: "zibal-merchant-123", secret: "", sandbox: false };

  it("creates a transaction in Rial and returns the start URL", async () => {
    const calls = stubFetch(() => jsonResponse({ result: 100, trackId: 88776655 }));
    const { zibal } = await loadModules({});

    const result = await zibal.request(
      { order: order(), callbackUrl: "https://asadzedeh.ir/api/payment/callback" },
      creds,
    );

    expect(result).toMatchObject({ ok: true, authority: "88776655" });
    expect(result.payUrl).toBe("https://gateway.zibal.ir/start/88776655");
    expect(calls[0].url).toBe("https://gateway.zibal.ir/v1/request");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.merchant).toBe("zibal-merchant-123");
    // 1,750,000 Toman must reach the gateway as 17,500,000 Rial.
    expect(body.amount).toBe(17_500_000);
    expect(body.orderId).toBe("AZ-9100");
    expect(body.callbackUrl).toBe("https://asadzedeh.ir/api/payment/callback?order=AZ-9100");
    expect(body.mobile).toBe("09121112233");
  });

  it("substitutes the sandbox merchant when sandbox is on", async () => {
    const calls = stubFetch(() => jsonResponse({ result: 100, trackId: 1 }));
    const { zibal } = await loadModules({});
    await zibal.request({ order: order(), callbackUrl: "https://x.test/cb" }, { ...creds, sandbox: true });
    expect(JSON.parse(String(calls[0].init.body)).merchant).toBe("zibal");
  });

  it("refuses a gateway rejection instead of inventing a payment URL", async () => {
    stubFetch(() => jsonResponse({ result: 102, message: "merchant not found" }));
    const { zibal } = await loadModules({});
    const result = await zibal.request({ order: order(), callbackUrl: "https://x.test/cb" }, creds);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("merchant not found");
    expect(result.payUrl).toBeUndefined();
  });

  it("verifies server-to-server and returns the reference number", async () => {
    const calls = stubFetch(() => jsonResponse({ result: 100, refNumber: 55443322, amount: 17_500_000 }));
    const { zibal } = await loadModules({});
    const result = await zibal.verify(order(), "88776655", creds);
    expect(result).toMatchObject({ ok: true, refId: "55443322" });
    expect(calls[0].url).toBe("https://gateway.zibal.ir/v1/verify");
    expect(JSON.parse(String(calls[0].init.body)).trackId).toBe("88776655");
  });

  it("treats result 201 as already verified, not as a new payment", async () => {
    stubFetch(() => jsonResponse({ result: 201, refNumber: 55443322, amount: 17_500_000 }));
    const { zibal } = await loadModules({});
    const result = await zibal.verify(order(), "88776655", creds);
    expect(result).toMatchObject({ ok: true, alreadyVerified: true });
  });

  it("rejects a verified amount that does not match the order", async () => {
    stubFetch(() => jsonResponse({ result: 100, refNumber: 55443322, amount: 10 }));
    const { zibal } = await loadModules({});
    const result = await zibal.verify(order(), "88776655", creds);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("همخوانی ندارد");
  });

  it("turns a gateway outage into a failed verification rather than a throw", async () => {
    stubFetch(() => {
      throw new Error("socket hang up");
    });
    const { zibal } = await loadModules({});
    const result = await zibal.verify(order(), "88776655", creds);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("socket hang up");
  });
});

describe("payment dispatcher in production", () => {
  it("refuses to run the demo gateway", async () => {
    const { payment } = await loadModules({});
    expect(payment.isDemoPayment()).toBe(false);
    const result = await payment.requestPayment(order(), "https://asadzedeh.ir/api/payment/callback");
    expect(result.ok).toBe(false);
  });

  it("names Zibal once the merchant is configured", async () => {
    const { payment } = await loadModules({ ZIBAL_MERCHANT: "zibal-merchant-123" });
    expect(payment.paymentGatewayId()).toBe("zibal");
    expect(payment.isDemoPayment()).toBe(false);
    expect(payment.configuredPaymentProvider()).toBe("zibal");
  });

  it("drives the Zibal driver end to end through the dispatcher", async () => {
    stubFetch((url) =>
      url.endsWith("/request")
        ? jsonResponse({ result: 100, trackId: 424242 })
        : jsonResponse({ result: 100, refNumber: 999, amount: 17_500_000 }),
    );
    const { payment } = await loadModules({ ZIBAL_MERCHANT: "zibal-merchant-123" });

    const requested = await payment.requestPayment(order(), "https://asadzedeh.ir/api/payment/callback");
    expect(requested).toMatchObject({ ok: true, authority: "424242" });

    const verified = await payment.verifyPayment(order(), "424242");
    expect(verified).toMatchObject({ ok: true, refId: "999" });
  });
});
