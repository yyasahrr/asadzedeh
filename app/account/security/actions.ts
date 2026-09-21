"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { accountBlockReason, getSessionUser, hashPassword, verifyPassword, signPayload, verifySigned } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { generateRecoveryCodes, generateSecret, openSecret, otpauthUrl, sealSecret, verifyTotp } from "@/lib/totp";
import { getSessions, getSettings, getUserById, getUserByPhone, getUsers, syncCollections, writeDb } from "@/lib/store";
import { requestLoginOtp, verifyLoginOtp } from "@/lib/otp";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { changeOwnerPhoneWithTotpAtomic, changeUserPhoneAtomic, resetOwnerPasswordWithTotpAtomic } from "@/lib/db/account-security";
import { createPhoneChangeChallenge, maskPhone, normalizeIranianMobile, PHONE_CHANGE_COOKIE, readPhoneChangeChallenge } from "@/lib/phone-change";
import { OTP_CHALLENGE_TTL_SECONDS } from "@/lib/otp-constants";

const SETUP_COOKIE = "az_totp_setup";

function phoneChangeRedirect(error: string): never {
  redirect(`/account/security?phoneError=${encodeURIComponent(error)}`);
}

function ownerRecoveryRedirect(error: string): never {
  redirect(`/account/security?ownerRecoveryError=${encodeURIComponent(error)}`);
}

function ownerRecoveryAccount(me: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!me || me.role !== "super_admin") redirect("/auth?next=/account/security");
  const user = getUserById(me.id);
  if (!user || accountBlockReason(user)) ownerRecoveryRedirect("account");
  if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) ownerRecoveryRedirect("account");
  if (!user.totp?.enabled) ownerRecoveryRedirect("totp-required");
  return { me, user };
}

function verifiedOwnerTotpStep(user: NonNullable<ReturnType<typeof getUserById>>, code: string): number {
  const limited = rateLimit(`owner-recovery-totp:${user.id}`, LIMITS.totp.limit, LIMITS.totp.windowMs);
  if (!limited.ok) ownerRecoveryRedirect("rate");
  const step = verifyTotp(openSecret(user.totp!.secret), code);
  if (step === null) ownerRecoveryRedirect("totp");
  if (step <= (user.totp!.lastStep ?? 0)) ownerRecoveryRedirect("replay");
  return step;
}

export async function changeOwnerPhoneWithTotp(fd: FormData) {
  const { me, user } = ownerRecoveryAccount(await getSessionUser());
  const newPhone = normalizeIranianMobile(fd.get("newPhone"));
  if (!/^09\d{9}$/.test(newPhone)) ownerRecoveryRedirect("format");
  if (newPhone === user.phone) ownerRecoveryRedirect("same");
  if (getUserByPhone(newPhone)) ownerRecoveryRedirect("duplicate");
  const step = verifiedOwnerTotpStep(user, String(fd.get("totpCode") ?? ""));
  const changed = await changeOwnerPhoneWithTotpAtomic({
    userId: me.id, oldPhone: user.phone, newPhone, currentSessionToken: me.sessionToken, totpStep: step,
  });
  if (changed !== "changed") ownerRecoveryRedirect("replay");
  await syncCollections(["users", "sessions"]);
  await audit({
    action: "auth.phone.changed_with_totp", level: "security",
    actor: { id: me.id, name: me.name, role: me.role }, target: `user:${me.id}`,
    detail: { oldPhone: maskPhone(user.phone), newPhone: maskPhone(newPhone), verificationMethod: "totp", phoneOwnershipVerified: false, otherSessionsRevoked: true },
  });
  revalidatePath("/account/security");
  redirect("/account/security?saved=phone-totp");
}

export async function resetOwnerPasswordWithTotp(fd: FormData) {
  const { me, user } = ownerRecoveryAccount(await getSessionUser());
  const password = String(fd.get("newPassword") ?? "");
  const confirmation = String(fd.get("confirmPassword") ?? "");
  if (password.length < 12) ownerRecoveryRedirect("password-length");
  if (password !== confirmation) ownerRecoveryRedirect("password-match");
  const step = verifiedOwnerTotpStep(user, String(fd.get("totpCode") ?? ""));
  const changed = await resetOwnerPasswordWithTotpAtomic({
    userId: me.id, passwordHash: hashPassword(password), currentSessionToken: me.sessionToken, totpStep: step,
  });
  if (changed !== "changed") ownerRecoveryRedirect("replay");
  await syncCollections(["users", "sessions"]);
  await audit({
    action: "auth.password.reset_with_totp", level: "security",
    actor: { id: me.id, name: me.name, role: me.role }, target: `user:${me.id}`,
    detail: { verificationMethod: "totp", otherSessionsRevoked: true, loginLockCleared: true },
  });
  revalidatePath("/account/security");
  redirect("/account/security?saved=password-totp");
}

