import { describe, expect, it } from "vitest";
import { MAX_CERTIFICATE_PDF_BYTES, validateCertificatePdf } from "@/lib/certificate-upload";
import { isValidObjectKey, randomObjectKey } from "@/lib/storage";

describe("custom certificate PDF validation", () => {
  it("accepts a PDF signature with the correct MIME type", () => {
    expect(validateCertificatePdf(new TextEncoder().encode("%PDF-1.7\nbody"), "application/pdf")).toBeNull();
  });

  it("rejects spoofed MIME, invalid bytes and oversized files", () => {
    expect(validateCertificatePdf(new TextEncoder().encode("%PDF-1.7"), "text/html")).toBe("type");
    expect(validateCertificatePdf(new TextEncoder().encode("not a pdf"), "application/pdf")).toBe("signature");
    expect(validateCertificatePdf(new Uint8Array(MAX_CERTIFICATE_PDF_BYTES + 1), "application/pdf")).toBe("size");
  });

  it("uses safe random private object keys and rejects traversal", () => {
    expect(isValidObjectKey(randomObjectKey("private/certificates", "pdf"))).toBe(true);
    expect(isValidObjectKey("private/certificates/../../secret.pdf")).toBe(false);
  });
});
