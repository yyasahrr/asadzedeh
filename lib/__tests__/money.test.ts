import { describe, expect, it } from "vitest";
import { assertMoney, toman, tomanToRial } from "@/lib/money";
import { formatPrice } from "@/lib/format";

describe("money", () => {
  it("formats ten million as a full localized amount", () => {
    const value = formatPrice(10_000_000);
    expect(value).toBe("۱۰٬۰۰۰٬۰۰۰ تومان");
    expect(value).not.toContain("م تومان");
  });
  it("stores integer toman", () => {
    expect(toman(1850000.4)).toBe(1850000);
    expect(tomanToRial(1850000)).toBe(18500000);
  });

  it("rejects floats as stored amounts", () => {
    expect(() => assertMoney(1.5)).toThrow();
    expect(assertMoney(0)).toBe(0);
  });
});
