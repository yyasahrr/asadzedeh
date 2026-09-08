import type { Order } from "@/lib/types";
import { tomanToRial } from "@/lib/money";
import { fetchWithTimeout } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { GatewayCredentials, PaymentDriver, PaymentRequestInput, PaymentRequestResult, PaymentVerifyResult } from "./types";

/**
 * IDPay, v1.1 REST API.
 *
 * Auth is an `X-API-KEY` header; sandbox mode is selected by an `X-SANDBOX: 1`
 * header rather than a different host. Statuses 100 (verified), 101 (already
 * verified) and 200 (settled to the merchant) all mean the money moved.
 */

const BASE = "https://api.idpay.ir/v1.1";

/** IDPay statuses that mean the buyer actually paid. */
const PAID_STATUSES = new Set([100, 101, 200]);

function headers(c: GatewayCredentials): Record<string, string> {
  return {
    "content-type": "application/json",
    "X-API-KEY": c.merchantId,
    "X-SANDBOX": c.sandbox ? "1" : "0",
  };
}

export const idpay: PaymentDriver = {
  id: "idpay",
  label: "آی‌دی‌پی",
  credentialLabel: "کلید وب‌سرویس (API Key)",
  needsSecret: false,

  async request({ order, callbackUrl }: PaymentRequestInput, c: GatewayCredentials): Promise<PaymentRequestResult> {
    try {
      // Money movement: never retried.
      const res = await fetchWithTimeout(`${BASE}/payment`, {
        timeoutMs: 15_000,
        event: "payment.request",
        method: "POST",
        headers: headers(c),
        body: JSON.stringify({
          order_id: order.id,
          amount: tomanToRial(order.amount),
          callback: `${callbackUrl}?order=${order.id}`,
          desc: `اسدزاده — ${order.item}`,
          name: order.student,
          phone: order.phone || order.shipping?.phone,
        }),
      });
      const data = (await res.json()) as { id?: string; link?: string; error_message?: string; error_code?: number };
      if (data.id && data.link) {
        return { ok: true, authority: data.id, payUrl: data.link };
      }
      logger.warn({ event: "payment.request.failed", gateway: "idpay", orderId: order.id, code: data.error_code, message: data.error_message });
      return { ok: false, error: data.error_message || "خطای درگاه پرداخت" };
    } catch (e) {
      logger.error({ event: "payment.request.error", gateway: "idpay", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
    }
  },

  async verify(order: Order, authority: string, c: GatewayCredentials): Promise<PaymentVerifyResult> {
    try {
      // `verify` is what tells IDPay we received the callback; it answers 101
      // for a transaction already confirmed, so retrying is safe.
      const res = await fetchWithTimeout(`${BASE}/payment/verify`, {
        timeoutMs: 15_000,
        retry: { attempts: 3 },
        event: "payment.verify",
        method: "POST",
        headers: headers(c),
        body: JSON.stringify({ id: authority, order_id: order.id }),
      });
      const data = (await res.json()) as {
        status?: number;
        track_id?: number | string;
        error_message?: string;
      };
      const status = typeof data.status === "string" ? Number(data.status) : data.status;
      if (status !== undefined && PAID_STATUSES.has(status) && data.track_id !== undefined) {
        return { ok: true, alreadyVerified: status !== 100, refId: String(data.track_id) };
      }
      return { ok: false, error: data.error_message || "تأیید پرداخت ناموفق بود" };
    } catch (e) {
      logger.error({ event: "payment.verify.error", gateway: "idpay", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
    }
  },
};
