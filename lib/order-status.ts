/** Canonical order state machine. Persian labels stay for the existing UI. */

export const ORDER_STATES = [
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "FAILED",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

export const ORDER_LABEL: Record<OrderState, string> = {
  PENDING: "در انتظار",
  AWAITING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت شده",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل شده",
  CANCELLED: "لغو شده",
  REFUNDED: "بازپرداخت شده",
  FAILED: "ناموفق",
};

const TRANSITIONS: Record<OrderState, OrderState[]> = {
  PENDING: ["AWAITING_PAYMENT", "PAID", "CANCELLED", "FAILED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED", "FAILED"],
  PAID: ["PROCESSING", "SHIPPED", "DELIVERED", "REFUNDED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "DELIVERED", "REFUNDED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  FAILED: ["AWAITING_PAYMENT", "CANCELLED"],
};

const FROM_LABEL: Record<string, OrderState> = Object.fromEntries(
  (Object.entries(ORDER_LABEL) as [OrderState, string][]).map(([k, v]) => [v, k]),
);

export function parseOrderState(value: string | undefined | null): OrderState {
  if (!value) return "PENDING";
  if ((ORDER_STATES as readonly string[]).includes(value)) return value as OrderState;
  return FROM_LABEL[value] ?? "PENDING";
}

export function orderLabel(state: OrderState | string): string {
  return ORDER_LABEL[parseOrderState(state)] ?? String(state);
}

export function canTransition(from: string, to: string): boolean {
  const a = parseOrderState(from);
  const b = parseOrderState(to);
  if (a === b) return true;
  return TRANSITIONS[a].includes(b);
}

export function assertTransition(from: string, to: string) {
  if (!canTransition(from, to)) {
    throw new Error(`گذار وضعیت سفارش از «${orderLabel(from)}» به «${orderLabel(to)}» مجاز نیست`);
  }
}

export function isPaidStatus(status: string): boolean {
  const s = parseOrderState(status);
  return s === "PAID" || s === "PROCESSING" || s === "SHIPPED" || s === "DELIVERED";
}
