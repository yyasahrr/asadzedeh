import { z } from "zod";

/**
 * Environment contract.
 * Production fails fast on missing secrets. Optional integrations stay optional.
 */

const optionalUrl = z.string().url().optional().or(z.literal(""));

/**
 * Hosting panels write `KEY=` for an unset variable. An empty string is not an
 * invalid value, it is an absent one, and refusing to boot over it would turn a
 * blank text box in cPanel into an outage. Blank is therefore coerced to
 * `undefined` before validation, everywhere.
 */
const blankToUndefined = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), schema);

function optionalEnum<const T extends readonly string[]>(values: T) {
  return blankToUndefined(z.enum(values as unknown as [string, ...string[]]).optional()) as z.ZodType<
    T[number] | undefined
  >;
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production", "staging"]).default("development"),
  PORT: z.string().optional(),
  HOSTNAME: z.string().optional(),

  DATABASE_URL: z.string().min(1).optional().or(z.literal("")),
  DATABASE_SSL: optionalEnum(["true", "false"]),

  APP_SECRET: blankToUndefined(z.string().min(16).optional()) as z.ZodType<string | undefined>,
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SITE_URL: optionalUrl,

  ALLOW_DEMO_PAYMENT: optionalEnum(["true", "false"]),
  ALLOW_DEMO_SEED: optionalEnum(["true", "false"]),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: optionalEnum(["true", "false"]),

  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),

  SPOTPLAYER_API_KEY: z.string().optional(),
  FFMPEG_PATH: z.string().optional(),
  ZARINPAL_MERCHANT_ID: z.string().optional(),

  // Payments. Environment overrides the admin-panel settings when set, so a
  // merchant id can live in the host's environment block instead of the database.
  PAYMENT_PROVIDER: optionalEnum(["demo", "zarinpal", "idpay", "zibal", "payping"]),
  PAYMENT_MERCHANT_ID: z.string().optional(),
  PAYMENT_SECRET: z.string().optional(),
  PAYMENT_SANDBOX: optionalEnum(["true", "false"]),
  /** Zibal (زیبال) merchant string — the launch gateway. */
  ZIBAL_MERCHANT: z.string().optional(),

  // SMS. Same override rule; MeliPayamak (ملی پیامک) is the launch panel and
  // authenticates with a web-service username/password pair.
  SMS_PROVIDER: optionalEnum(["demo", "melipayamak", "kavenegar", "ghasedak", "smsir"]),
  SMS_API_KEY: z.string().optional(),
  SMS_API_SECRET: z.string().optional(),
  SMS_SENDER: z.string().optional(),
  SMS_SENDER_NUMBER: z.string().optional(),
  SMS_TEMPLATE_ID: z.string().optional(),
  MELIPAYAMAK_USERNAME: z.string().optional(),
  MELIPAYAMAK_PASSWORD: z.string().optional(),

  SUPER_ADMIN_PHONE: z.string().optional(),
  SUPER_ADMIN_PASSWORD: z.string().optional(),
  SUPER_ADMIN_NAME: z.string().optional(),

  NEXT_PUBLIC_NESHAN_MAP_KEY: z.string().optional(),
  NESHAN_SERVICE_API_KEY: z.string().optional(),
  WORKSHOP_LAT: z.string().optional(),
  WORKSHOP_LNG: z.string().optional(),
});

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

export function assertProductionSecrets() {
  const env = getEnv();
  if (env.NODE_ENV !== "production") return;
  const missing: string[] = [];
  if (!env.APP_SECRET || env.APP_SECRET.length < 32) missing.push("APP_SECRET (min 32 chars)");
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_SITE_URL) missing.push("NEXT_PUBLIC_APP_URL");
  if (missing.length > 0) {
    throw new Error(
      `Production refused to start. Missing required environment: ${missing.join(", ")}. See .env.example.`,
    );
  }
}

export function demoPaymentAllowed(): boolean {
  const env = getEnv();
  if (env.NODE_ENV === "production" && env.ALLOW_DEMO_PAYMENT !== "true") return false;
  return true;
}

export function objectStorageConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY);
}

export function appUrl(): string {
  const env = getEnv();
  return (env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
