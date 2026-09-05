import crypto from "node:crypto";

/**
 * RFC 6238 TOTP (Google Authenticator / Authy / Microsoft Authenticator compatible).
 * Zero dependencies: base32 + HMAC-SHA1, 6 digits, 30-second step.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

function hotp(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function totp(secret: string, at = Date.now(), step = 30): string {
  return hotp(secret, Math.floor(at / 1000 / step));
}

/** Verify a code allowing ±1 step of clock drift. Returns matched step (for replay protection) or null. */
export function verifyTotp(secret: string, code: string, at = Date.now(), window = 1, step = 30): number | null {
  const normalized = code.replace(/[^0-9]/g, "");
  if (normalized.length !== 6) return null;
  const counter = Math.floor(at / 1000 / step);
  for (let i = -window; i <= window; i++) {
    const expected = hotp(secret, counter + i);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))) return counter + i;
  }
  return null;
}

export function otpauthUrl(secret: string, account: string, issuer = "Asadzedeh"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Recovery codes in the form XXXX-XXXX (10 codes). */
export function generateRecoveryCodes(n = 10): string[] {
  return Array.from({ length: n }, () => {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

/* ---------- secret at-rest encryption (AES-256-GCM, keyed by APP_SECRET) ---------- */

function appKey(): Buffer | null {
  const s = process.env.APP_SECRET;
  if (!s) return null;
  return crypto.createHash("sha256").update(s).digest();
}

export function sealSecret(plain: string): string {
  const key = appKey();
  if (!key) return `plain:${plain}`;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `gcm:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
}

export function openSecret(stored: string): string {
  if (stored.startsWith("plain:")) return stored.slice(6);
  if (!stored.startsWith("gcm:")) return stored;
  const key = appKey();
  if (!key) throw new Error("APP_SECRET missing; cannot decrypt TOTP secret");
  const [, ivHex, tagHex, dataHex] = stored.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
