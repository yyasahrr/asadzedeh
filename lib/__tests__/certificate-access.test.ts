import { describe, expect, it } from "vitest";
import { canAccessCertificate } from "@/lib/certificate-access";
import type { Certificate } from "@/lib/types";
import type { SessionUser } from "@/lib/auth";

/**
 * Certificate access control.
 *
 * Found by `scripts/security-audit.ts`: `/api/certificates/[code]/pdf` and
 * `/dashboard/certificates/[code]` answered an anonymous request with the full
 * document. Legacy codes are sequential (`AZ-C-1182`), so a code is not a
 * capability — these cases pin that the document is only handed to its owner or
 * to staff.
 */

const cert: Certificate = {
  code: "AZ-C-1182",
  student: "سارا محمدی",
  course: "گلیم‌بافی مقدماتی",
  date: "تیر ۱۴۰۵",
  hours: 12,
  userId: "u-owner",
};

/** A certificate issued before certificates carried a userId. */
const legacy: Certificate = { ...cert, code: "AZ-C-0007", userId: undefined };

function user(over: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "u-owner",
    name: "سارا محمدی",
    phone: "09121112233",
    role: "student",
    createdAt: "۱ تیر ۱۴۰۵",
    totpEnabled: false,
    mfaVerified: false,
    sessionToken: "tok",
    ...over,
  } as SessionUser;
}

describe("canAccessCertificate", () => {
  it("refuses an anonymous visitor", () => {
    expect(canAccessCertificate(cert, null)).toBe(false);
  });

  it("refuses a signed-in student who is not the owner", () => {
    expect(canAccessCertificate(cert, user({ id: "u-other", name: "کس دیگر" }))).toBe(false);
  });

  it("allows the owner", () => {
    expect(canAccessCertificate(cert, user())).toBe(true);
  });

  it("allows staff, who issue and reissue certificates", () => {
    expect(canAccessCertificate(cert, user({ id: "u-admin", role: "admin" }))).toBe(true);
    expect(canAccessCertificate(cert, user({ id: "u-sup", role: "super_admin" }))).toBe(true);
    expect(canAccessCertificate(cert, user({ id: "u-mgr", role: "manager" }))).toBe(true);
  });

  it("does not let a namesake claim a certificate that carries a userId", () => {
    // Same display name, different account: userId wins over the name match.
    expect(canAccessCertificate(cert, user({ id: "u-impostor", name: "سارا محمدی" }))).toBe(false);
  });

  it("falls back to the name on the document for legacy certificates", () => {
    expect(canAccessCertificate(legacy, user({ id: "u-legacy", name: "سارا محمدی" }))).toBe(true);
    expect(canAccessCertificate(legacy, user({ id: "u-legacy", name: "کس دیگر" }))).toBe(false);
  });

  it("refuses a certificate that does not exist", () => {
    expect(canAccessCertificate(undefined, user())).toBe(false);
    expect(canAccessCertificate(null, user())).toBe(false);
  });
});
