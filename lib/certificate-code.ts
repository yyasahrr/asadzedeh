import crypto from "node:crypto";

/** Non-sequential, unique-enough public certificate codes. */
export function generateCertificateCode(): string {
  const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `AZ-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function isCertificateCode(value: string): boolean {
  return /^AZ-[0-9A-F]{4}-[0-9A-F]{8}$/i.test(value) || /^AZ-C-\d+$/i.test(value);
}
