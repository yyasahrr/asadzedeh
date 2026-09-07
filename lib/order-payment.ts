import { revalidatePath } from "next/cache";
import { grantAccessForOrder } from "@/lib/access";
import { settleOrderLines, releaseOrderLines } from "@/lib/db/commerce";
import { sendSms } from "@/lib/notify";
import { isPaidStatus } from "@/lib/order-status";
import { getOrders, syncCollections, writeDb } from "@/lib/store";
import { logger } from "@/lib/logger";

/**
 * Post-payment fulfilment for an order that is already verified PAID.
 *
 * Safe to call more than once: stock/seats are settled exactly once (guarded by
 * `settledAt`) and enrollments are de-duplicated by the database unique index.
 */
export async function finalizePaidOrder(orderId: string) {
  const order = getOrders().find((candidate) => candidate.id === orderId);
  if (!order || !isPaidStatus(order.status)) return false;

  const alreadySettled = Boolean(order.settledAt);
  const alreadyReleased = Boolean(order.releasedAt);

  if (!alreadySettled && !alreadyReleased && order.lines && order.lines.length > 0) {
    await settleOrderLines(order.lines);
    await syncCollections(["products", "classes"]);
    writeDb({
      orders: getOrders().map((candidate) =>
        candidate.id === orderId
          ? { ...candidate, settledAt: new Date().toISOString() }
          : candidate,
      ),
    });
    logger.info({ event: "order.fulfilled", orderId });
  }

  await grantAccessForOrder(orderId);

  if (!alreadySettled && order.phone) {
    const hasCourse = order.lines?.some((line) => line.kind === "course");
    const hasProduct = order.lines?.some(
      (line) => line.kind === "product" || line.kind === "preorder",
    );
    const parts = [`اسدزاده: سفارش ${orderId} ثبت شد.`];
    if (hasCourse) parts.push("دوره‌ها در پنل هنرجو فعال است.");
    if (hasProduct) {
      parts.push(`کالاها با ${order.shipping?.method ?? "روش انتخابی"} ارسال می‌شود.`);
    }
    await sendSms([order.phone], parts.join(" "));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  revalidatePath("/dashboard/orders");
  return true;
}

/** Return reserved stock/seats at most once after a failed or cancelled payment. */
export async function releaseOrder(orderId: string) {
  const order = getOrders().find((candidate) => candidate.id === orderId);
  if (!order?.lines || isPaidStatus(order.status) || order.releasedAt) return false;

  await releaseOrderLines(order.lines);
  await syncCollections(["products", "classes"]);
  writeDb({
    orders: getOrders().map((candidate) =>
      candidate.id === orderId
        ? { ...candidate, releasedAt: new Date().toISOString() }
        : candidate,
    ),
  });
  logger.info({ event: "order.reservation.released", orderId });
  return true;
}
