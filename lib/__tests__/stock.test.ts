import { describe, expect, it } from "vitest";
import { availableSeats, availableStock } from "@/lib/stock";

const physical = { kind: "physical" as const, allowBackorder: false };

describe("availableStock", () => {
  it("subtracts unpaid reservations from on-hand stock", () => {
    expect(availableStock({ ...physical, stock: 10, reservedStock: 3 })).toBe(7);
  });

  it("never reports a negative number", () => {
    expect(availableStock({ ...physical, stock: 2, reservedStock: 5 })).toBe(0);
  });

  it("treats a missing reservation count as zero", () => {
    expect(availableStock({ ...physical, stock: 4 })).toBe(4);
  });

  it("does not cap backorder or non-physical products", () => {
    expect(availableStock({ kind: "physical", allowBackorder: true, stock: 0, reservedStock: 0 })).toBe(99);
    expect(availableStock({ kind: "preorder", allowBackorder: false, stock: 0, reservedStock: 0 })).toBe(99);
  });
});

describe("availableSeats", () => {
  it("subtracts reserved seats from the open seats", () => {
    expect(availableSeats({ remaining: 5, reservedSeats: 2 })).toBe(3);
  });

  it("never reports a negative number", () => {
    expect(availableSeats({ remaining: 1, reservedSeats: 4 })).toBe(0);
  });

  it("treats a missing reservation count as zero", () => {
    expect(availableSeats({ remaining: 6 })).toBe(6);
  });
});
