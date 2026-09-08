import { z } from "zod";
import type { Role } from "@/lib/types";
import { zPhone, zText } from "./schema";

/**
 * Validation for privileged admin mutations.
 *
 * Role assignment is the one form field that decides who owns the site, so the
 * accepted values are an explicit allowlist rather than a cast. `super_admin`
 * is deliberately absent: it is created by the bootstrap script only and can
 * never be granted through the UI.
 */

export const ASSIGNABLE_ROLES = ["manager", "editor", "support", "instructor", "student"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const STAFF_ROLES = ["manager", "editor", "support", "instructor"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const zAssignableRole = z.enum(ASSIGNABLE_ROLES, {
  error: "نقش انتخاب‌شده معتبر نیست",
});

export const zStaffRole = z.enum(STAFF_ROLES, {
  error: "نقش همکار معتبر نیست",
});

/** Creating a staff account. */
export const addStaffSchema = z.object({
  name: zText(80).pipe(z.string().min(2, "نام را وارد کنید")),
  phone: zPhone,
  password: z
    .string()
    .min(10, "گذرواژه باید حداقل ۱۰ نویسه باشد")
    .max(200, "گذرواژه بیش از حد طولانی است"),
  role: zStaffRole,
});

/** Changing an existing account's role. */
export const updateRoleSchema = z.object({
  id: zText(64).pipe(z.string().min(1, "شناسه کاربر الزامی است")),
  role: zAssignableRole,
});

export type AddStaffInput = z.infer<typeof addStaffSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

/** True when the target account is allowed to hold the requested role. */
export function isAssignableRole(role: Role): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

/**
 * Floating support channels.
 *
 * Each channel is optional: an empty value means "do not show this icon", which
 * is how a shop that only staffs Telegram configures it. What must not happen is
 * an operator pasting an arbitrary URL that we then render as a link, so the
 * Telegram field accepts a bare handle or a t.me link and nothing else.
 */
export const supportChannelsSchema = z.object({
  enabled: z.boolean(),
  telegram: z
    .string()
    .trim()
    .max(120, "شناسه تلگرام بیش از حد طولانی است")
    .refine((v) => v === "" || /^@?[A-Za-z0-9_]{4,60}$/.test(v) || /^https:\/\/(www\.)?t\.me\/[A-Za-z0-9_]{4,60}$/i.test(v), {
      error: "شناسه تلگرام باید نام کاربری یا لینک t.me باشد",
    }),
  whatsapp: z
    .string()
    .trim()
    .max(24, "شماره واتساپ بیش از حد طولانی است")
    .refine((v) => v === "" || /^\+?[\d\s-]{8,20}$/.test(v), {
      error: "شماره واتساپ معتبر نیست",
    }),
  label: z.string().trim().max(40, "عنوان بیش از حد طولانی است"),
  whatsappMessage: z.string().trim().max(400, "پیام پیش‌فرض بیش از حد طولانی است"),
});

export type SupportChannelsInput = z.infer<typeof supportChannelsSchema>;
