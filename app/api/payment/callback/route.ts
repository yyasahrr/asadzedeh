import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { verifyPayment } from "@/lib/payment";
import { getOrder, getOrders, writeDb } from "@/lib/store";
import { finalizePaidOrder, releaseOrder } from "@/lib/order-payment";

export const dynamic = "force-dynamic";

/** Zarinpal return URL: ?order=AZ-9050&Authority=...&Status=OK */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order") ?? "";
  const authority = url.searchParams.get("Authority") ?? "";
  const status = url.searchParams.get("Status") ?? "";
  const order = getOrder(orderId);

  if (!order) redirect("/checkout/failed?reason=notfound");

  // Idempotency: if order is already paid, just redirect to success
  if (order.status === "پرداخت شده") {
    redirect(`/checkout/success?order=${orderId}`);
  }

  if (status !== "OK" || !authority) {
    await releaseOrder(orderId);
    writeDb({ orders: getOrders().map((o) => (o.id === orderId ? { ...o, status: "لغو شده" } : o)) });
    await audit({ action: "order.failed", level: "warn", target: `order:${orderId}`, detail: { reason: "cancelled" } });
    redirect(`/checkout/failed?order=${orderId}&reason=cancelled`);
  }

  // Authority binding: verify the callback authority matches the order's stored authority
  if (order.authority && order.authority !== authority) {
    await audit({ action: "order.security", level: "security", target: `order:${orderId}`, detail: { reason: "authority_mismatch", expected: order.authority, got: authority } });
    redirect(`/checkout/failed?order=${orderId}&reason=security`);
  }

  const v = await verifyPayment(order, authority);
  if (v.ok) {
    writeDb({
      orders: getOrders().map((o) =>
        o.id === orderId ? { ...o, status: "پرداخت شده", refId: v.refId, authority } : o
      ),
    });
    await audit({ action: "order.paid", target: `order:${orderId}`, detail: { refId: v.refId, amount: order.amount } });
    await finalizePaidOrder(orderId);
    redirect(`/checkout/success?order=${orderId}`);
  }
  await releaseOrder(orderId);
  writeDb({ orders: getOrders().map((o) => (o.id === orderId ? { ...o, status: "لغو شده" } : o)) });
  await audit({ action: "order.failed", level: "warn", target: `order:${orderId}`, detail: { reason: v.error ?? "verify" } });
  redirect(`/checkout/failed?order=${orderId}&reason=${encodeURIComponent(v.error ?? "verify")}`);
}
