import type { Order } from "./types";
import { getSettings } from "./store";
import { demoPaymentAllowed } from "./env";
import { tomanToRial } from "./money";
import { logger } from "./logger";

/**
 * Payment gateway layer.
 * - `demo`: only when not production (or ALLOW_DEMO_PAYMENT=true)
 * - `zarinpal`: real Zarinpal v4 API. Amounts convert Toman → Rial at the boundary only.
 */

interface RequestResult {
  ok: boolean;
  payUrl?: string;
  authority?: string;
  error?: string;
}

export function isDemoPayment(): boolean {
  const { payment } = getSettings();
  if (!demoPaymentAllowed()) return false;
  return payment.provider === "demo" || !payment.merchantId;
}

export async function requestPayment(order: Order, callbackUrl: string): Promise<RequestResult> {
  const { payment } = getSettings();
  if (isDemoPayment()) {
    return { ok: false, error: "درگاه نمایشی فعال است" };
  }
  if (!payment.merchantId) {
    return { ok: false, error: "درگاه پرداخت پیکربندی نشده است" };
  }

  const base = payment.sandbox ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
  const amountRial = tomanToRial(order.amount);
  try {
    const res = await fetch(`${base}/pg/v4/payment/request.json`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: payment.merchantId,
        amount: amountRial,
        callback_url: `${callbackUrl}?order=${order.id}`,
        description: `اسدزاده — ${order.item}`,
      }),
    });
    const data = (await res.json()) as {
      data?: { code?: number; authority?: string; message?: string };
      errors?: unknown;
    };
    if (data.data?.code === 100 && data.data.authority) {
      const gate = payment.sandbox ? "https://sandbox.zarinpal.com" : "https://www.zarinpal.com";
      return {
        ok: true,
        authority: data.data.authority,
        payUrl: `${gate}/pg/StartPay/${data.data.authority}`,
      };
    }
    logger.warn({ event: "payment.request.failed", orderId: order.id, message: data.data?.message });
    return { ok: false, error: data.data?.message || "خطای درگاه پرداخت" };
  } catch (e) {
    logger.error({ event: "payment.request.error", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
    return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
  }
}

export async function verifyPayment(
  order: Order,
  authority: string,
): Promise<{ ok: boolean; refId?: string; alreadyVerified?: boolean; error?: string }> {
  const { payment } = getSettings();
  if (isDemoPayment()) {
    return { ok: true, refId: `DEMO-${Date.now().toString(36).toUpperCase()}` };
  }
  if (!payment.merchantId) {
    return { ok: false, error: "درگاه پرداخت پیکربندی نشده است" };
  }
  const base = payment.sandbox ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
  try {
    const res = await fetch(`${base}/pg/v4/payment/verify.json`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: payment.merchantId,
        amount: tomanToRial(order.amount),
        authority,
      }),
    });
    const data = (await res.json()) as {
      data?: { code?: number; ref_id?: number; message?: string };
    };
    if (data.data?.code === 101 && data.data.ref_id) {
      return { ok: true, alreadyVerified: true, refId: String(data.data.ref_id) };
    }
    if (data.data?.code === 100 && data.data.ref_id) {
      return { ok: true, refId: String(data.data.ref_id) };
    }
    return { ok: false, error: data.data?.message || "تأیید پرداخت ناموفق بود" };
  } catch (e) {
    logger.error({ event: "payment.verify.error", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
    return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
  }
}
