"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { faToday } from "@/lib/format";
import {
  MFA_COOKIE,
  SESSION_COOKIE,
  getSessionUser,
  hashPassword,
  isInstructor,
  isStaff,
  newToken,
  signPayload,
  verifyPassword,
  verifySigned,
} from "@/lib/auth";
import { audit, requestContext } from "@/lib/audit";
import { openSecret, verifyTotp } from "@/lib/totp";
import { getSettings, getUserById, getUserByPhone, getUsers, getSessions, writeDb } from "@/lib/store";
import type { User } from "@/lib/types";

const SESSION_DAYS = 30;

function normalizePhone(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^0-9+]/g, "")
    .replace(/^\+98/, "0")
    .replace(/^98/, "0");
}

async function createSession(user: User, mfaVerified: boolean) {
  const token = newToken();
  const { ip, userAgent } = await requestContext();
  const sessions = getSessions().filter((s) => {
    // prune sessions older than SESSION_DAYS
    const t = s.lastSeen ? Date.parse(s.lastSeen) : NaN;
    return Number.isNaN(t) || Date.now() - t < SESSION_DAYS * 864e5;
  });
  sessions.push({ token, userId: user.id, createdAt: faToday(), mfaVerified, ip, userAgent, lastSeen: new Date().toISOString() });
  writeDb({
    sessions,
    users: getUsers().map((u) =>
      u.id === user.id ? { ...u, failedLogins: 0, lockedUntil: undefined, lastLoginAt: new Date().toISOString(), lastLoginIp: ip } : u
    ),
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

function homeFor(user: Pick<User, "role">): string {
  if (user.role === "instructor") return "/instructor";
  if (user.role !== "student") return "/admin";
  return "/dashboard";
}

export async function register(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const password = String(fd.get("password") ?? "");
  if (!name || !/^09\d{9}$/.test(phone) || password.length < 6) {
    redirect("/auth?tab=register&error=validation");
  }
  if (getUserByPhone(phone)) {
    redirect("/auth?tab=register&error=dup");
  }
  const users = getUsers();
  const user: User = {
    id: `u-${Date.now().toString(36)}`,
    name,
    phone,
    passwordHash: hashPassword(password),
    role: "student",
    createdAt: faToday(),
  };
  users.push(user);
  writeDb({ users });
  await audit({ action: "auth.register", actor: { id: user.id, name: user.name, role: "student" } });
  await createSession(user, false);
  redirect("/dashboard");
}

export async function login(fd: FormData) {
  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "");
  const user = getUserByPhone(phone);
  const sec = getSettings().security;

  if (user?.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) {
    await audit({ action: "auth.login.locked", level: "security", actor: { id: user.id, name: user.name, role: user.role } });
    redirect("/auth?error=locked");
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    if (user) {
      const failed = (user.failedLogins ?? 0) + 1;
      const lock = failed >= sec.maxFailedLogins;
      writeDb({
        users: getUsers().map((u) =>
          u.id === user.id
            ? { ...u, failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + sec.lockMinutes * 60_000).toISOString() : u.lockedUntil }
            : u
        ),
      });
      await audit({
        action: lock ? "auth.login.locked" : "auth.login.failed",
        level: "security",
        actor: { id: user.id, name: user.name, role: user.role },
        detail: { attempt: failed },
      });
      if (lock) redirect("/auth?error=locked");
    } else {
      await audit({ action: "auth.login.failed", level: "security", detail: { phone } });
    }
    redirect("/auth?error=invalid");
  }

  // Second factor?
  if (user.totp?.enabled) {
    const jar = await cookies();
    const ticket = signPayload({ uid: user.id, exp: Date.now() + 5 * 60_000, next });
    jar.set(MFA_COOKIE, ticket, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
    await audit({ action: "auth.2fa.challenge", level: "security", actor: { id: user.id, name: user.name, role: user.role } });
    redirect("/auth/verify");
  }

  await createSession(user, false);
  await audit({ action: "auth.login", actor: { id: user.id, name: user.name, role: user.role } });
  redirect(next && next.startsWith("/") ? next : homeFor(user));
}

/** Step 2: TOTP or recovery code. */
export async function verifyMfa(fd: FormData) {
  const jar = await cookies();
  const ticket = jar.get(MFA_COOKIE)?.value ?? "";
  const payload = verifySigned<{ uid: string; exp: number; next: string }>(ticket);
  if (!payload) redirect("/auth?error=expired");
  const user = getUserById(payload.uid);
  if (!user?.totp?.enabled) redirect("/auth?error=invalid");

  const code = String(fd.get("code") ?? "").trim();
  const isRecovery = /^[0-9A-Z]{4}-[0-9A-Z]{4}$/i.test(code);
  let ok = false;

  if (isRecovery) {
    const idx = user.totp.recoveryCodes.findIndex((h) => verifyPassword(code.toUpperCase(), h));
    if (idx >= 0) {
      ok = true;
      const remaining = user.totp.recoveryCodes.filter((_, i) => i !== idx);
      writeDb({ users: getUsers().map((u) => (u.id === user.id ? { ...u, totp: { ...u.totp!, recoveryCodes: remaining } } : u)) });
      await audit({ action: "auth.2fa.recovery", level: "security", actor: { id: user.id, name: user.name, role: user.role }, detail: { remaining: remaining.length } });
    }
  } else {
    const step = verifyTotp(openSecret(user.totp.secret), code);
    if (step !== null && step > (user.totp.lastStep ?? 0)) {
      ok = true;
      writeDb({ users: getUsers().map((u) => (u.id === user.id ? { ...u, totp: { ...u.totp!, lastStep: step } } : u)) });
    }
  }

  if (!ok) {
    await audit({ action: "auth.2fa.failed", level: "security", actor: { id: user.id, name: user.name, role: user.role } });
    redirect("/auth/verify?error=code");
  }

  jar.delete(MFA_COOKIE);
  await createSession(user, true);
  await audit({ action: "auth.2fa.verified", level: "security", actor: { id: user.id, name: user.name, role: user.role } });
  await audit({ action: "auth.login", actor: { id: user.id, name: user.name, role: user.role } });
  redirect(payload.next && payload.next.startsWith("/") ? payload.next : homeFor(user));
}

/** Re-verify TOTP for an already logged-in staff session (e.g. enabled 2FA after login). */
export async function verifyMfaForSession(fd: FormData) {
  const me = await getSessionUser();
  if (!me) redirect("/auth");
  const user = getUserById(me.id);
  if (!user?.totp?.enabled) redirect(isInstructor(me) ? "/instructor" : "/admin");
  const code = String(fd.get("code") ?? "").trim();
  const step = verifyTotp(openSecret(user.totp.secret), code);
  const ok = step !== null && step > (user.totp.lastStep ?? 0);
  if (!ok) {
    await audit({ action: "auth.2fa.failed", level: "security", actor: { id: user.id, name: user.name, role: user.role } });
    redirect("/auth/verify?error=code&mode=session");
  }
  writeDb({
    users: getUsers().map((u) => (u.id === user.id ? { ...u, totp: { ...u.totp!, lastStep: step } } : u)),
    sessions: getSessions().map((s) => (s.token === me.sessionToken ? { ...s, mfaVerified: true } : s)),
  });
  await audit({ action: "auth.2fa.verified", level: "security", actor: { id: user.id, name: user.name, role: user.role } });
  redirect(isStaff(me) ? (isInstructor(me) ? "/instructor" : "/admin") : "/dashboard");
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const me = await getSessionUser();
  if (token) {
    writeDb({ sessions: getSessions().filter((s) => s.token !== token) });
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(MFA_COOKIE);
  if (me) await audit({ action: "auth.logout", actor: { id: me.id, name: me.name, role: me.role } });
  redirect("/");
}
