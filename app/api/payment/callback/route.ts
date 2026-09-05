import { redirect } from "next/navigation";
import { verifyPayment } from "@/lib/payment";
import { getOrder, getOrders, writeDb } from "@/lib/store";

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
    writeDb({ orders: getOrders().map((o) => (o.id === orderId ? { ...o, status: "لغو شده" } : o)) });
    redirect(`/checkout/failed?order=${orderId}&reason=cancelled`);
  }

  const v = await verifyPayment(order, authority);
  if (v.ok) {
    writeDb({
      orders: getOrders().map((o) =>
        o.id === orderId ? { ...o, status: "پرداخت شده", refId: v.refId, authority } : o
      ),
    });
    redirect(`/checkout/success?order=${orderId}`);
  }
  writeDb({ orders: getOrders().map((o) => (o.id === orderId ? { ...o, status: "لغو شده" } : o)) });
  redirect(`/checkout/failed?order=${orderId}&reason=${encodeURIComponent(v.error ?? "verify")}`);
}
