import nodemailer from "nodemailer";
import { fetchWithTimeout } from "./http";
import { getNotifyLog, getSettings, writeDb } from "./store";
import type { SmsProvider, SmsSettings } from "./types";

function faNow(): string {
  return new Date().toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" });
}

function log(channel: "sms" | "email", to: string, message: string, status: string) {
  const entry = {
    id: `n-${Date.now().toString(36)}`,
    date: faNow(),
    channel,
    to,
    message: message.slice(0, 200),
    status,
  };
  writeDb({ notifyLog: [entry, ...getNotifyLog()].slice(0, 100) });
  return entry;
}

export const SMS_PROVIDER_LABELS: Record<SmsProvider, string> = {
  demo: "نمایشی (بدون ارسال واقعی)",
  kavenegar: "کاوه‌نگار",
  ghasedak: "قاصدک",
  smsir: "sms.ir",
  melipayamak: "ملی‌پیامک",
  farazsms: "فراز اس‌ام‌اس (ippanel)",
  raygansms: "رایگان اس‌ام‌اس",
};

/**
 * Send an SMS through the configured panel.
 *
 * Each panel is a thin adapter over `fetchWithTimeout`; failures are logged in
 * the notification log with the panel's own error text so an operator can tell a
 * bad credential from a rejected sender line. When `pattern` is given and the
 * panel supports templates (OTP messages), the templated endpoint is used —
 * Iranian operators reject free-form text for verification codes.
 */
export async function sendSms(
  to: string[],
  message: string,
  pattern?: { template: string; params: Record<string, string> }
): Promise<{ ok: boolean; mode: string; detail: string }> {
  const { sms } = getSettings();
  const receptors = to.filter(Boolean);
  if (receptors.length === 0) return { ok: false, mode: sms.provider, detail: "گیرنده‌ای مشخص نشده" };

  const hasCredentials = !!sms.apiKey || (!!sms.username && !!sms.password);
  if (sms.provider === "demo" || !hasCredentials) {
    log("sms", receptors.join("، "), message, "نمایشی (ارسال نشد)");
    console.log("[SMS-DEMO]", { to: receptors, message });
    return { ok: true, mode: "demo", detail: "حالت نمایشی: پیامک در لاگ ثبت شد" };
  }

  try {
    const detail = await dispatch(sms, receptors, message, pattern);
    log("sms", receptors.join("، "), message, `ارسال شد (${SMS_PROVIDER_LABELS[sms.provider]})`);
    return { ok: true, mode: sms.provider, detail };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "خطای ارسال";
    log("sms", receptors.join("، "), message, `ناموفق: ${detail}`);
    return { ok: false, mode: sms.provider, detail };
  }
}

type Pattern = { template: string; params: Record<string, string> } | undefined;

