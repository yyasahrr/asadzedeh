import { getCertificate } from "@/lib/store";
import { generateCertificatePdf } from "@/lib/certificate-pdf";
import { getSessionUser } from "@/lib/auth";
import { canAccessCertificate } from "@/lib/certificate-access";
import { audit } from "@/lib/audit";
import { readObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Certificate PDF download.
 *
 * Restricted to the student it was issued to, or to staff. A missing or
 * unauthorised code answers 404 rather than 403 so the endpoint cannot be used
 * to confirm which codes exist, and the attempt is audited.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const requested = decodeURIComponent(code);
  const user = await getSessionUser();
  const cert = getCertificate(requested);

  if (!canAccessCertificate(cert, user)) {
    if (cert) {
      await audit({
        action: "certificate.access.denied",
        level: "security",
        actor: user ? { id: user.id, name: user.name, role: user.role } : { role: "anonymous" },
        target: `certificate:${requested}`,
      });
    }
    return Response.json({ error: "گواهی پیدا نشد" }, { status: 404 });
  }

  if (cert!.deliveryType === "uploaded" && cert!.pdfObjectKey) {
    const stored = await readObject(cert!.pdfObjectKey);
    if (!stored) return Response.json({ error: "فایل گواهی پیدا نشد" }, { status: 404 });
    return new Response(stored.body as BodyInit, {
      status: stored.status,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="certificate-${cert!.code}.pdf"`,
        "content-length": String(stored.contentLength ?? stored.size),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }

  const pdf = await generateCertificatePdf(cert!);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="certificate-${cert!.code}.pdf"`,
      "content-length": String(pdf.length),
      // A personal document must never be kept by a shared cache.
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
