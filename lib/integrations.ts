import { getEnv, isProduction } from "./env";
import { getSettings } from "./store";
import type { PaymentSettings, SmsSettings } from "./types";

/**
 * Where the shop's money and message integrations come from.
 *
 * Two places can configure them: the admin panel (stored in PostgreSQL) and the
 * process environment. Environment wins whenever it has a value, for one reason:
 * on a cPanel/VPS deploy the panel password is a secret that should live in the
 * host's environment block, not in a database row that every admin-editor role
 * can read back. Operators who prefer the panel simply leave the variables
 * unset, and the stored settings are used as-is.
 *
 * Nothing here prints a credential. `integrationStatus()` is the only thing that
 * leaves this module for a HTTP response, and it reports booleans.
 */

/** Env override for one settings field: empty strings never override. */
function pick(envValue: string | undefined, stored: string): string {
  const v = (envValue ?? "").trim();
  return v.length > 0 ? v : stored;
}

/**
 * SMS panel settings as the sending code should see them.
 *
 * Production default is MeliPayamak (ملی پیامک) when the operator has supplied
 * its web-service credentials but no explicit provider, so the documented
 * go-live path needs two variables rather than three.
 */
export function effectiveSmsSettings(): SmsSettings {
  const env = getEnv();
  const { sms } = getSettings();
  const apiKey = pick(env.MELIPAYAMAK_USERNAME ?? env.SMS_API_KEY, sms.apiKey);
  const secret = pick(env.MELIPAYAMAK_PASSWORD ?? env.SMS_API_SECRET, sms.secret);
  const provider = pick(
    env.SMS_PROVIDER,
    sms.provider === "demo" && apiKey ? "melipayamak" : sms.provider,
  ) as SmsSettings["provider"];
  return {
    provider,
    apiKey,
    secret,
    sender: pick(env.SMS_SENDER_NUMBER ?? env.SMS_SENDER, sms.sender),
    templateId: pick(env.SMS_TEMPLATE_ID, sms.templateId),
    templates: sms.templates,
  };
}

/** Payment settings as the gateway dispatcher should see them. */
export function effectivePaymentSettings(): PaymentSettings {
  const env = getEnv();
  const { payment } = getSettings();
  const merchantId = pick(env.ZIBAL_MERCHANT ?? env.PAYMENT_MERCHANT_ID, payment.merchantId);
  const provider = pick(
    env.PAYMENT_PROVIDER,
    payment.provider === "demo" && merchantId ? "zibal" : payment.provider,
  ) as PaymentSettings["provider"];
  return {
    provider,
    merchantId,
    secret: pick(env.PAYMENT_SECRET, payment.secret),
    /**
     * A live site must not silently run against a PSP sandbox. The stored
     * default is `sandbox: true` (safe for a laptop), so in production the
     * switch is only honoured from the environment and only when it says so
     * explicitly; outside production the stored setting still applies.
     */
    sandbox: isProduction()
      ? env.PAYMENT_SANDBOX === "true"
      : env.PAYMENT_SANDBOX === undefined
        ? payment.sandbox
        : env.PAYMENT_SANDBOX === "true",
  };
}

/** True when a real SMS panel is reachable with the credentials we hold. */
export function smsConfigured(): boolean {
  const sms = effectiveSmsSettings();
  return sms.provider !== "demo" && sms.apiKey.length > 0;
}

/**
 * True when a real gateway can take money.
 *
 * Deliberately independent of `demoPaymentAllowed()`: this reports what is
 * configured, that one reports what is permitted.
 */
export function paymentConfigured(): boolean {
  const payment = effectivePaymentSettings();
  return payment.provider !== "demo" && payment.merchantId.length > 0;
}

/** Whether the configured gateway is pointed at its sandbox. */
export function paymentSandbox(): boolean {
  return effectivePaymentSettings().sandbox;
}

export interface IntegrationStatus {
  sms: { configured: boolean; provider: string; fromEnvironment: boolean; templateConfigurationReady: boolean };
  payment: { configured: boolean; provider: string; sandbox: boolean; fromEnvironment: boolean };
}

/** Booleans only — safe to expose on `/api/health`. */
export function integrationStatus(): IntegrationStatus {
  const env = getEnv();
  const stored = getSettings();
  const sms = effectiveSmsSettings();
  const payment = effectivePaymentSettings();
  return {
    sms: {
      configured: smsConfigured(),
      provider: sms.provider,
      fromEnvironment: Boolean(
        (env.MELIPAYAMAK_USERNAME || env.SMS_API_KEY || env.SMS_PROVIDER) &&
          (sms.apiKey !== stored.sms.apiKey || sms.provider !== stored.sms.provider),
      ),
      templateConfigurationReady: Object.values(stored.sms.templates ?? {}).every(
        (template) => !template.enabled || /^\d+$/.test(template.templateId),
      ),
    },
    payment: {
      configured: paymentConfigured(),
      provider: payment.provider,
      sandbox: payment.sandbox,
      fromEnvironment: Boolean(
        (env.ZIBAL_MERCHANT || env.PAYMENT_MERCHANT_ID || env.PAYMENT_PROVIDER) &&
          (payment.merchantId !== stored.payment.merchantId || payment.provider !== stored.payment.provider),
      ),
    },
  };
}

/**
 * Integration gaps that would surprise an operator on launch day.
 * Returns Persian messages for the admin panel and the boot log.
 */
export function integrationWarnings(): string[] {
  if (!isProduction()) return [];
  const warnings: string[] = [];
  if (!paymentConfigured()) {
    warnings.push("درگاه پرداخت پیکربندی نشده است؛ تسویه‌حساب با خطا متوقف می‌شود. ZIBAL_MERCHANT را تنظیم کنید.");
  } else if (paymentSandbox()) {
    warnings.push("درگاه پرداخت روی حالت آزمایشی (sandbox) است؛ پرداخت واقعی انجام نمی‌شود.");
  }
  if (!smsConfigured()) {
    warnings.push("سامانه پیامک پیکربندی نشده است؛ کد ورود و پیامک سفارش ارسال نمی‌شود. MELIPAYAMAK_USERNAME و MELIPAYAMAK_PASSWORD را تنظیم کنید.");
  }
  return warnings;
}
