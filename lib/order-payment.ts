import { revalidatePath } from "next/cache";
import { grantAccessForOrder } from "@/lib/access";
import { sendSms } from "@/lib/notify";
import { getClasses, getOrders, getProducts, writeDb } from "@/lib/store";

/** Apply post-payment side effects only to an order already verified as paid. */
export async function finalizePaidOrder(orderId: string) {
  const order = getOrders().find((candidate) => candidate.id === orderId);
  if (!order || order.status !== "پرداخت شده") return false;

  await grantAccessForOrder(orderId);
  if (order.phone) {
    const hasCourse = order.lines?.some((line) => line.kind === "course");
    const hasProduct = order.lines?.some(
      (line) => line.kind === "product" || line.kind === "preorder"
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
  if (!order?.lines || order.status === "پرداخت شده" || order.releasedAt) return false;

  const releasedAt = new Date().toISOString();
  writeDb({
    orders: getOrders().map((candidate) =>
      candidate.id === orderId ? { ...candidate, releasedAt } : candidate
    ),
    classes: getClasses().map((courseClass) =>
      order.lines!.some(
        (line) => line.kind === "class" && line.slug === courseClass.slug
      )
        ? { ...courseClass, remaining: courseClass.remaining + 1 }
        : courseClass
    ),
    products: getProducts().map((product) => {
      const line = order.lines!.find(
        (candidate) => candidate.kind === "product" && candidate.slug === product.slug
      );
      return line
        ? {
            ...product,
            stock: product.stock + line.qty,
            sold: Math.max(0, product.sold - line.qty),
          }
        : product;
    }),
  });
  return true;
}
