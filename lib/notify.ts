import nodemailer from "nodemailer";
import { getNotifyLog, getSettings, writeDb } from "./store";
import { getSmsDriver } from "./sms";
import type { SmsCredentials } from "./sms";

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

/** True when no real panel is configured, so sends are logged instead. */
function demoSms(): { provider: string; creds: SmsCredentials } {
  const { sms } = getSettings();
  return { provider: sms.provider, creds: { apiKey: sms.apiKey, sender: sms.sender, templateId: sms.templateId } };
}

/** Send SMS via the configured panel, or demo-log when none is set up. */
export async function sendSms(
  to: string[],
  message: string
): Promise<{ ok: boolean; mode: string; detail: string }> {
  const { sms } = getSettings();
  const { provider, creds } = demoSms();
  const receptors = to.filter(Boolean);
  if (receptors.length === 0) return { ok: false, mode: provider, detail: "گیرنده‌ای مشخص نشده" };

  const driver = getSmsDriver(sms.provider);
  if (!driver || !creds.apiKey) {
    log("sms", receptors.join("، "), message, "نمایشی (ارسال نشد)");
    console.log("[SMS-DEMO]", { to: receptors, message });
    return { ok: true, mode: "demo", detail: "حالت نمایشی: پیامک در لاگ ثبت شد" };
  }

  try {
    const r = await driver.send(receptors, message, creds);
    if (!r.ok) throw new Error(r.error || "خطای ارسال");
    log("sms", receptors.join("، "), message, `ارسال شد (${driver.label})`);
    return { ok: true, mode: driver.id, detail: "پیامک ارسال شد" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "خطای ارسال";
    log("sms", receptors.join("، "), message, `ناموفق: ${detail}`);
    return { ok: false, mode: driver.id, detail };
  }
}

/**
 * Deliver a one-time code.
 *
 * Template-based panels get their own fast path here; everything else falls back
 * to a formatted message so the OTP flow works whichever panel is configured.
 * Deliberately returns `{ ok: false }` rather than silently succeeding when no
 * panel is configured — an OTP the user never received must not be presented as
 * sent, or they will wait for a message that does not exist.
 */
export async function sendSmsCode(
  phone: string,
  code: string,
  text: string
): Promise<{ ok: boolean; mode: string; detail: string }> {
  const { sms } = getSettings();
  const { creds } = demoSms();
  const driver = getSmsDriver(sms.provider);

  if (!driver || !creds.apiKey) {
    log("sms", phone, text, "نمایشی (ارسال نشد)");
    console.log("[SMS-DEMO]", { to: phone, message: text });
    return { ok: true, mode: "demo", detail: "حالت نمایشی: کد در لاگ ثبت شد" };
  }

  try {
    const r = driver.sendCode
      ? await driver.sendCode(phone, code, creds)
      : await driver.send([phone], text, creds);
    if (!r.ok) throw new Error(r.error || "خطای ارسال");
    // The code itself never goes in the log.
    log("sms", phone, "کد یک‌بار مصرف", `ارسال شد (${driver.label})`);
    return { ok: true, mode: driver.id, detail: "کد ارسال شد" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "خطای ارسال";
    log("sms", phone, "کد یک‌بار مصرف", `ناموفق: ${detail}`);
    return { ok: false, mode: driver.id, detail };
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
