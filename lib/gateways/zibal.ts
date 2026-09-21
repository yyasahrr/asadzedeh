import type { Order } from "@/lib/types";
import { tomanToRial } from "@/lib/money";
import { fetchWithTimeout } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { GatewayCredentials, PaymentDriver, PaymentRequestInput, PaymentRequestResult, PaymentVerifyResult } from "./types";

/**
 * Zibal aggregator.
 *
 * Zibal identifies the merchant with a plain string (`merchant`), and its
 * sandbox is the literal merchant id `zibal` rather than a separate host, so
 * turning sandbox on substitutes that value.
 */

const BASE = "https://gateway.zibal.ir/v1";
const SANDBOX_MERCHANT = "zibal";

function safeGatewayError(result?: number): string {
  if (result === 102 || result === 103 || result === 104) return "شناسه پذیرنده توسط درگاه پذیرفته نشد";
  return "درگاه پرداخت پاسخ معتبر نداد";
}

function merchant(c: GatewayCredentials): string {
  return c.sandbox ? SANDBOX_MERCHANT : c.merchantId;
}

export const zibal: PaymentDriver = {
  id: "zibal",
  label: "زیبال",
  credentialLabel: "شناسه مرچنت (Merchant)",
  needsSecret: false,

  async request({ order, callbackUrl }: PaymentRequestInput, c: GatewayCredentials): Promise<PaymentRequestResult> {
    try {
      // Money movement: never retried.
      const res = await fetchWithTimeout(`${BASE}/request`, {
        timeoutMs: 15_000,
        event: "payment.request",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          merchant: merchant(c),
          amount: tomanToRial(order.amount),
          callbackUrl: `${callbackUrl}?order=${order.id}`,
          orderId: order.id,
          mobile: order.phone || order.shipping?.phone,
          description: `اسدزاده — ${order.item}`,
        }),
      });
      if (!res.ok) {
        logger.warn({ event: "payment.request.http", gateway: "zibal", orderId: order.id, status: res.status });
        return { ok: false, error: "درگاه پرداخت پاسخ معتبر نداد" };
      }
      const data = (await res.json()) as { result?: number; trackId?: number | string; message?: string };
      const trackId = String(data.trackId ?? "");
      if (data.result === 100 && /^\d+$/.test(trackId)) {
        return { ok: true, authority: trackId, payUrl: `https://gateway.zibal.ir/start/${encodeURIComponent(trackId)}` };
      }
      logger.warn({ event: "payment.request.failed", gateway: "zibal", orderId: order.id, result: data.result });
      return { ok: false, error: safeGatewayError(data.result) };
    } catch (e) {
      logger.error({ event: "payment.request.error", gateway: "zibal", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: "ارتباط با درگاه برقرار نشد" };
    }
  },

  async verify(order: Order, authority: string, c: GatewayCredentials): Promise<PaymentVerifyResult> {
    try {
      // Idempotent: result 201 means this trackId was already verified.
      const res = await fetchWithTimeout(`${BASE}/verify`, {
        timeoutMs: 15_000,
        retry: { attempts: 3 },
        event: "payment.verify",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ merchant: merchant(c), trackId: authority }),
      });
      if (!res.ok) return { ok: false, error: "درگاه پرداخت پاسخ معتبر نداد" };
      const data = (await res.json()) as {
        result?: number;
        status?: number;
        refNumber?: number | string;
        amount?: number;
        message?: string;
      };
      if ((data.result === 100 || data.result === 201) && data.refNumber !== undefined) {
        // A reference number that does not match the amount we asked for is not
        // proof that this order was paid — refuse it rather than trust the ref.
        const expected = tomanToRial(order.amount);
        if (data.amount !== undefined && Number(data.amount) !== expected) {
          logger.warn({ event: "payment.verify.amountMismatch", gateway: "zibal", orderId: order.id, got: data.amount, expected });
          return { ok: false, error: "مبلغ تأییدشده با مبلغ سفارش همخوانی ندارد" };
        }
        return {
          ok: true,
          refId: String(data.refNumber),
          ...(data.result === 201 ? { alreadyVerified: true } : {}),
        };
      }
      return { ok: false, error: "تأیید پرداخت ناموفق بود" };
    } catch (e) {
      logger.error({ event: "payment.verify.error", gateway: "zibal", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: "ارتباط با درگاه برقرار نشد" };
    }
  },
};
