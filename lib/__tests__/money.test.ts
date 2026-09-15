import { describe, expect, it } from "vitest";
import { assertMoney, toman, tomanToRial } from "@/lib/money";

describe("money", () => {
  it("stores integer toman", () => {
    expect(toman(1850000.4)).toBe(1850000);
    expect(tomanToRial(1850000)).toBe(18500000);
  });

  it("rejects floats as stored amounts", () => {
    expect(() => assertMoney(1.5)).toThrow();
    expect(assertMoney(0)).toBe(0);
  });
});
