import type { Order, PaymentGatewayConfig, PaymentProvider } from "./types";
import { getSettings } from "./store";
import { demoPaymentAllowed } from "./env";
import { tomanToRial } from "./money";
import { fetchWithTimeout } from "./http";
import { logger } from "./logger";

/**
 * Payment gateway layer.
 *
 * One adapter per Iranian gateway, all reduced to the same two operations:
 * `requestPayment` (create a transaction, get a redirect URL) and
 * `verifyPayment` (confirm server-to-server before anything is fulfilled).
 *
 * Rules that hold for every adapter:
 *  - amounts are stored in Toman and converted at the gateway boundary only,
 *    per gateway (some expect Rial, some Toman);
 *  - the request call is never retried — a second attempt would create a second
 *    transaction — while verification is retried, because every gateway here
 *    answers idempotently for an already-verified reference;
 *  - the identifier the gateway hands back (`authority`) is stored on the order
 *    and must match on the callback.
 */

interface RequestResult {
  ok: boolean;
  payUrl?: string;
  authority?: string;
  error?: string;
}

interface VerifyResult {
  ok: boolean;
  refId?: string;
  alreadyVerified?: boolean;
  error?: string;
}

/** Human labels, also used by the admin panel. */
export const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  demo: "نمایشی (تستی — پرداخت فوری)",
  zarinpal: "زرین‌پال",
  zibal: "زیبال",
  idpay: "آیدی‌پی",
  payping: "پی‌پینگ",
  nextpay: "نکست‌پی",
  aqayepardakht: "آقای پرداخت",
};

/** What the merchant credential is called at each gateway. */
export const MERCHANT_LABELS: Record<PaymentProvider, string> = {
  demo: "—",
  zarinpal: "مرچنت‌کد زرین‌پال",
  zibal: "مرچنت زیبال (یا zibal برای تست)",
  idpay: "کلید API آیدی‌پی",
  payping: "توکن پی‌پینگ",
  nextpay: "کلید API نکست‌پی",
  aqayepardakht: "پین درگاه آقای پرداخت",
};

export const PAYMENT_PROVIDERS = Object.keys(PROVIDER_LABELS) as PaymentProvider[];

/** The credentials in force right now, merging the active provider with its stored config. */
export function activeGateway(): PaymentGatewayConfig {
  const { payment } = getSettings();
  const stored = (payment.gateways ?? []).find((g) => g.provider === payment.provider);
  return {
    provider: payment.provider,
    merchantId: stored?.merchantId || payment.merchantId || "",
    enabled: stored?.enabled ?? true,
    sandbox: stored?.sandbox ?? payment.sandbox,
  };
}

export function isDemoPayment(): boolean {
  const gateway = activeGateway();
  if (!demoPaymentAllowed()) return false;
  return gateway.provider === "demo" || !gateway.merchantId;
}

/**
 * The gateway's transaction identifier, read off the callback query string.
 *
 * Each gateway names it differently; the callback route stays gateway-agnostic
 * by asking here instead of hard-coding Zarinpal's `Authority`.
 */
export function readCallback(params: URLSearchParams): { authority: string; ok: boolean } {
  const provider = getSettings().payment.provider;
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const value = params.get(key);
      if (value) return value;
    }
    return "";
  };
  switch (provider) {
    case "zibal": {
      const authority = get("trackId");
      return { authority, ok: !!authority && get("success", "status") !== "0" };
    }
    case "idpay": {
      const authority = get("id");
      return { authority, ok: !!authority && ["10", "100", "1"].includes(get("status") || "10") };
    }
    case "payping": {
      const authority = get("refid", "refId", "code");
      return { authority, ok: !!authority };
    }
    case "nextpay": {
      const authority = get("trans_id");
      return { authority, ok: !!authority && get("order_id") !== "" };
    }
    case "aqayepardakht": {
      const authority = get("transid", "transaction_id");
      return { authority, ok: !!authority && get("status") !== "0" };
    }
    case "zarinpal":
    case "demo":
    default: {
      const authority = get("Authority", "authority");
      return { authority, ok: !!authority && get("Status", "status") === "OK" };
    }
  }
}

