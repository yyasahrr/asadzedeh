import { getEnv, isProduction } from "./env";
import { getSettings } from "./store";
import type { PaymentSettings, SmsSettings } from "./types";
import { decryptSecret } from "./secret-crypto";

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

function storedSmsCredentials(sms: SmsSettings): { apiKey: string; secret: string; decryptionFailed: boolean } {
  try {
    return { apiKey: decryptSecret(sms.apiKey), secret: decryptSecret(sms.secret), decryptionFailed: false };
  } catch {
    // An APP_SECRET rotation or damaged authenticated ciphertext must never be
    // interpreted as usable credentials. Keep values out of logs and leave the
    // admin page available so an owner can enter fresh credentials.
    return { apiKey: "", secret: "", decryptionFailed: true };
  }
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
  const storedCredentials = storedSmsCredentials(sms);
  const storedApiKey = storedCredentials.apiKey;
  const storedSecret = storedCredentials.secret;
  if (storedCredentials.decryptionFailed) return { provider: "demo", apiKey: "", secret: "", sender: "", templateId: "", templates: sms.templates };
  const adminConfigured = sms.provider !== "demo" && storedApiKey.length > 0 && storedSecret.length > 0;
  const apiKey = adminConfigured ? storedApiKey : pick(env.MELIPAYAMAK_USERNAME ?? env.SMS_API_KEY, "");
  const secret = adminConfigured ? storedSecret : pick(env.MELIPAYAMAK_PASSWORD ?? env.SMS_API_SECRET, "");
  const provider = (adminConfigured ? sms.provider : pick(env.SMS_PROVIDER, apiKey ? "melipayamak" : "demo")) as SmsSettings["provider"];
  return {
    provider,
    apiKey,
    secret,
    sender: adminConfigured ? sms.sender : pick(env.SMS_SENDER_NUMBER ?? env.SMS_SENDER, ""),
    templateId: adminConfigured ? sms.templateId : pick(env.SMS_TEMPLATE_ID, ""),
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
  sms: { configured: boolean; provider: string; fromEnvironment: boolean; templateConfigurationReady: boolean; credentialDecryptionFailed: boolean };
  payment: { configured: boolean; provider: string; sandbox: boolean; fromEnvironment: boolean };
}

/** Booleans only — safe to expose on `/api/health`. */
export function integrationStatus(): IntegrationStatus {
  const env = getEnv();
  const stored = getSettings();
  const sms = effectiveSmsSettings();
  const payment = effectivePaymentSettings();
  const smsSecrets = storedSmsCredentials(stored.sms);
  return {
    sms: {
      configured: smsConfigured(),
      provider: sms.provider,
      fromEnvironment: !stored.sms.apiKey && Boolean(env.MELIPAYAMAK_USERNAME || env.SMS_API_KEY),
      templateConfigurationReady: Object.values(stored.sms.templates ?? {}).every(
        (template) => !template.enabled || /^\d+$/.test(template.templateId),
      ),
      credentialDecryptionFailed: smsSecrets.decryptionFailed,
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
