import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { verifyPayment } from "@/lib/payment";
import { getOrder, getOrders, writeDb } from "@/lib/store";
import { finalizePaidOrder, releaseOrder } from "@/app/checkout/actions";

export const dynamic = "force-dynamic";

/** Zarinpal return URL: ?order=AZ-9050&Authority=...&Status=OK */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order") ?? "";
  const authority = url.searchParams.get("Authority") ?? "";
  const status = url.searchParams.get("Status") ?? "";
  const order = getOrder(orderId);

  if (!order) redirect("/checkout/failed?reason=notfound");

  if (status !== "OK" || !authority) {
    await releaseOrder(orderId);
    writeDb({ orders: getOrders().map((o) => (o.id === orderId ? { ...o, status: "لغو شده" } : o)) });
    await audit({ action: "order.failed", level: "warn", target: `order:${orderId}`, detail: { reason: "cancelled" } });
    redirect(`/checkout/failed?order=${orderId}&reason=cancelled`);
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
