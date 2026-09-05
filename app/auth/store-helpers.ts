// Thin re-export so auth server actions import store access from one local module.
export { getUserByPhone, getUsers, getSessions as readSessionsForWrite, writeDb } from "@/lib/store";
