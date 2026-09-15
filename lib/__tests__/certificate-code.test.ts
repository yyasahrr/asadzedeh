import { describe, expect, it } from "vitest";
import { generateCertificateCode, isCertificateCode } from "@/lib/certificate-code";

describe("certificate codes", () => {
  it("are unique and non-sequential", () => {
    const codes = new Set(Array.from({ length: 40 }, () => generateCertificateCode()));
    expect(codes.size).toBe(40);
    for (const code of codes) {
      expect(isCertificateCode(code)).toBe(true);
      expect(code.startsWith("AZ-C-")).toBe(false);
    }
  });

  it("accepts legacy sequential codes for existing records", () => {
    expect(isCertificateCode("AZ-C-1182")).toBe(true);
  });
});
