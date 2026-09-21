import type { Order } from "./types";
import { appUrl, demoPaymentAllowed } from "./env";
import { effectivePaymentSettings } from "./integrations";
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

export function paymentCallbackUrl(): string {
  return `${appUrl()}/api/payment/callback`;
}

export function isDemoPayment(): boolean {
  const payment = effectivePaymentSettings();
  if (!demoPaymentAllowed()) return false;
  return payment.provider === "demo" || !payment.merchantId;
}

/** Provider captured on a new payment row; never infer it from a hard-coded default. */
export function configuredPaymentProvider() {
  return effectivePaymentSettings().provider;
}

/**
 * The gateway this deployment will actually charge through.
 *
 * Kept separate from `isDemoPayment()` because the two answer different
 * questions: this one names the driver, that one says whether a driver will run
 * at all. In production with nothing configured, the answer here is `demo` and
 * `resolve()` below refuses to build a transaction.
 */
export function paymentGatewayId() {
  return effectivePaymentSettings().provider;
}

/** Credentials for the configured gateway, or null when it cannot run. */
function resolve(provider?: string): { credentials: GatewayCredentials; driver: NonNullable<ReturnType<typeof getDriver>> } | { error: string } {
  const payment = effectivePaymentSettings();
  if (provider && provider !== payment.provider) return { error: "اعتبارنامه درگاه ثبت‌شده برای این تراکنش در دسترس نیست" };
  const driver = getDriver((provider ?? payment.provider) as Parameters<typeof getDriver>[0]);
  if (!driver) return { error: "درگاه پرداخت پشتیبانی‌نشده" };
  if (!payment.merchantId) return { error: NOT_CONFIGURED };
  // OAuth gateways need both halves of the pair.
  if (driver.needsSecret && !payment.secret) return { error: NOT_CONFIGURED };
  return { credentials: { merchantId: payment.merchantId, secret: payment.secret, sandbox: payment.sandbox }, driver };
}

/** Safe preflight used before reserving stock or creating an order. */
export function paymentConfigurationError(): string | null {
  if (isDemoPayment()) return null;
  const result = resolve();
  return "error" in result ? result.error : null;
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

export async function verifyPayment(order: Order, authority: string, provider?: string): Promise<VerifyResult> {
  if (isDemoPayment()) {
    return { ok: true, refId: `DEMO-${Date.now().toString(36).toUpperCase()}` };
  }
  const r = resolve(provider);
  if ("error" in r) return { ok: false, error: r.error };

  const result = await r.driver.verify(order, authority, r.credentials);
  if (result.ok) {
    logger.info({ event: "payment.verify.ok", gateway: r.driver.id, orderId: order.id, already: Boolean(result.alreadyVerified) });
  } else {
    logger.warn({ event: "payment.verify.rejected", gateway: r.driver.id, orderId: order.id, error: result.error });
  }
  return result;
}