async function dispatch(
  sms: SmsSettings,
  receptors: string[],
  message: string,
  pattern: Pattern
): Promise<string> {
  const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
    fetchWithTimeout(url, {
      timeoutMs: 10_000,
      retry: { attempts: 2 },
      event: `sms.${sms.provider}`,
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

  switch (sms.provider) {
    case "kavenegar": {
      if (pattern?.template) {
        const query = new URLSearchParams({
          receptor: receptors[0],
          template: pattern.template,
          ...Object.fromEntries(
            Object.entries(pattern.params).slice(0, 3).map(([, v], i) => [`token${i === 0 ? "" : i + 1}`, v])
          ),
        });
        const res = await post(
          `https://api.kavenegar.com/v1/${sms.apiKey}/verify/lookup.json?${query.toString()}`,
          {}
        );
        const data = (await res.json()) as { return?: { status?: number; message?: string } };
        if (data.return?.status !== 200) throw new Error(data.return?.message || "خطای کاوه‌نگار");
        return "پیامک الگویی ارسال شد";
      }
      const res = await post(`https://api.kavenegar.com/v1/${sms.apiKey}/sms/send.json`, {
        receptor: receptors.join(","),
        sender: sms.sender || undefined,
        message,
      });
      const data = (await res.json()) as { return?: { status?: number; message?: string } };
      if (data.return?.status !== 200) throw new Error(data.return?.message || "خطای کاوه‌نگار");
      return "پیامک ارسال شد";
    }

    case "ghasedak": {
      const res = await post(
        "https://api.ghasedak.me/v2/sms/send/simple",
        { message, receptor: receptors.join(","), lineNumber: sms.sender || undefined },
        { apikey: sms.apiKey }
      );
      if (!res.ok) throw new Error(`خطای قاصدک (${res.status})`);
      return "پیامک ارسال شد";
    }

    case "smsir": {
      if (pattern?.template) {
        const res = await post(
          "https://api.sms.ir/v1/send/verify",
          {
            mobile: receptors[0],
            templateId: Number(pattern.template),
            parameters: Object.entries(pattern.params).map(([name, value]) => ({ name, value })),
          },
          { "x-api-key": sms.apiKey, accept: "text/plain" }
        );
        const data = (await res.json()) as { status?: number; message?: string };
        if (data.status !== 1) throw new Error(data.message || "خطای sms.ir");
        return "پیامک الگویی ارسال شد";
      }
      const res = await post(
        "https://api.sms.ir/v1/send/bulk",
        { lineNumber: Number(sms.sender) || undefined, messageText: message, mobiles: receptors },
        { "x-api-key": sms.apiKey, accept: "text/plain" }
      );
      const data = (await res.json()) as { status?: number; message?: string };
      if (data.status !== 1) throw new Error(data.message || "خطای sms.ir");
      return "پیامک ارسال شد";
    }

    case "melipayamak": {
      const res = await post("https://rest.payamak-panel.com/api/SendSMS/SendSMS", {
        username: sms.username,
        password: sms.password,
        to: receptors.join(","),
        from: sms.sender,
        text: message,
        isflash: false,
      });
      const data = (await res.json()) as { Value?: string; RetStatus?: number; StrRetStatus?: string };
      if (data.RetStatus !== 1) throw new Error(data.StrRetStatus || "خطای ملی‌پیامک");
      return "پیامک ارسال شد";
    }

    case "farazsms": {
      // ippanel v1 REST — the panel behind farazsms.com.
      const res = await post(
        "https://api2.ippanel.com/api/v1/sms/send/webservice/single",
        {
          recipient: receptors,
          sender: sms.sender,
          message,
        },
        { Authorization: `AccessKey ${sms.apiKey}` }
      );
      const data = (await res.json()) as { status?: string; error_message?: string; code?: number };
      if (data.status && data.status !== "OK") throw new Error(data.error_message || "خطای فراز اس‌ام‌اس");
      if (!res.ok) throw new Error(`خطای فراز اس‌ام‌اس (${res.status})`);
      return "پیامک ارسال شد";
    }

    case "raygansms": {
      const res = await post("https://smspanel.trez.ir/api/smsAPI/sendSMS", {
        username: sms.username,
        password: sms.password,
        LineNumber: sms.sender,
        Message: message,
        Mobiles: receptors,
      });
      const data = (await res.json()) as { IsSuccessful?: boolean; Message?: string };
      if (data.IsSuccessful === false) throw new Error(data.Message || "خطای رایگان اس‌ام‌اس");
      if (!res.ok) throw new Error(`خطای رایگان اس‌ام‌اس (${res.status})`);
      return "پیامک ارسال شد";
    }

    default:
      throw new Error("سامانه پیامکی پشتیبانی نمی‌شود");
  }
}

/** Send email via configured SMTP or demo-log. */
export async function sendEmail(
  to: string[],
  subject: string,
  html: string
): Promise<{ ok: boolean; mode: string; detail: string }> {
  const { email } = getSettings();
  const recipients = to.filter(Boolean);
  if (recipients.length === 0) return { ok: false, mode: "smtp", detail: "گیرنده‌ای مشخص نشده" };

  if (!email.host) {
    log("email", recipients.join("، "), `${subject} — ${html.slice(0, 120)}`, "نمایشی (ارسال نشد)");
    console.log("[EMAIL-DEMO]", { to: recipients, subject });
    return { ok: true, mode: "demo", detail: "حالت نمایشی: ایمیل در لاگ ثبت شد" };
  }

  try {
    const transport = nodemailer.createTransport({
      host: email.host,
      port: email.port || 587,
      secure: (email.port || 587) === 465,
      auth: email.user ? { user: email.user, pass: email.pass } : undefined,
    });
    await transport.sendMail({ from: email.from || email.user, to: recipients.join(","), subject, html });
    log("email", recipients.join("، "), subject, "ارسال شد");
    return { ok: true, mode: "smtp", detail: "ایمیل ارسال شد" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "خطای ارسال";
    log("email", recipients.join("، "), subject, `ناموفق: ${detail}`);
    return { ok: false, mode: "smtp", detail };
  }
}
