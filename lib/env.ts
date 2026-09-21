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
  /** pino level. Read directly by lib/logger.ts before the schema is parsed. */
  LOG_LEVEL: optionalEnum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]),

  DATABASE_URL: z.string().min(1).optional().or(z.literal("")),
  DATABASE_SSL: optionalEnum(["true", "false"]),
  /**
   * Escape hatch for providers that terminate TLS with a private CA.
   *
   * Skipping certificate verification means anyone on the path can impersonate
   * the database and read every query, so it is opt-in and named loudly rather
   * than being the default behaviour of `DATABASE_SSL=true`.
   */
  DATABASE_SSL_REJECT_UNAUTHORIZED: optionalEnum(["true", "false"]),

  APP_SECRET: blankToUndefined(z.string().min(16).optional()) as z.ZodType<string | undefined>,
  /**
   * Legacy alias consulted only when APP_SECRET is absent. Declared here so it
   * cannot be an undeclared way to choose the signing key.
   */
  VIDEO_SIGNING_SECRET: blankToUndefined(z.string().min(16).optional()) as z.ZodType<string | undefined>,
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SITE_URL: optionalUrl,

  ALLOW_DEMO_PAYMENT: optionalEnum(["true", "false"]),
  ALLOW_DEMO_SEED: optionalEnum(["true", "false"]),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  /**
   * The AWS-standard spellings. Providers hand these names out in their own
   * console, so accepting them means an operator pasting from the provider's
   * docs does not silently get an unconfigured bucket.
   */
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
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

/**
 * The effective S3 credentials, whichever spelling the operator used.
 * Returns null unless every required piece is present: a half-configured bucket
 * must read as "not configured", never as "configured but broken at runtime".
 */
export function s3Credentials(): { endpoint: string; bucket: string; accessKey: string; secretKey: string } | null {
  const env = getEnv();
  const accessKey = env.S3_ACCESS_KEY || env.S3_ACCESS_KEY_ID || "";
  const secretKey = env.S3_SECRET_KEY || env.S3_SECRET_ACCESS_KEY || "";
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !accessKey || !secretKey) return null;
  return { endpoint: env.S3_ENDPOINT, bucket: env.S3_BUCKET, accessKey, secretKey };
}

export function objectStorageConfigured(): boolean {
  return s3Credentials() !== null;
}

export function appUrl(): string {
  const env = getEnv();
  // Search-engine generated URLs must never inherit an editable or mistyped host.
  if (env.NODE_ENV === "production") return "https://ghalibafiasadzadeh.ir";
  const candidate = env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    return new URL(candidate).origin;
  } catch {
    return "http://localhost:3000";
  }
}
