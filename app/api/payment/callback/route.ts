import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { verifyPayment } from "@/lib/payment";
import { getOrder, getOrders, getPayments, withStoreLock, writeDbAsync } from "@/lib/store";
import { finalizePaidOrder, releaseOrder } from "@/lib/order-payment";
import { isPaidStatus } from "@/lib/order-status";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Zarinpal return URL: ?order=AZ-9050&Authority=...&Status=OK */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order") ?? "";
  const authority = url.searchParams.get("Authority") ?? "";
  const status = url.searchParams.get("Status") ?? "";
  const order = getOrder(orderId);

  if (!order) redirect("/checkout/failed?reason=notfound");

  if (isPaidStatus(order.status)) {
    redirect(`/checkout/success?order=${orderId}`);
  }

  const existingPaid = getPayments().find(
    (p) => p.orderId === orderId && p.status === "paid",
  );
  if (existingPaid) {
    redirect(`/checkout/success?order=${orderId}`);
  }

  if (status !== "OK" || !authority) {
    await releaseOrder(orderId);
    await writeDbAsync({
      orders: getOrders().map((o) => (o.id === orderId ? { ...o, status: "لغو شده" } : o)),
      payments: getPayments().map((p) =>
        p.orderId === orderId && p.status === "pending" ? { ...p, status: "cancelled" } : p,
      ),
    });
    await audit({ action: "order.failed", level: "warn", target: `order:${orderId}`, detail: { reason: "cancelled" } });
    redirect(`/checkout/failed?order=${orderId}&reason=cancelled`);
  }

  if (order.authority && order.authority !== authority) {
    await audit({ action: "order.security", level: "security", target: `order:${orderId}`, detail: { reason: "authority_mismatch" } });
    redirect(`/checkout/failed?order=${orderId}&reason=security`);
  }

  const duplicateTx = getPayments().find((p) => p.gatewayTransactionId && p.authority === authority && p.status === "paid");
  if (duplicateTx) {
    redirect(`/checkout/success?order=${duplicateTx.orderId}`);
  }

  const v = await verifyPayment(order, authority);
  if (v.ok) {
    await withStoreLock(async () => {
      const current = getOrder(orderId);
      if (!current || isPaidStatus(current.status)) return;
      await writeDbAsync({
        orders: getOrders().map((o) =>
          o.id === orderId ? { ...o, status: "پرداخت شده", refId: v.refId, authority } : o,
        ),
        payments: getPayments().map((p) =>
          p.orderId === orderId
            ? {
                ...p,
                status: "paid",
                authority,
                gatewayTransactionId: v.refId,
                verifiedAt: new Date().toISOString(),
              }
            : p,
        ),
      });
    });
    logger.info({ event: "order.paid", orderId, refId: v.refId });
    await audit({ action: "order.paid", target: `order:${orderId}`, detail: { refId: v.refId, amount: order.amount } });
    await finalizePaidOrder(orderId);
    redirect(`/checkout/success?order=${orderId}`);
  }
  await releaseOrder(orderId);
  await writeDbAsync({
    orders: getOrders().map((o) => (o.id === orderId ? { ...o, status: "لغو شده" } : o)),
    payments: getPayments().map((p) =>
      p.orderId === orderId && p.status === "pending" ? { ...p, status: "failed" } : p,
    ),
  });
  await audit({ action: "order.failed", level: "warn", target: `order:${orderId}`, detail: { reason: v.error ?? "verify" } });
  redirect(`/checkout/failed?order=${orderId}&reason=${encodeURIComponent(v.error ?? "verify")}`);
}
