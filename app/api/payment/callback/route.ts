import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { verifyPayment } from "@/lib/payment";
import { markOrderPaid, markPaymentPaid } from "@/lib/db/commerce";
import { getOrder, getOrders, getPayments, syncCollections, writeDbAsync } from "@/lib/store";
import { finalizePaidOrder, releaseOrder } from "@/lib/order-payment";
import { isPaidStatus } from "@/lib/order-status";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Zarinpal return URL: `?order=AZ-9050&Authority=...&Status=OK`.
 *
 * `Status` is never trusted — it only decides whether we bother asking the
 * gateway. A payment becomes PAID only after `verifyPayment` (server-to-server)
 * succeeds, and the transition itself is a conditional UPDATE, so a replayed or
 * duplicated callback cannot fulfil the order twice.
 */
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

  const existingPaid = getPayments().find((p) => p.orderId === orderId && p.status === "paid");
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
    await audit({
      action: "order.failed",
      level: "warn",
      target: `order:${orderId}`,
      detail: { reason: "cancelled" },
    });
    redirect(`/checkout/failed?order=${orderId}&reason=cancelled`);
  }

  if (order.authority && order.authority !== authority) {
    await audit({
      action: "order.security",
      level: "security",
      target: `order:${orderId}`,
      detail: { reason: "authority_mismatch" },
    });
    redirect(`/checkout/failed?order=${orderId}&reason=security`);
  }

  const duplicateTx = getPayments().find(
    (p) => p.gatewayTransactionId && p.authority === authority && p.status === "paid",
  );
  if (duplicateTx) {
    redirect(`/checkout/success?order=${duplicateTx.orderId}`);
  }

  const v = await verifyPayment(order, authority);
  if (v.ok) {
    const payment =
      getPayments().find((p) => p.orderId === orderId && p.status !== "paid") ??
      getPayments().find((p) => p.orderId === orderId);

    // Both transitions are conditional: `WHERE status <> 'paid'`.
    const paymentFlipped = payment ? await markPaymentPaid(payment.id, v.refId, authority) : false;
    const orderFlipped = await markOrderPaid(orderId, v.refId);

    if (!paymentFlipped && !orderFlipped) {
      // A callback that arrives twice, or a gateway transaction id we already
      // recorded. Nothing to do — never re-enrol, never re-decrement stock.
      logger.warn({ event: "payment.replay.ignored", orderId, authority });
      await audit({
        action: "order.security",
        level: "warn",
        target: `order:${orderId}`,
        detail: { reason: "duplicate_callback" },
      });
      redirect(`/checkout/success?order=${orderId}`);
    }

    await syncCollections(["orders", "payments"]);
    logger.info({ event: "payment.verified", orderId, paymentId: payment?.id, refId: v.refId });
    await audit({
      action: "order.paid",
      target: `order:${orderId}`,
      detail: { refId: v.refId, amount: order.amount },
    });
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
  await audit({
    action: "order.failed",
    level: "warn",
    target: `order:${orderId}`,
    detail: { reason: v.error ?? "verify" },
  });
  redirect(`/checkout/failed?order=${orderId}&reason=${encodeURIComponent(v.error ?? "verify")}`);
}
