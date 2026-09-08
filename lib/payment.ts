import type { Order } from "./types";
import { getSettings } from "./store";
import { demoPaymentAllowed } from "./env";
import { logger } from "./logger";
import { getDriver } from "./gateways/registry";
import type { GatewayCredentials } from "./gateways/types";

/**
 * Payment gateway dispatcher.
 *
 * `demo` short-circuits everything below it: it is only reachable when
 * `demoPaymentAllowed()` says so, which is never in production. Every real
 * gateway lives in `lib/gateways/` behind one interface, so this file's only
 * jobs are to pick a driver and to refuse to run one that is not configured.
 *
 * Amounts stay Toman all the way down; each driver converts to Rial at its own
 * boundary.
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

const NOT_CONFIGURED = "درگاه پرداخت پیکربندی نشده است";

export function isDemoPayment(): boolean {
  const { payment } = getSettings();
  if (!demoPaymentAllowed()) return false;
  return payment.provider === "demo" || !payment.merchantId;
}

/** Credentials for the configured gateway, or null when it cannot run. */
function resolve(): { credentials: GatewayCredentials; driver: NonNullable<ReturnType<typeof getDriver>> } | { error: string } {
  const { payment } = getSettings();
  const driver = getDriver(payment.provider);
  if (!driver) return { error: "درگاه پرداخت پشتیبانی‌نشده" };
  if (!payment.merchantId) return { error: NOT_CONFIGURED };
  // OAuth gateways need both halves of the pair.
  if (driver.needsSecret && !payment.secret) return { error: NOT_CONFIGURED };
  return { credentials: { merchantId: payment.merchantId, secret: payment.secret, sandbox: payment.sandbox }, driver };
}

export async function requestPayment(order: Order, callbackUrl: string): Promise<RequestResult> {
  if (isDemoPayment()) {
    return { ok: false, error: "درگاه نمایشی فعال است" };
  }
  const r = resolve();
  if ("error" in r) return { ok: false, error: r.error };

  logger.info({ event: "payment.request.start", gateway: r.driver.id, orderId: order.id, amount: order.amount });
  const result = await r.driver.request({ order, callbackUrl }, r.credentials);
  if (result.ok) {
    logger.info({ event: "payment.request.ok", gateway: r.driver.id, orderId: order.id });
  }
  return result;
}

export async function verifyPayment(order: Order, authority: string): Promise<VerifyResult> {
  if (isDemoPayment()) {
    return { ok: true, refId: `DEMO-${Date.now().toString(36).toUpperCase()}` };
  }
  const r = resolve();
  if ("error" in r) return { ok: false, error: r.error };

  const result = await r.driver.verify(order, authority, r.credentials);
  if (result.ok) {
    logger.info({ event: "payment.verify.ok", gateway: r.driver.id, orderId: order.id, already: Boolean(result.alreadyVerified) });
  } else {
    logger.warn({ event: "payment.verify.rejected", gateway: r.driver.id, orderId: order.id, error: result.error });
  }
  return result;
}
