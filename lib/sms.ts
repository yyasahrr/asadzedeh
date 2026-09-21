import { fetchWithTimeout } from "./http";
import type { FetchOptions } from "./http";

/**
 * SMS panel layer.
 *
 * Iranian panels differ in auth style (API key in the path, a header, or basic
 * auth), in whether they accept a freeform message at all, and in what they call
 * success. This module hides that behind two calls — a broadcast send and a
 * one-time-code send — so `lib/notify.ts` and the OTP flow never branch on a
 * provider name.
 *
 * Only panels whose documented request/response shape could be confirmed are
 * here. Adding a guessed one would fail at the moment it mattered.
 */

export type { SmsProviderId } from "./types";
export { SMS_PROVIDERS } from "./types";
import type { SmsProviderId } from "./types";

export interface SmsCredentials {
  apiKey: string;
  secret: string;
  /** Sender line number, where the panel supports choosing one. */
  sender: string;
  /** Template id, required by template-based panels for code delivery. */
  templateId: string;
}

export type SmsTemplateParameters = string[];

type MeliPayamakResponse = {
  Value?: string | number;
  RetStatus?: number;
  StrRetStatus?: string;
  /** Newer REST responses report success here instead of `RetStatus`. */
  IsSuccessful?: boolean;
  Message?: string;
};

/**
 * Did the panel accept the message?
 *
 * Both documented response shapes are honoured: the classic
 * `{ RetStatus, StrRetStatus, Value }` and the newer
 * `{ IsSuccessful, Message, Value }`. Reading only one of them means a panel
 * upgrade turns every successful send into a reported failure — and an operator
 * chasing "the SMS is not sending" while customers are in fact receiving two.
 *
 * A positive `Value` (the panel's reception id) is still required: a body that
 * claims success but carries no id has not actually queued anything we could
 * later check delivery on.
 */
function meliPayamakOk(body: unknown): SmsResult {
  const data = (body ?? {}) as MeliPayamakResponse;
  const value = Number(data.Value);
  const succeeded = data.RetStatus === 1 || data.IsSuccessful === true;
  if (succeeded && Number.isFinite(value) && value > 0) return { ok: true };
  const detail =
    data.StrRetStatus || data.Message || `پاسخ نامعتبر (${String(data.Value ?? "بدون شناسه")})`;
  return { ok: false, error: `خطای ملی پیامک: ${detail}` };
}

