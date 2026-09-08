import type { Order } from "@/lib/types";
import { tomanToRial } from "@/lib/money";
import { fetchWithTimeout } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { GatewayCredentials, PaymentDriver, PaymentRequestInput, PaymentRequestResult, PaymentVerifyResult } from "./types";

/**
 * Zarinpal, v4 REST API.
 *
 * Amounts are Rial at this boundary and nowhere else in the codebase — the rest
 * of the shop thinks in Toman.
 */

function base(c: GatewayCredentials): string {
  return c.sandbox ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
}

export const zarinpal: PaymentDriver = {
  id: "zarinpal",
  label: "زرین‌پال",
  credentialLabel: "مرچنت کد (Merchant ID)",
  needsSecret: false,

  async request({ order, callbackUrl }: PaymentRequestInput, c: GatewayCredentials): Promise<PaymentRequestResult> {
    try {
      // Money movement: never retried. A second attempt would create a second
      // gateway transaction.
      const res = await fetchWithTimeout(`${base(c)}/pg/v4/payment/request.json`, {
        timeoutMs: 15_000,
        event: "payment.request",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          merchant_id: c.merchantId,
          amount: tomanToRial(order.amount),
          callback_url: `${callbackUrl}?order=${order.id}`,
          description: `اسدزاده — ${order.item}`,
        }),
      });
      const data = (await res.json()) as {
        data?: { code?: number; authority?: string; message?: string };
        errors?: unknown;
      };
      if (data.data?.code === 100 && data.data.authority) {
        const gate = c.sandbox ? "https://sandbox.zarinpal.com" : "https://www.zarinpal.com";
        return { ok: true, authority: data.data.authority, payUrl: `${gate}/pg/StartPay/${data.data.authority}` };
      }
      logger.warn({ event: "payment.request.failed", gateway: "zarinpal", orderId: order.id, message: data.data?.message });
      return { ok: false, error: data.data?.message || "خطای درگاه پرداخت" };
    } catch (e) {
      logger.error({ event: "payment.request.error", gateway: "zarinpal", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
    }
  },

  async verify(order: Order, authority: string, c: GatewayCredentials): Promise<PaymentVerifyResult> {
    try {
      // Verification is idempotent — the gateway answers 101 for an authority
      // that was already verified — so a retry here is safe.
      const res = await fetchWithTimeout(`${base(c)}/pg/v4/payment/verify.json`, {
        timeoutMs: 15_000,
        retry: { attempts: 3 },
        event: "payment.verify",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          merchant_id: c.merchantId,
          amount: tomanToRial(order.amount),
          authority,
        }),
      });
      const data = (await res.json()) as { data?: { code?: number; ref_id?: number; message?: string } };
      if (data.data?.code === 101 && data.data.ref_id) {
        return { ok: true, alreadyVerified: true, refId: String(data.data.ref_id) };
      }
      if (data.data?.code === 100 && data.data.ref_id) {
        return { ok: true, refId: String(data.data.ref_id) };
      }
      return { ok: false, error: data.data?.message || "تأیید پرداخت ناموفق بود" };
    } catch (e) {
      logger.error({ event: "payment.verify.error", gateway: "zarinpal", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
    }
  },
};
