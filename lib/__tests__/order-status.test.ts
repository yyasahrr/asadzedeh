import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, isPaidStatus, parseOrderState } from "@/lib/order-status";

describe("order state machine", () => {
  it("maps Persian labels", () => {
    expect(parseOrderState("پرداخت شده")).toBe("PAID");
    expect(parseOrderState("در انتظار پرداخت")).toBe("AWAITING_PAYMENT");
  });

  it("allows paid fulfilment transitions", () => {
    expect(canTransition("AWAITING_PAYMENT", "PAID")).toBe(true);
    expect(canTransition("PAID", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
  });

  it("blocks illegal transitions", () => {
    expect(canTransition("CANCELLED", "PAID")).toBe(false);
    expect(canTransition("DELIVERED", "PENDING")).toBe(false);
    expect(() => assertTransition("CANCELLED", "PAID")).toThrow();
  });

  it("treats fulfilment statuses as paid", () => {
    expect(isPaidStatus("پرداخت شده")).toBe(true);
    expect(isPaidStatus("SHIPPED")).toBe(true);
    expect(isPaidStatus("لغو شده")).toBe(false);
  });
});
