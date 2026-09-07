import nodemailer from "nodemailer";
import { fetchWithTimeout } from "./http";
import { getNotifyLog, getSettings, writeDb } from "./store";

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

/** Send SMS via configured provider (Kavenegar / Ghasedak) or demo-log. */
export async function sendSms(
  to: string[],
  message: string
): Promise<{ ok: boolean; mode: string; detail: string }> {
  const { sms } = getSettings();
  const receptors = to.filter(Boolean);
  if (receptors.length === 0) return { ok: false, mode: sms.provider, detail: "گیرنده‌ای مشخص نشده" };

  if (sms.provider === "demo" || !sms.apiKey) {
    log("sms", receptors.join("، "), message, "نمایشی (ارسال نشد)");
    console.log("[SMS-DEMO]", { to: receptors, message });
    return { ok: true, mode: "demo", detail: "حالت نمایشی: پیامک در لاگ ثبت شد" };
  }

  try {
    if (sms.provider === "kavenegar") {
      const res = await fetchWithTimeout(`https://api.kavenegar.com/v1/${sms.apiKey}/sms/send.json`, {
        timeoutMs: 10_000,
        retry: { attempts: 2 },
        event: "sms.kavenegar",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receptor: receptors.join(","), sender: sms.sender || undefined, message }),
      });
      const data = (await res.json()) as { return?: { status?: number; message?: string } };
      if (data.return?.status === 200) {
        log("sms", receptors.join("، "), message, "ارسال شد (کاوه‌نگار)");
        return { ok: true, mode: "kavenegar", detail: "پیامک ارسال شد" };
      }
      throw new Error(data.return?.message || "خطای کاوه‌نگار");
    }
    // Ghasedak
    const res = await fetchWithTimeout("https://api.ghasedak.me/v2/sms/send/simple", {
      timeoutMs: 10_000,
      retry: { attempts: 2 },
      event: "sms.ghasedak",
      method: "POST",
      headers: { "content-type": "application/json", apikey: sms.apiKey },
      body: JSON.stringify({
        message,
        receptor: receptors.join(","),
        lineNumber: sms.sender || undefined,
      }),
    });
    if (!res.ok) throw new Error(`خطای قاصدک (${res.status})`);
    log("sms", receptors.join("، "), message, "ارسال شد (قاصدک)");
    return { ok: true, mode: "ghasedak", detail: "پیامک ارسال شد" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "خطای ارسال";
    log("sms", receptors.join("، "), message, `ناموفق: ${detail}`);
    return { ok: false, mode: sms.provider, detail };
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