/** MeliPayamak/FaraPayamak REST API. `apiKey` is the panel username. */
const melipayamak: SmsDriver = {
  id: "melipayamak",
  label: "ملی پیامک",
  credentialLabel: "نام کاربری وب‌سرویس",
  needsTemplateId: false,

  async send(recipients, message, c) {
    if (!c.secret || !c.sender) return { ok: false, error: "رمز وب‌سرویس و شماره فرستنده ملی پیامک لازم است" };
    const results = await Promise.all(recipients.map(async (to) => {
      const form = new URLSearchParams({ username: c.apiKey, password: c.secret, to, from: c.sender, text: message, isFlash: "false" });
      const { body } = await json("https://rest.payamak-panel.com/api/SendSMS/SendSMS", {
        event: "sms.melipayamak",
        retry: { attempts: 2 },
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      return meliPayamakOk(body);
    }));
    return results.find((result) => !result.ok) ?? { ok: true };
  },

  async sendCode(phone, code, c) {
    if (!c.secret) return { ok: false, error: "رمز وب‌سرویس ملی پیامک لازم است" };
    if (!c.templateId) return this.send([phone], `کد ورود اسدزاده: ${code}`, c);
    const form = new URLSearchParams({ username: c.apiKey, password: c.secret, text: code, to: phone, bodyId: c.templateId });
    const { body } = await json("https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber", {
      event: "sms.melipayamak.template",
      retry: { attempts: 2 },
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    return meliPayamakOk(body);
  },

  async sendTemplate(phone, templateId, parameters, c) {
    if (!c.secret || !templateId) return { ok: false, error: "رمز وب‌سرویس و شناسه قالب ملی پیامک لازم است" };
    const form = new URLSearchParams({
      username: c.apiKey,
      password: c.secret,
      text: parameters.join(";"),
      to: phone,
      bodyId: templateId,
    });
    const { body } = await json("https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber", {
      event: "sms.melipayamak.template", retry: { attempts: 2 }, method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" }, body: form.toString(),
    });
    return meliPayamakOk(body);
  },
};

export interface SmsResult {
  ok: boolean;
  error?: string;
}

export interface SmsDriver {
  id: SmsProviderId;
  label: string;
  /** Label for the primary credential field in the admin panel. */
  credentialLabel: string;
  /** True when the panel needs a template id before it can deliver a code. */
  needsTemplateId: boolean;
  /** Freeform broadcast (order confirmations, announcements). */
  send(recipients: string[], message: string, c: SmsCredentials): Promise<SmsResult>;
  /** Template fast-path for one-time codes, where the panel has one. */
  sendCode?(phone: string, code: string, c: SmsCredentials): Promise<SmsResult>;
  /** Transactional pattern send. Parameter order follows the approved panel pattern. */
  sendTemplate?(phone: string, templateId: string, parameters: SmsTemplateParameters, c: SmsCredentials): Promise<SmsResult>;
}

async function json(url: string, init: FetchOptions): Promise<{ res: Response; body: unknown }> {
  const res = await fetchWithTimeout(url, { timeoutMs: 10_000, ...init });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Some panels answer a bare string or empty body; that is handled by the caller.
  }
  return { res, body };
}

/** Kavenegar: the API key is part of the URL path. */
const kavenegar: SmsDriver = {
  id: "kavenegar",
  label: "کاوه‌نگار",
  credentialLabel: "کلید وب‌سرویس (API Key)",
  needsTemplateId: false,

  async send(recipients, message, c) {
    const { body } = await json(`https://api.kavenegar.com/v1/${c.apiKey}/sms/send.json`, {
      event: "sms.kavenegar",
      retry: { attempts: 2 },
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ receptor: recipients.join(","), sender: c.sender || undefined, message }),
    });
    const d = body as { return?: { status?: number; message?: string } };
    if (d.return?.status === 200) return { ok: true };
    return { ok: false, error: d.return?.message || "خطای کاوه‌نگار" };
  },
};

/** Ghasedak: the API key is a header. */
const ghasedak: SmsDriver = {
  id: "ghasedak",
  label: "قاصدک",
  credentialLabel: "کلید وب‌سرویس (API Key)",
  needsTemplateId: false,

  async send(recipients, message, c) {
    const { res } = await json("https://api.ghasedak.me/v2/sms/send/simple", {
      event: "sms.ghasedak",
      retry: { attempts: 2 },
      method: "POST",
      headers: { "content-type": "application/json", apikey: c.apiKey },
      body: JSON.stringify({ message, receptor: recipients.join(","), lineNumber: c.sender || undefined }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `خطای قاصدک (${res.status})` };
  },
};

/**
 * SMS.ir: delivers codes through a pre-registered template rather than a
 * freeform message, which is why it needs a template id and why its code path
 * uses `send/verify`.
 */
const smsir: SmsDriver = {
  id: "smsir",
  label: "پیامک‌دهی (sms.ir)",
  credentialLabel: "کلید وب‌سرویس (x-api-key)",
  needsTemplateId: true,

  // Signature is narrowed: this panel has no freeform path, so it takes nothing.
  async send() {
    // sms.ir's documented fast path is template-based; freeform bulk sending
    // needs a verified sender line we cannot assume exists.
    return { ok: false, error: "پیامک‌دهی فقط ارسال کد از طریق قالب را پشتیبانی می‌کند" };
  },

  async sendCode(phone, code, c) {
    if (!c.templateId) return { ok: false, error: "شناسه قالب پیامک تنظیم نشده است" };
    const { body } = await json("https://api.sms.ir/v1/send/verify", {
      event: "sms.smsir",
      retry: { attempts: 2 },
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/plain", "x-api-key": c.apiKey },
      body: JSON.stringify({
        mobile: phone,
        templateId: Number(c.templateId),
        parameters: [{ name: "CODE", value: code }],
      }),
    });
    const d = body as { status?: number; message?: string };
    if (d.status === 1) return { ok: true };
    return { ok: false, error: d.message || "خطای پیامک‌دهی" };
  },
};

const DRIVERS: Record<string, SmsDriver> = { melipayamak, kavenegar, ghasedak, smsir };

export function getSmsDriver(provider: SmsProviderId): SmsDriver | undefined {
  return DRIVERS[provider];
}

export function listSmsDrivers(): SmsDriver[] {
  return Object.values(DRIVERS);
}
