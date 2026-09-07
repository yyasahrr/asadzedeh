import pino from "pino";
import { getEnv } from "./env";

const redact = {
  paths: [
    "password",
    "passwordHash",
    "secret",
    "token",
    "cookie",
    "authorization",
    "apiKey",
    "merchantId",
    "APP_SECRET",
    "S3_SECRET_KEY",
    "recoveryCodes",
    "totp",
    "*.password",
    "*.passwordHash",
    "*.secret",
    "*.token",
    "*.apiKey",
  ],
  censor: "[redacted]",
};

function createLogger() {
  try {
    const env = getEnv();
    const dev = env.NODE_ENV !== "production";
    return pino({
      level: process.env.LOG_LEVEL || (dev ? "debug" : "info"),
      redact,
      base: { service: "asadzedeh" },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  } catch {
    return pino({ level: "info", redact });
  }
}

export const logger = createLogger();

export function logEvent(
  level: "info" | "warn" | "error" | "debug",
  event: string,
  fields: Record<string, unknown> = {},
) {
  logger[level]({ event, timestamp: new Date().toISOString(), ...fields });
}
