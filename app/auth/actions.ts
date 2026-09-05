"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { faToday } from "@/lib/format";
import {
  SESSION_COOKIE,
  hashPassword,
  isStaff,
  newToken,
  verifyPassword,
} from "@/lib/auth";
import { getUserByPhone, getUsers, readSessionsForWrite, writeDb } from "./store-helpers";

const SESSION_DAYS = 30;

async function createSession(userId: string) {
  const token = newToken();
  const sessions = readSessionsForWrite();
  sessions.push({ token, userId, createdAt: faToday() });
  writeDb({ sessions });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function register(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!name || !phone || password.length < 6) {
    redirect("/auth?tab=register&error=validation");
  }
  if (getUserByPhone(phone)) {
    redirect("/auth?tab=register&error=dup");
  }
  const users = getUsers();
  const user = {
    id: `u-${Date.now().toString(36)}`,
    name,
    phone,
    passwordHash: hashPassword(password),
    role: "student" as const,
    createdAt: faToday(),
  };
  users.push(user);
  writeDb({ users });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function login(fd: FormData) {
  const phone = String(fd.get("phone") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const user = getUserByPhone(phone);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/auth?error=invalid");
  }
  await createSession(user.id);
  redirect(isStaff({ ...user, passwordHash: undefined } as never) ? "/admin" : "/dashboard");
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    writeDb({ sessions: readSessionsForWrite().filter((s) => s.token !== token) });
  }
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
