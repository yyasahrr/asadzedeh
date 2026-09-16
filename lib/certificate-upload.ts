export const MAX_CERTIFICATE_PDF_BYTES = 10 * 1024 * 1024;

export function validateCertificatePdf(bytes: Uint8Array, contentType: string): string | null {
  if (contentType.toLowerCase().split(";")[0].trim() !== "application/pdf") return "type";
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_CERTIFICATE_PDF_BYTES) return "size";
  const header = new TextDecoder("ascii").decode(bytes.slice(0, Math.min(bytes.length, 1024)));
  if (!header.includes("%PDF-")) return "signature";
  return null;
}
