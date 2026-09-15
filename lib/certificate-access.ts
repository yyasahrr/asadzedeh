import type { Certificate } from "./types";
import type { SessionUser } from "./auth";
import { isStaff } from "./auth";

/**
 * Who may read a certificate.
 *
 * A certificate is a personal document: it carries a student's name, the course,
 * the instructor and the date. The public surface for one is `/verify/[code]`,
 * which answers "is this genuine" and is deliberately rate-limited. Everything
 * that renders the document itself — the dashboard page and the PDF download —
 * goes through here.
 *
 * Codes are not a secret. Legacy ones are sequential (`AZ-C-1182`), so treating
 * a code as a capability would let anyone walk the whole register.
 */
export function canAccessCertificate(
  cert: Certificate | undefined | null,
  user: SessionUser | null,
): boolean {
  if (!cert || !user) return false;
  if (isStaff(user)) return true;
  if (cert.userId) return cert.userId === user.id;
  // Pre-userId certificates are matched the way the certificate list already
  // matches them, by the name on the document.
  return cert.student === user.name;
}