/* --------------------------------------------------------------- adapters */

type Adapter = {
  request(order: Order, callbackUrl: string, gateway: PaymentGatewayConfig): Promise<RequestResult>;
  verify(order: Order, authority: string, gateway: PaymentGatewayConfig): Promise<VerifyResult>;
};

const zarinpal: Adapter = {
  async request(order, callbackUrl, gateway) {
    const base = gateway.sandbox ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
    const res = await fetchWithTimeout(`${base}/pg/v4/payment/request.json`, {
      timeoutMs: 15_000,
      event: "payment.request",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: gateway.merchantId,
        amount: tomanToRial(order.amount),
        callback_url: callbackUrl,
        description: `اسدزاده — ${order.item}`,
      }),
    });
    const data = (await res.json()) as { data?: { code?: number; authority?: string; message?: string } };
    if (data.data?.code === 100 && data.data.authority) {
      const gate = gateway.sandbox ? "https://sandbox.zarinpal.com" : "https://www.zarinpal.com";
      return { ok: true, authority: data.data.authority, payUrl: `${gate}/pg/StartPay/${data.data.authority}` };
    }
    return { ok: false, error: data.data?.message || "خطای درگاه پرداخت" };
  },
  async verify(order, authority, gateway) {
    const base = gateway.sandbox ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
    const res = await fetchWithTimeout(`${base}/pg/v4/payment/verify.json`, {
      timeoutMs: 15_000,
      retry: { attempts: 3 },
      event: "payment.verify",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: gateway.merchantId,
        amount: tomanToRial(order.amount),
        authority,
      }),
    });
    const data = (await res.json()) as { data?: { code?: number; ref_id?: number; message?: string } };
    if (data.data?.code === 101 && data.data.ref_id) {
      return { ok: true, alreadyVerified: true, refId: String(data.data.ref_id) };
    }
    if (data.data?.code === 100 && data.data.ref_id) return { ok: true, refId: String(data.data.ref_id) };
    return { ok: false, error: data.data?.message || "تأیید پرداخت ناموفق بود" };
  },
};

const zibal: Adapter = {
  async request(order, callbackUrl, gateway) {
    const res = await fetchWithTimeout("https://gateway.zibal.ir/v1/request", {
      timeoutMs: 15_000,
      event: "payment.request",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant: gateway.sandbox ? "zibal" : gateway.merchantId,
        amount: tomanToRial(order.amount),
        callbackUrl,
        description: `اسدزاده — ${order.item}`,
        orderId: order.id,
      }),
    });
    const data = (await res.json()) as { result?: number; trackId?: number; message?: string };
    if (data.result === 100 && data.trackId) {
      return {
        ok: true,
        authority: String(data.trackId),
        payUrl: `https://gateway.zibal.ir/start/${data.trackId}`,
      };
    }
    return { ok: false, error: data.message || "خطای درگاه زیبال" };
  },
  async verify(_order, authority, gateway) {
    const res = await fetchWithTimeout("https://gateway.zibal.ir/v1/verify", {
      timeoutMs: 15_000,
      retry: { attempts: 3 },
      event: "payment.verify",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant: gateway.sandbox ? "zibal" : gateway.merchantId,
        trackId: Number(authority),
      }),
    });
    const data = (await res.json()) as { result?: number; refNumber?: number; message?: string };
    // 201 = already verified.
    if (data.result === 201) return { ok: true, alreadyVerified: true, refId: String(data.refNumber ?? authority) };
    if (data.result === 100) return { ok: true, refId: String(data.refNumber ?? authority) };
    return { ok: false, error: data.message || "تأیید پرداخت زیبال ناموفق بود" };
  },
};

