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
      const res = await fetchWithTimeout(`${BASE}/merchant/start`, {
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
      const data = (await res.json()) as { result?: number; trackId?: number | string; message?: string };
      if (data.result === 100 && data.trackId !== undefined) {
        return { ok: true, authority: String(data.trackId), payUrl: `https://gateway.zibal.ir/start/${data.trackId}` };
      }
      logger.warn({ event: "payment.request.failed", gateway: "zibal", orderId: order.id, result: data.result, message: data.message });
      return { ok: false, error: data.message || "خطای درگاه پرداخت" };
    } catch (e) {
      logger.error({ event: "payment.request.error", gateway: "zibal", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
    }
  },

  async verify(order: Order, authority: string, c: GatewayCredentials): Promise<PaymentVerifyResult> {
    try {
      // Idempotent: result 201 means this trackId was already verified.
      const res = await fetchWithTimeout(`${BASE}/merchant/verify`, {
        timeoutMs: 15_000,
        retry: { attempts: 3 },
        event: "payment.verify",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ merchant: merchant(c), trackId: authority }),
      });
      const data = (await res.json()) as {
        result?: number;
        status?: number;
        refNumber?: number | string;
        amount?: number;
        message?: string;
      };
      if (data.result === 100 && data.status === 1 && data.refNumber !== undefined) {
        // A reference number that does not match the amount we asked for is not
        // proof that this order was paid — refuse it rather than trust the ref.
        const expected = tomanToRial(order.amount);
        if (data.amount !== undefined && Number(data.amount) !== expected) {
          logger.warn({ event: "payment.verify.amountMismatch", gateway: "zibal", orderId: order.id, got: data.amount, expected });
          return { ok: false, error: "مبلغ تأییدشده با مبلغ سفارش همخوانی ندارد" };
        }
        return { ok: true, refId: String(data.refNumber) };
      }
      return { ok: false, error: data.message || "تأیید پرداخت ناموفق بود" };
    } catch (e) {
      logger.error({ event: "payment.verify.error", gateway: "zibal", orderId: order.id, err: e instanceof Error ? e.message : String(e) });
      return { ok: false, error: e instanceof Error ? e.message : "خطای اتصال به درگاه" };
    }
  },
};
