import type { Role, User } from "./types";

export const STAFF_ACCOUNT_ROLES = ["super_admin", "admin", "manager", "editor", "support", "instructor"] as const satisfies readonly Role[];

const staffRoleSet = new Set<Role>(STAFF_ACCOUNT_ROLES);

export function isStaffAccount(user: User): boolean {
  return staffRoleSet.has(user.role);
}

export function splitOwnerAndStaff(users: User[], ownerId: string): { owner: User | undefined; staff: User[] } {
  return {
    owner: users.find((user) => user.id === ownerId && user.role === "super_admin"),
    staff: users.filter((user) => user.id !== ownerId && isStaffAccount(user) && user.role !== "super_admin"),
  };
}
