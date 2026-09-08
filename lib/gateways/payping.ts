import type { Order } from "@/lib/types";
import { tomanToRial } from "@/lib/money";
import { fetchWithTimeout } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { GatewayCredentials, PaymentDriver, PaymentRequestInput, PaymentRequestResult, PaymentVerifyResult } from "./types";

/**
 * PayPing, v2 API.
 *
 * Unlike the others this one is OAuth2: a client id/secret pair is exchanged for
 * a short-lived bearer token, which then authorises the pay and verify calls.
 * The token is fetched per call rather than cached in module state — one extra
 * round trip, and no stale-token or cross-request leakage bugs.
 *
 * PayPing publishes no sandbox host, so the sandbox flag has no effect here; a
 * real merchant credential is always required.
 */

const BASE = "https://api.payping.ir/v2";

async function accessToken(c: GatewayCredentials): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${BASE}/oauth/token`, {
      timeoutMs: 15_000,
      event: "payment.token",
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: c.merchantId,
        client_secret: c.secret,
      }).toString(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token || null;
  } catch (e) {
    logger.error({ event: "payment.token.error", gateway: "payping", err: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

export const payping: PaymentDriver = {
  id: "payping",
  label: "پی‌پینگ",
  credentialLabel: "شناسه کاربری (Client ID)",
  needsSecret: true,

  async request({ order, callbackUrl }: PaymentRequestInput, c: GatewayCredentials): Promise<PaymentRequestResult> {
    const token = await accessToken(c);
    if (!token) return { ok: false, error: "احراز هویت با درگاه ناموفق بود" };
    try {
      // Money movement: never retried.
      const res = await fetchWithTimeout(`${BASE}/pay`, {
        timeoutMs: 15_000,
        event: "payment.request",
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: tomanToRial(order.amount),
          returnUrl: `${callbackUrl}?order=${order.id}`,
          clientRefId: order.id,
          description: `اسدزاده — ${order.item}`,
          payerName: order.student,
          payerIdentity: order.phone || order.shipping?.phone,
        }),
      });
      // The response body is the payment code as plain text, not JSON.
      const code = (await res.text()).trim();
      if (res.ok && code) {
        return { ok: true, authority: code, payUrl: `${BASE}/pay/gotoipg/${code}` };
      }
      logger.warn({ event: "payment.request.failed", gateway: "payping", orderId: order.id, status: res.status });
      return { ok: false, error: "خطای درگاه پرداخت" };
    } catch (e) {
      logger.error({ event: "payment.request.error", gateway: "payping", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
    }
  },

  async verify(order: Order, refId: string, c: GatewayCredentials): Promise<PaymentVerifyResult> {
    const token = await accessToken(c);
    if (!token) return { ok: false, error: "احراز هویت با درگاه ناموفق بود" };
    try {
      // Idempotent — a second verify of the same refId answers 200 again.
      const res = await fetchWithTimeout(`${BASE}/pay/verify`, {
        timeoutMs: 15_000,
        retry: { attempts: 3 },
        event: "payment.verify",
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        // PayPing compares the amount against what was authorised; a mismatch
        // is rejected, which is what makes this a real confirmation.
        body: JSON.stringify({ refId, amount: tomanToRial(order.amount) }),
      });
      if (res.ok) return { ok: true, refId };
      logger.warn({ event: "payment.verify.failed", gateway: "payping", orderId: order.id, status: res.status });
      return { ok: false, error: "تأیید پرداخت ناموفق بود" };
    } catch (e) {
      logger.error({ event: "payment.verify.error", gateway: "payping", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
    }
  },
};