const idpay: Adapter = {
  async request(order, callbackUrl, gateway) {
    const res = await fetchWithTimeout("https://api.idpay.ir/v1.1/payment", {
      timeoutMs: 15_000,
      event: "payment.request",
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-API-KEY": gateway.merchantId,
        "X-SANDBOX": gateway.sandbox ? "1" : "0",
      },
      body: JSON.stringify({
        order_id: order.id,
        amount: tomanToRial(order.amount),
        callback: callbackUrl,
        desc: `اسدزاده — ${order.item}`,
      }),
    });
    const data = (await res.json()) as { id?: string; link?: string; error_message?: string };
    if (data.id && data.link) return { ok: true, authority: data.id, payUrl: data.link };
    return { ok: false, error: data.error_message || "خطای درگاه آیدی‌پی" };
  },
  async verify(order, authority, gateway) {
    const res = await fetchWithTimeout("https://api.idpay.ir/v1.1/payment/verify", {
      timeoutMs: 15_000,
      retry: { attempts: 3 },
      event: "payment.verify",
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-API-KEY": gateway.merchantId,
        "X-SANDBOX": gateway.sandbox ? "1" : "0",
      },
      body: JSON.stringify({ id: authority, order_id: order.id }),
    });
    const data = (await res.json()) as {
      status?: number;
      track_id?: number;
      error_message?: string;
      payment?: { track_id?: number };
    };
    // 100 = verified now, 101 = already verified.
    if (data.status === 101) return { ok: true, alreadyVerified: true, refId: String(data.track_id ?? authority) };
    if (data.status === 100) return { ok: true, refId: String(data.track_id ?? authority) };
    return { ok: false, error: data.error_message || "تأیید پرداخت آیدی‌پی ناموفق بود" };
  },
};

const payping: Adapter = {
  async request(order, callbackUrl, gateway) {
    const res = await fetchWithTimeout("https://api.payping.ir/v2/pay", {
      timeoutMs: 15_000,
      event: "payment.request",
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${gateway.merchantId}` },
      body: JSON.stringify({
        // PayPing works in Toman.
        amount: order.amount,
        returnUrl: callbackUrl,
        description: `اسدزاده — ${order.item}`,
        clientRefId: order.id,
      }),
    });
    const data = (await res.json()) as { code?: string; Error?: string };
    if (data.code) {
      return { ok: true, authority: data.code, payUrl: `https://api.payping.ir/v2/pay/gotoipg/${data.code}` };
    }
    return { ok: false, error: data.Error || "خطای درگاه پی‌پینگ" };
  },
  async verify(order, authority, gateway) {
    const res = await fetchWithTimeout("https://api.payping.ir/v2/pay/verify", {
      timeoutMs: 15_000,
      retry: { attempts: 3 },
      event: "payment.verify",
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${gateway.merchantId}` },
      body: JSON.stringify({ refId: authority, amount: order.amount }),
    });
    if (res.status === 200) {
      const data = (await res.json().catch(() => ({}))) as { cardNumber?: string };
      void data;
      return { ok: true, refId: authority };
    }
    // PayPing answers 409 when the reference was already verified.
    if (res.status === 409) return { ok: true, alreadyVerified: true, refId: authority };
    return { ok: false, error: `تأیید پرداخت پی‌پینگ ناموفق بود (${res.status})` };
  },
};

const nextpay: Adapter = {
  async request(order, callbackUrl, gateway) {
    const res = await fetchWithTimeout("https://nextpay.org/nx/gateway/token", {
      timeoutMs: 15_000,
      event: "payment.request",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: gateway.merchantId,
        order_id: order.id,
        amount: tomanToRial(order.amount),
        callback_uri: callbackUrl,
        customer_phone: order.phone ?? undefined,
      }),
    });
    const data = (await res.json()) as { code?: number; trans_id?: string };
    if (data.code === -1 && data.trans_id) {
      return {
        ok: true,
        authority: data.trans_id,
        payUrl: `https://nextpay.org/nx/gateway/payment/${data.trans_id}`,
      };
    }
    return { ok: false, error: `خطای درگاه نکست‌پی (${data.code ?? "?"})` };
  },
  async verify(order, authority, gateway) {
    const res = await fetchWithTimeout("https://nextpay.org/nx/gateway/verify", {
      timeoutMs: 15_000,
      retry: { attempts: 3 },
      event: "payment.verify",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: gateway.merchantId,
        order_id: order.id,
        amount: tomanToRial(order.amount),
        trans_id: authority,
      }),
    });
    const data = (await res.json()) as { code?: number; Shaparak_Ref_Id?: string };
    if (data.code === 0) return { ok: true, refId: data.Shaparak_Ref_Id || authority };
    // -49 = already verified.
    if (data.code === -49) return { ok: true, alreadyVerified: true, refId: data.Shaparak_Ref_Id || authority };
    return { ok: false, error: `تأیید پرداخت نکست‌پی ناموفق بود (${data.code ?? "?"})` };
  },
};

