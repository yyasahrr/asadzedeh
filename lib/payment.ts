import type { Order } from "./types";
import { getSettings } from "./store";

/**
 * Payment gateway layer.
 * - `demo`: no external call; checkout marks orders paid instantly.
 * - `zarinpal`: real Zarinpal v4 API (needs merchantId). Amounts convert Toman → Rial.
 */

interface RequestResult {
  ok: boolean;
  payUrl?: string;
  authority?: string;
  error?: string;
}

export async function requestPayment(order: Order, callbackUrl: string): Promise<RequestResult> {
  const { payment } = getSettings();
  if (payment.provider === "demo" || !payment.merchantId) {
    return { ok: false, error: "درگاه نمایشی فعال است" };
  }

  const base = payment.sandbox ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
  const amountRial = order.amount * 10;
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
    return { ok: false, error: data.data?.message || "خطای درگاه پرداخت" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
  }
}

export async function verifyPayment(
  order: Order,
  authority: string
): Promise<{ ok: boolean; refId?: string; error?: string }> {
  const { payment } = getSettings();
  if (payment.provider === "demo" || !payment.merchantId) {
    return { ok: true, refId: `DEMO-${Date.now().toString(36).toUpperCase()}` };
  }
  const base = payment.sandbox ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
  try {
    const res = await fetch(`${base}/pg/v4/payment/verify.json`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchant_id: order.authority ? payment.merchantId : payment.merchantId,
        amount: order.amount * 10,
        authority,
      }),
    });
    const data = (await res.json()) as {
      data?: { code?: number; ref_id?: number; message?: string };
    };
    if ((data.data?.code === 100 || data.data?.code === 101) && data.data.ref_id) {
      return { ok: true, refId: String(data.data.ref_id) };
    }
    return { ok: false, error: data.data?.message || "تأیید پرداخت ناموفق بود" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
  }
}
