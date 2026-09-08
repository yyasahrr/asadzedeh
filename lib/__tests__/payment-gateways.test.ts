import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentProvider, Settings } from "@/lib/types";

/**
 * Multi-gateway payment layer.
 *
 * The risk of supporting six gateways is that each one names things
 * differently, so a mistake shows up as money taken without an order being
 * fulfilled. These tests pin the parts that would fail silently: which query
 * parameter carries the transaction id, whether an amount goes out in Rial or
 * Toman, and that an "already verified" answer is treated as success rather
 * than as a failed payment.
 */

const settings = vi.hoisted(() => ({ current: null as unknown as Settings }));

vi.mock("@/lib/store", () => ({
  getSettings: () => settings.current,
}));

vi.mock("@/lib/env", () => ({
  demoPaymentAllowed: () => true,
  isProduction: () => false,
  appUrl: () => "https://example.test",
}));

const fetchMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("@/lib/http", () => ({
  fetchWithTimeout: (...args: unknown[]) => fetchMock.fn(...args),
}));

const { activeGateway, readCallback, requestPayment, verifyPayment } = await import("@/lib/payment");
const { defaultPaymentGateways } = await import("@/lib/seed");

const ORDER = {
  id: "AZ-9050",
  student: "سارا",
  item: "دوره گلیم",
  amount: 250_000,
  status: "در انتظار پرداخت",
};

function configure(provider: PaymentProvider, merchantId = "MERCHANT", sandbox = false) {
  settings.current = {
    payment: {
      provider,
      merchantId,
      sandbox,
      gateways: defaultPaymentGateways.map((g) =>
        g.provider === provider ? { ...g, merchantId, enabled: true, sandbox } : g,
      ),
    },
  } as unknown as Settings;
}

/** Last JSON body handed to fetchWithTimeout. */
function lastBody(): Record<string, unknown> {
  const call = fetchMock.fn.mock.calls.at(-1);
  return JSON.parse(String((call?.[1] as { body?: string })?.body ?? "{}"));
}

function respond(payload: unknown, status = 200) {
  fetchMock.fn.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  });
}

beforeEach(() => {
  fetchMock.fn.mockReset();
});

describe("readCallback", () => {
  const cases: { provider: PaymentProvider; query: string; authority: string; ok: boolean }[] = [
    { provider: "zarinpal", query: "Authority=A-123&Status=OK", authority: "A-123", ok: true },
    { provider: "zarinpal", query: "Authority=A-123&Status=NOK", authority: "A-123", ok: false },
    { provider: "zibal", query: "trackId=778899&success=1", authority: "778899", ok: true },
    { provider: "zibal", query: "trackId=778899&success=0", authority: "778899", ok: false },
    { provider: "idpay", query: "id=idp-1&status=10", authority: "idp-1", ok: true },
    { provider: "payping", query: "refid=pp-1", authority: "pp-1", ok: true },
    { provider: "nextpay", query: "trans_id=np-1&order_id=AZ-9050", authority: "np-1", ok: true },
    { provider: "aqayepardakht", query: "transid=aq-1&status=1", authority: "aq-1", ok: true },
    { provider: "aqayepardakht", query: "transid=aq-1&status=0", authority: "aq-1", ok: false },
  ];

  for (const c of cases) {
    it(`reads ${c.provider} (${c.ok ? "success" : "failure"})`, () => {
      configure(c.provider);
      expect(readCallback(new URLSearchParams(c.query))).toEqual({ authority: c.authority, ok: c.ok });
    });
  }
});

describe("activeGateway", () => {
  it("resolves the credential of the selected provider", () => {
    configure("zibal", "zibal-merchant");
    expect(activeGateway()).toMatchObject({ provider: "zibal", merchantId: "zibal-merchant" });
  });
});

describe("amount conversion", () => {
  it("sends Rial to Zarinpal", async () => {
    configure("zarinpal");
    respond({ data: { code: 100, authority: "A-1" } });
    await requestPayment(ORDER, "https://example.test/api/payment/callback");
    expect(lastBody().amount).toBe(2_500_000);
  });

  it("sends Toman to PayPing", async () => {
    configure("payping");
    respond({ code: "pp-1" });
    await requestPayment(ORDER, "https://example.test/api/payment/callback");
    expect(lastBody().amount).toBe(250_000);
  });

  it("sends Toman to Aqaye Pardakht", async () => {
    configure("aqayepardakht");
    respond({ status: "success", transid: "aq-1" });
    await requestPayment(ORDER, "https://example.test/api/payment/callback");
    expect(lastBody().amount).toBe(250_000);
  });
});

describe("requestPayment", () => {
  it("returns the gateway redirect URL for Zibal", async () => {
    configure("zibal");
    respond({ result: 100, trackId: 778899 });
    const result = await requestPayment(ORDER, "https://example.test/api/payment/callback");
    expect(result).toMatchObject({ ok: true, authority: "778899" });
    expect(result.payUrl).toContain("778899");
  });

  it("surfaces the gateway's own error message", async () => {
    configure("zarinpal");
    respond({ data: { code: -9, message: "مرچنت‌کد نامعتبر" } });
    expect(await requestPayment(ORDER, "https://example.test/cb")).toMatchObject({
      ok: false,
      error: "مرچنت‌کد نامعتبر",
    });
  });

  it("never retries the request call", async () => {
    configure("zarinpal");
    respond({ data: { code: 100, authority: "A-1" } });
    await requestPayment(ORDER, "https://example.test/cb");
    const options = fetchMock.fn.mock.calls.at(-1)?.[1] as { retry?: unknown };
    expect(options.retry).toBeUndefined();
  });

  it("carries the order id into the callback URL", async () => {
    configure("zarinpal");
    respond({ data: { code: 100, authority: "A-1" } });
    await requestPayment(ORDER, "https://example.test/api/payment/callback");
    expect(lastBody().callback_url).toBe("https://example.test/api/payment/callback?order=AZ-9050");
  });
});

describe("verifyPayment", () => {
  it("treats an already-verified reference as success (Zarinpal 101)", async () => {
    configure("zarinpal");
    respond({ data: { code: 101, ref_id: 55 } });
    expect(await verifyPayment(ORDER, "A-1")).toMatchObject({ ok: true, alreadyVerified: true, refId: "55" });
  });

  it("treats an already-verified reference as success (Zibal 201)", async () => {
    configure("zibal");
    respond({ result: 201, refNumber: 4242 });
    expect(await verifyPayment(ORDER, "778899")).toMatchObject({ ok: true, alreadyVerified: true });
  });

  it("treats an already-verified reference as success (NextPay -49)", async () => {
    configure("nextpay");
    respond({ code: -49, Shaparak_Ref_Id: "sh-1" });
    expect(await verifyPayment(ORDER, "np-1")).toMatchObject({ ok: true, alreadyVerified: true });
  });

  it("reports a genuinely failed verification", async () => {
    configure("idpay");
    respond({ status: 6, error_message: "تراکنش ناموفق" });
    expect(await verifyPayment(ORDER, "idp-1")).toMatchObject({ ok: false });
  });

  it("does not mark an order paid when the gateway is unreachable", async () => {
    configure("zarinpal");
    fetchMock.fn.mockRejectedValueOnce(new Error("network down"));
    expect(await verifyPayment(ORDER, "A-1")).toMatchObject({ ok: false });
  });
});