const aqayepardakht: Adapter = {
  async request(order, callbackUrl, gateway) {
    const res = await fetchWithTimeout("https://panel.aqayepardakht.ir/api/v2/create", {
      timeoutMs: 15_000,
      event: "payment.request",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pin: gateway.sandbox ? "sandbox" : gateway.merchantId,
        // Aqaye Pardakht works in Toman.
        amount: order.amount,
        callback: callbackUrl,
        invoice_id: order.id,
        description: `اسدزاده — ${order.item}`,
      }),
    });
    const data = (await res.json()) as { status?: string; transid?: string; code?: string };
    if (data.status === "success" && data.transid) {
      const base = gateway.sandbox
        ? "https://panel.aqayepardakht.ir/startpay/sandbox"
        : "https://panel.aqayepardakht.ir/startpay";
      return { ok: true, authority: data.transid, payUrl: `${base}/${data.transid}` };
    }
    return { ok: false, error: `خطای درگاه آقای پرداخت (${data.code ?? "?"})` };
  },
  async verify(order, authority, gateway) {
    const res = await fetchWithTimeout("https://panel.aqayepardakht.ir/api/v2/verify", {
      timeoutMs: 15_000,
      retry: { attempts: 3 },
      event: "payment.verify",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pin: gateway.sandbox ? "sandbox" : gateway.merchantId,
        amount: order.amount,
        transid: authority,
      }),
    });
    const data = (await res.json()) as { status?: string; code?: string };
    if (data.status === "success" || data.code === "1") return { ok: true, refId: authority };
    // 2 = already verified.
    if (data.code === "2") return { ok: true, alreadyVerified: true, refId: authority };
    return { ok: false, error: `تأیید پرداخت آقای پرداخت ناموفق بود (${data.code ?? "?"})` };
  },
};

const ADAPTERS: Partial<Record<PaymentProvider, Adapter>> = {
  zarinpal,
  zibal,
  idpay,
  payping,
  nextpay,
  aqayepardakht,
};

/* ------------------------------------------------------------ public API */

export async function requestPayment(order: Order, callbackUrl: string): Promise<RequestResult> {
  const gateway = activeGateway();
  if (isDemoPayment()) return { ok: false, error: "درگاه نمایشی فعال است" };
  if (!gateway.merchantId && !gateway.sandbox) {
    return { ok: false, error: "درگاه پرداخت پیکربندی نشده است" };
  }
  const adapter = ADAPTERS[gateway.provider];
  if (!adapter) return { ok: false, error: "درگاه پرداخت پشتیبانی نمی‌شود" };

  // Money movement: never retried. A second attempt would create a second
  // gateway transaction.
  try {
    return await adapter.request(order, `${callbackUrl}?order=${order.id}`, gateway);
  } catch (e) {
    logger.error({
      event: "payment.request.error",
      provider: gateway.provider,
      orderId: order.id,
      err: e instanceof Error ? e.message : String(e),
    });
    return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
  }
}

export async function verifyPayment(order: Order, authority: string): Promise<VerifyResult> {
  const gateway = activeGateway();
  if (isDemoPayment()) {
    return { ok: true, refId: `DEMO-${Date.now().toString(36).toUpperCase()}` };
  }
  if (!gateway.merchantId && !gateway.sandbox) {
    return { ok: false, error: "درگاه پرداخت پیکربندی نشده است" };
  }
  const adapter = ADAPTERS[gateway.provider];
  if (!adapter) return { ok: false, error: "درگاه پرداخت پشتیبانی نمی‌شود" };

  try {
    return await adapter.verify(order, authority, gateway);
  } catch (e) {
    logger.error({
      event: "payment.verify.error",
      provider: gateway.provider,
      orderId: order.id,
      err: e instanceof Error ? e.message : String(e),
    });
    return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
  }
}
