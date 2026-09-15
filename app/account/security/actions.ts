"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { getSessionUser, hashPassword, verifyPassword, signPayload, verifySigned } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { generateRecoveryCodes, generateSecret, openSecret, otpauthUrl, sealSecret, verifyTotp } from "@/lib/totp";
import { getSessions, getSettings, getUserById, getUsers, writeDb } from "@/lib/store";

const SETUP_COOKIE = "az_totp_setup";

export interface TotpSetup {
  secret: string;
  otpauth: string;
  qrDataUrl: string;
}

/** Begin enrolment: generate a secret, stash it (signed) in a short-lived cookie, return QR. */
export async function beginTotpSetup(): Promise<TotpSetup | { error: string }> {
  const me = await getSessionUser();
  if (!me) return { error: "ابتدا وارد شوید" };
  const secret = generateSecret();
  const otpauth = otpauthUrl(secret, me.phone, getSettings().site.siteName || "Asadzedeh");
  const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 240, color: { dark: "#152f3d", light: "#fffdf7" } });
  const jar = await cookies();
  jar.set(SETUP_COOKIE, signPayload({ uid: me.id, secret, exp: Date.now() + 10 * 60_000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return { secret, otpauth, qrDataUrl };
}

/** Confirm enrolment with the first valid code; returns recovery codes (shown once). */
export async function confirmTotpSetup(
  _prev: { ok: boolean; message: string; recovery?: string[] } | null,
  fd: FormData
): Promise<{ ok: boolean; message: string; recovery?: string[] }> {
  const me = await getSessionUser();
  if (!me) return { ok: false, message: "ابتدا وارد شوید" };
  const jar = await cookies();
  const payload = verifySigned<{ uid: string; secret: string; exp: number }>(jar.get(SETUP_COOKIE)?.value ?? "");
  if (!payload || payload.uid !== me.id) return { ok: false, message: "زمان راه‌اندازی تمام شد؛ دوباره QR بسازید." };
  const code = String(fd.get("code") ?? "");
  const step = verifyTotp(payload.secret, code);
  if (step === null) return { ok: false, message: "کد اشتباه است. ساعت گوشی باید دقیق باشد." };

  const recovery = generateRecoveryCodes();
  writeDb({
    users: getUsers().map((u) =>
      u.id === me.id
        ? {
            ...u,
            totp: {
              enabled: true,
              secret: sealSecret(payload.secret),
              recoveryCodes: recovery.map((c) => hashPassword(c)),
              enabledAt: new Date().toISOString(),
              lastStep: step,
            },
          }
        : u
    ),
    // current session is now MFA-verified
    sessions: getSessions().map((s) => (s.token === me.sessionToken ? { ...s, mfaVerified: true } : s)),
  });
  jar.delete(SETUP_COOKIE);
  await audit({ action: "auth.2fa.enabled", level: "security", actor: { id: me.id, name: me.name, role: me.role } });
  revalidatePath("/account/security");
  return { ok: true, message: "ورود دومرحله‌ای فعال شد.", recovery };
}

/** Disable 2FA (requires password + current code). */
export async function disableTotp(fd: FormData) {
  const me = await getSessionUser();
  if (!me) redirect("/auth");
  const user = getUserById(me.id);
  if (!user?.totp?.enabled) redirect("/account/security");
  const password = String(fd.get("password") ?? "");
  const code = String(fd.get("code") ?? "");
  if (!verifyPassword(password, user.passwordHash) || verifyTotp(openSecret(user.totp.secret), code) === null) {
    redirect("/account/security?error=verify");
  }
  writeDb({ users: getUsers().map((u) => (u.id === me.id ? { ...u, totp: undefined } : u)) });
  await audit({ action: "auth.2fa.disabled", level: "security", actor: { id: me.id, name: me.name, role: me.role } });
  revalidatePath("/account/security");
  redirect("/account/security?saved=disabled");
}

/** Regenerate recovery codes (requires current code). */
export async function regenerateRecovery(
  _prev: { ok: boolean; message: string; recovery?: string[] } | null,
  fd: FormData
): Promise<{ ok: boolean; message: string; recovery?: string[] }> {
  const me = await getSessionUser();
  if (!me) return { ok: false, message: "ابتدا وارد شوید" };
  const user = getUserById(me.id);
  if (!user?.totp?.enabled) return { ok: false, message: "ورود دومرحله‌ای فعال نیست" };
  const code = String(fd.get("code") ?? "");
  if (verifyTotp(openSecret(user.totp.secret), code) === null) return { ok: false, message: "کد اشتباه است" };
  const recovery = generateRecoveryCodes();
  writeDb({
    users: getUsers().map((u) => (u.id === me.id ? { ...u, totp: { ...u.totp!, recoveryCodes: recovery.map((c) => hashPassword(c)) } } : u)),
  });
  await audit({ action: "auth.2fa.enabled", level: "security", actor: { id: me.id, name: me.name, role: me.role }, detail: { recoveryRegenerated: true } });
  return { ok: true, message: "کدهای بازیابی جدید ساخته شد؛ قبلی‌ها باطل شدند.", recovery };
}

/** Change password. */
export async function changePassword(fd: FormData) {
  const me = await getSessionUser();
  if (!me) redirect("/auth");
  const user = getUserById(me.id)!;
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (!verifyPassword(current, user.passwordHash) || next.length < 8) {
    redirect("/account/security?error=password");
  }
  writeDb({
    users: getUsers().map((u) => (u.id === me.id ? { ...u, passwordHash: hashPassword(next) } : u)),
    // sign out other sessions
    sessions: getSessions().filter((s) => s.userId !== me.id || s.token === me.sessionToken),
  });
  await audit({ action: "settings.update", level: "security", actor: { id: me.id, name: me.name, role: me.role }, detail: { passwordChanged: true } });
  redirect("/account/security?saved=password");
}

/** Sign out every other session of the current user. */
export async function revokeOtherSessions() {
  const me = await getSessionUser();
  if (!me) redirect("/auth");
  writeDb({ sessions: getSessions().filter((s) => s.userId !== me.id || s.token === me.sessionToken) });
  await audit({ action: "auth.logout", level: "security", actor: { id: me.id, name: me.name, role: me.role }, detail: { revokedOthers: true } });
  redirect("/account/security?saved=sessions");
}