export async function requestPhoneChange(fd: FormData) {
  const me = await getSessionUser();
  if (!me || me.role !== "super_admin") redirect("/auth?next=/account/security");
  const user = getUserById(me.id);
  if (!user || accountBlockReason(user)) phoneChangeRedirect("account");
  const password = String(fd.get("currentPassword") ?? "");
  const newPhone = normalizeIranianMobile(fd.get("newPhone"));
  if (!verifyPassword(password, user.passwordHash)) phoneChangeRedirect("password");
  if (!/^09\d{9}$/.test(newPhone)) phoneChangeRedirect("format");
  if (newPhone === user.phone) phoneChangeRedirect("same");
  if (getUserByPhone(newPhone)) phoneChangeRedirect("duplicate");
  const limited = rateLimit(`phone-change:${me.id}`, LIMITS.otp.limit, LIMITS.otp.windowMs);
  if (!limited.ok) phoneChangeRedirect("rate");

  const sent = await requestLoginOtp(newPhone, () => ({ id: me.id, name: me.name }));
  if (!sent.ok) phoneChangeRedirect("cooldown");
  if (!sent.sent) phoneChangeRedirect("sms");
  const jar = await cookies();
  jar.set(PHONE_CHANGE_COOKIE, createPhoneChangeChallenge(me.id, user.phone, newPhone), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/account/security", maxAge: OTP_CHALLENGE_TTL_SECONDS,
  });
  await audit({ action: "auth.phone.change_requested", level: "security", actor: { id: me.id, name: me.name, role: me.role }, detail: { oldPhone: maskPhone(user.phone), newPhone: maskPhone(newPhone) } });
  redirect("/account/security?phoneStep=verify");
}

export async function verifyPhoneChange(fd: FormData) {
  const me = await getSessionUser();
  if (!me || me.role !== "super_admin") redirect("/auth?next=/account/security");
  const jar = await cookies();
  const challenge = readPhoneChangeChallenge(jar.get(PHONE_CHANGE_COOKIE)?.value);
  if (!challenge || challenge.userId !== me.id) phoneChangeRedirect("challenge");
  if (Date.now() >= challenge.otpExpiresAt) phoneChangeRedirect("expired");
  const user = getUserById(me.id);
  if (!user || accountBlockReason(user) || user.phone !== challenge.oldPhone) phoneChangeRedirect("stale");
  if (getUserByPhone(challenge.newPhone)) phoneChangeRedirect("duplicate");
  const limited = rateLimit(`phone-change-verify:${me.id}`, LIMITS.otp.limit, LIMITS.otp.windowMs);
  if (!limited.ok) phoneChangeRedirect("rate");
  const verified = await verifyLoginOtp(challenge.newPhone, String(fd.get("code") ?? ""));
  if (!verified.ok) phoneChangeRedirect(verified.reason);

  const changed = await changeUserPhoneAtomic({ userId: me.id, oldPhone: challenge.oldPhone, newPhone: challenge.newPhone, currentSessionToken: me.sessionToken });
  if (!changed) phoneChangeRedirect("stale");
  await syncCollections(["users", "sessions"]);
  jar.delete(PHONE_CHANGE_COOKIE);
  await audit({ action: "auth.phone.changed", level: "security", actor: { id: me.id, name: me.name, role: me.role }, target: `user:${me.id}`, detail: { oldPhone: maskPhone(challenge.oldPhone), newPhone: maskPhone(challenge.newPhone), otherSessionsRevoked: true } });
  revalidatePath("/account/security");
  redirect("/account/security?saved=phone");
}

export async function resendPhoneChange() {
  const me = await getSessionUser();
  if (!me || me.role !== "super_admin") redirect("/auth?next=/account/security");
  const jar = await cookies();
  const challenge = readPhoneChangeChallenge(jar.get(PHONE_CHANGE_COOKIE)?.value);
  if (!challenge || challenge.userId !== me.id) phoneChangeRedirect("challenge");
  const user = getUserById(me.id);
  if (!user || accountBlockReason(user) || user.phone !== challenge.oldPhone || getUserByPhone(challenge.newPhone)) phoneChangeRedirect("stale");
  if (Date.now() < challenge.resendAvailableAt) phoneChangeRedirect("cooldown");
  const limited = rateLimit(`phone-change:${me.id}`, LIMITS.otp.limit, LIMITS.otp.windowMs);
  if (!limited.ok) phoneChangeRedirect("rate");
  const sent = await requestLoginOtp(challenge.newPhone, () => ({ id: me.id, name: me.name }));
  if (!sent.ok) phoneChangeRedirect("cooldown");
  if (!sent.sent) phoneChangeRedirect("sms");
  jar.set(PHONE_CHANGE_COOKIE, createPhoneChangeChallenge(me.id, user.phone, challenge.newPhone), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/account/security", maxAge: OTP_CHALLENGE_TTL_SECONDS,
  });
  await audit({ action: "auth.phone.change_requested", level: "security", actor: { id: me.id, name: me.name, role: me.role }, detail: { newPhone: maskPhone(challenge.newPhone), resend: true } });
  redirect("/account/security?phoneStep=verify&resent=1");
}

export async function cancelPhoneChange() {
  const me = await getSessionUser();
  if (!me) redirect("/auth");
  const jar = await cookies();
  jar.delete(PHONE_CHANGE_COOKIE);
  redirect("/account/security");
}

export interface TotpSetup {
  secret: string;
  otpauth: string;
  qrDataUrl: string;
}

/** Begin enrolment: generate a secret, stash it (signed) in a short-lived cookie, return QR. */
export async function beginTotpSetup(): Promise<TotpSetup | { error: string }> {
  const me = await getSessionUser();
  if (!me || me.role !== "super_admin") return { error: "این قابلیت فقط برای مدیر ارشد فعال است" };
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
  if (!me || me.role !== "super_admin") return { ok: false, message: "این قابلیت فقط برای مدیر ارشد فعال است" };
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
  if (me.role !== "super_admin") redirect("/account/security");
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
  if (!me || me.role !== "super_admin") return { ok: false, message: "این قابلیت فقط برای مدیر ارشد فعال است" };
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
