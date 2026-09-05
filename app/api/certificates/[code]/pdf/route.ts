import { getCertificate } from "@/lib/store";
import { generateCertificatePdf } from "@/lib/certificate-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const cert = getCertificate(decodeURIComponent(code));
  if (!cert) {
    return Response.json({ error: "گواهی پیدا نشد" }, { status: 404 });
  }
  const pdf = await generateCertificatePdf(cert);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="certificate-${cert.code}.pdf"`,
      "content-length": String(pdf.length),
    },
  });
}
