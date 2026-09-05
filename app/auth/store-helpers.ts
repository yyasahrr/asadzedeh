import { readDb, writeDb } from "@/lib/store";
import type { SessionRow, User } from "@/lib/types";

export function getUsers(): User[] {
  return readDb().users;
}

export function getUserByPhone(phone: string): User | undefined {
  return readDb().users.find((u) => u.phone === phone);
}

/** Read raw sessions (kept separate so auth logic stays in one place). */
export function readSessionsForWrite(): SessionRow[] {
  return readDb().sessions;
}

export { writeDb };
