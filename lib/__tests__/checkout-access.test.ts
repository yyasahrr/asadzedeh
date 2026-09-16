import { describe, expect, it } from "vitest";
import { checkoutRequiresAccount } from "@/lib/checkout-access";

describe("checkout account policy", () => {
  it.each(["course", "learning_path"] as const)("requires authentication for %s", (kind) => {
    expect(checkoutRequiresAccount([{ kind }])).toBe(true);
  });

  it("preserves guest checkout for physical products", () => {
    expect(checkoutRequiresAccount([{ kind: "product" }])).toBe(false);
  });

  it("preserves guest registration for in-person classes", () => {
    expect(checkoutRequiresAccount([{ kind: "class" }])).toBe(false);
  });
});
