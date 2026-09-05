"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { faToday } from "@/lib/format";
import type { CartItem } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth";
import { requestPayment } from "@/lib/payment";
import { getClasses, getOrders, getSettings, writeDb } from "@/lib/store";

function nextOrderId(): string {
  const nums = getOrders().map((o) => Number(o.id.replace(/[^0-9]/g, "")) || 0);
  return `AZ-${Math.max(9041, ...nums) + 1}`;
}

export async function startCheckout(fd: FormData) {
  const user = await getSessionUser();
  const name = String(fd.get("name") ?? "").trim() || user?.name || "مهمان";
  const phone = String(fd.get("phone") ?? "").trim();
  let items: CartItem[] = [];
  try {
    items = JSON.parse(String(fd.get("items") ?? "[]")) as CartItem[];
  } catch {
    items = [];
  }
  if (items.length === 0) redirect("/cart");

  const total = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const coupon = String(fd.get("coupon") ?? "").trim().toUpperCase();
  const discount = coupon === "ASAD10" ? Math.round((total * 10) / 100) : 0;
  const final = total - discount;

  const id = nextOrderId();
  const itemLabel = items.map((i) => `${i.title} (${i.kind === "course" ? "آنلاین" : "حضوری"})`).join(" + ");

  // decrement class capacity
  const classes = getClasses().map((c) => {
    const hit = items.find((i) => i.kind === "class" && i.slug === c.slug);
    if (hit && c.remaining > 0) return { ...c, remaining: c.remaining - 1 };
    return c;
  });

  const { payment } = getSettings();
  const demo = payment.provider === "demo" || !payment.merchantId;
  const orders = getOrders();
  orders.unshift({
    id,
    student: phone ? `${name} (${phone})` : name,
    item: itemLabel,
    amount: final,
    status: demo ? "پرداخت شده" : "در انتظار پرداخت",
    date: faToday(),
  });
  writeDb({ orders, classes });
  revalidatePath("/admin/orders");

  if (demo) {
    redirect(`/checkout/success?order=${id}`);
  }

  const order = orders[0];
  const base = getSettings().site.siteUrl.replace(/\/$/, "") || "http://localhost:3000";
  const r = await requestPayment(order, `${base}/api/payment/callback`);
  if (!r.ok || !r.payUrl || !r.authority) {
    redirect(`/checkout/failed?order=${id}&reason=${encodeURIComponent(r.error ?? "خطای درگاه")}`);
  }
  writeDb({ orders: getOrders().map((o) => (o.id === id ? { ...o, authority: r.authority } : o)) });
  redirect(r.payUrl);
}
