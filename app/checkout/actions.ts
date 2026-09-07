"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { faToday, normalizeDigits } from "@/lib/format";
import type { CartItem } from "@/lib/cart";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { sendSms } from "@/lib/notify";
import { requestPayment } from "@/lib/payment";
import { finalizePaidOrder, releaseOrder } from "@/lib/order-payment";
import { getClasses, getCourses, getEnrollments, getLearningPath, getLearningPathFinalPrice, getOrders, getProducts, getSettings, getUserByPhone, getUsers, writeDb } from "@/lib/store";
import type { OrderLine, ShippingInfo, User } from "@/lib/types";

function nextOrderId(): string {
  return `AZ-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

/** Compute shipping cost for a set of product lines with a chosen method (server-side truth). */
export async function quoteShipping(methodId: string, subtotal: number): Promise<{ cost: number; label: string } | null> {
  const shop = getSettings().shop;
  const m = shop.shippingMethods.find((x) => x.id === methodId && x.active);
  if (!m) return null;
  const freeOver = m.freeOver || shop.freeShippingOver;
  const cost = freeOver > 0 && subtotal >= freeOver ? 0 : m.cost;
  return { cost, label: m.label };
}

/**
 * Turn the client cart into verified server-side order lines.
 * Prices are re-read from the store so a tampered cart can't set its own price.
 */
function buildLines(items: CartItem[]): { lines: OrderLine[]; problems: string[] } {
  const courses = getCourses();
  const classes = getClasses();
  const products = getProducts();
  const lines: OrderLine[] = [];
  const problems: string[] = [];
  for (const i of items) {
    if (i.kind === "course") {
      const c = courses.find((x) => x.slug === i.slug);
      if (c) lines.push({ kind: "course", slug: c.slug, title: c.title, price: c.price, qty: 1 });
    } else if (i.kind === "class") {
      const k = classes.find((x) => x.slug === i.slug);
      if (!k) continue;
      if (k.remaining <= 0) problems.push(`ظرفیت «${k.title}» تکمیل شده است`);
      else lines.push({ kind: "class", slug: k.slug, title: k.title, price: k.price, qty: 1 });
    } else if (i.kind === "learning_path") {
      const lp = getLearningPath(i.slug);
      if (!lp || !lp.active) {
        problems.push(`مسیر «${i.title}» موجود نیست`);
        continue;
      }
      // Server-side price calculation — client price is ignored
      const serverPrice = getLearningPathFinalPrice(lp);
      lines.push({ kind: "learning_path", slug: lp.slug, title: lp.title, price: serverPrice, qty: 1 });
    } else if (i.kind === "product") {
      const p = products.find((x) => x.slug === i.slug && x.active);
      if (!p) {
        problems.push(`«${i.title}» دیگر موجود نیست`);
        continue;
      }
      const qty = Math.max(1, Math.min(Number(i.qty) || 1, 99));
      if (p.kind === "physical" && !p.allowBackorder && p.stock < qty) {
        problems.push(p.stock > 0 ? `از «${p.title}» فقط ${p.stock} عدد موجود است` : `«${p.title}» ناموجود است`);
        continue;
      }
      lines.push({ kind: p.kind === "preorder" ? "preorder" : "product", slug: p.slug, title: p.title, price: p.price, qty });
    }
  }
  return { lines, problems };
}

export async function startCheckout(fd: FormData) {
  const user = await getSessionUser();
  const name = String(fd.get("name") ?? "").trim() || user?.name || "مهمان";
  const phone = normalizeDigits(String(fd.get("phone") ?? "").trim());
  let items: CartItem[] = [];
  try {
    items = JSON.parse(String(fd.get("items") ?? "[]")) as CartItem[];
  } catch {
    items = [];
  }
  if (items.length === 0) redirect("/cart");

  const { lines, problems } = buildLines(items);
  if (problems.length > 0 || lines.length === 0) {
    redirect(`/checkout?error=${encodeURIComponent(problems[0] ?? "سبد خرید معتبر نیست")}`);
  }

  // ── جلوگیری از خرید تکراری ──
  const checkUserId = user?.id;
  const checkPhone = phone || user?.phone;
  if (checkUserId || checkPhone) {
    const allOrders = getOrders();
    const allEnrollments = getEnrollments();
    for (const l of lines) {
      if (l.kind === "course") {
        const alreadyEnrolled = allEnrollments.some(
          (e) => e.courseSlug === l.slug && (e.userId === checkUserId || (checkPhone && allOrders.find((o) => o.id === e.orderId)?.phone === checkPhone))
        );
        if (alreadyEnrolled) {
          redirect(`/checkout?error=${encodeURIComponent(`شما قبلاً دوره «${l.title}» را خریداری کرده‌اید`)}`);
        }
      }
      if (l.kind === "class") {
        const alreadyBought = allOrders.some(
          (o) => o.status === "پرداخت شده" && (o.userId === checkUserId || (checkPhone && o.phone === checkPhone)) && (o.lines ?? []).some((ol) => ol.kind === "class" && ol.slug === l.slug)
        );
        if (alreadyBought) {
          redirect(`/checkout?error=${encodeURIComponent(`شما قبلاً کلاس «${l.title}» را خریداری کرده‌اید`)}`);
        }
      }
      if (l.kind === "learning_path") {
        const alreadyBought = allOrders.some(
          (o) => o.status === "پرداخت شده" && (o.userId === checkUserId || (checkPhone && o.phone === checkPhone)) && (o.lines ?? []).some((ol) => ol.kind === "learning_path" && ol.slug === l.slug)
        );
        if (alreadyBought) {
          redirect(`/checkout?error=${encodeURIComponent(`شما قبلاً مسیر «${l.title}» را خریداری کرده‌اید`)}`);
        }
      }
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const coupon = String(fd.get("coupon") ?? "").trim().toUpperCase();
  const discount = coupon === "ASAD10" ? Math.round((subtotal * 10) / 100) : 0;

  // Shipping (only when the order contains physical products)
  const needsShipping = lines.some((l) => l.kind === "product");
  let shipping: ShippingInfo | undefined;
  if (needsShipping) {
    const methodId = String(fd.get("shippingMethod") ?? "");
    const quote = await quoteShipping(methodId, subtotal - discount);
    const address = String(fd.get("address") ?? "").trim();
    const city = String(fd.get("city") ?? "").trim();
    const province = String(fd.get("province") ?? "").trim();
    const postalCode = normalizeDigits(String(fd.get("postalCode") ?? "").trim());
    if (!quote) redirect(`/checkout?error=${encodeURIComponent("روش ارسال را انتخاب کنید")}`);
    if (methodId !== "pickup" && (!address || !city)) redirect(`/checkout?error=${encodeURIComponent("آدرس و شهر برای ارسال الزامی است")}`);
    shipping = {
      method: quote.label,
      methodId,
      cost: quote.cost,
      address,
      city,
      province,
      postalCode,
      recipient: String(fd.get("recipient") ?? "").trim() || name,
      phone,
    };
  }

  // Course access is tied to an account. Guests buying a course get (or are matched to)
  // a student account by phone number so the enrolment has somewhere to live.
  let ownerId = user?.id;
  let provisionedPassword: string | undefined;
  if (!user && lines.some((l) => l.kind === "course")) {
    if (!/^09\d{9}$/.test(phone)) redirect(`/checkout?error=${encodeURIComponent("برای خرید دوره آنلاین شماره موبایل معتبر لازم است")}`);
    const existing = getUserByPhone(phone);
    if (existing) {
      ownerId = existing.id;
    } else {
      provisionedPassword = crypto.randomBytes(8).toString("base64url").slice(0, 12);
      const created: User = {
        id: `u-${Date.now().toString(36)}`,
        name,
        phone,
        passwordHash: hashPassword(provisionedPassword),
        role: "student",
        createdAt: faToday(),
      };
      writeDb({ users: [...getUsers(), created] });
      ownerId = created.id;
      await audit({ action: "auth.register", actor: { id: created.id, name: created.name, role: "student" }, detail: { via: "checkout" } });
    }
  }

  const final = Math.max(0, subtotal - discount + (shipping?.cost ?? 0));
  const id = nextOrderId();
  const itemLabel = lines
    .map((l) => `${l.title}${l.qty > 1 ? ` ×${l.qty}` : ""} (${l.kind === "course" ? "آنلاین" : l.kind === "class" ? "حضوری" : l.kind === "preorder" ? "پیش‌سفارش" : "کالا"})`)
    .join(" + ");

  // Reserve capacity / stock now; released again if the payment fails or is cancelled.
  const classes = getClasses().map((c) => {
    const hit = lines.find((l) => l.kind === "class" && l.slug === c.slug);
    return hit && c.remaining > 0 ? { ...c, remaining: c.remaining - 1 } : c;
  });
  const products = getProducts().map((p) => {
    const hit = lines.find((l) => l.kind === "product" && l.slug === p.slug);
    return hit ? { ...p, stock: Math.max(0, p.stock - hit.qty), sold: p.sold + hit.qty } : p;
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
    lines,
    userId: ownerId,
    phone: phone || user?.phone,
    shipping,
    discount: discount || undefined,
    note: String(fd.get("note") ?? "").trim() || undefined,
  });
  writeDb({ orders, classes, products });
  await audit({
    action: "order.create",
    actor: user ? { id: user.id, name: user.name, role: user.role } : null,
    target: `order:${id}`,
    detail: { amount: final, lines: lines.map((l) => `${l.kind}:${l.slug}x${l.qty}`), shipping: shipping?.method, demo },
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/shop");
  revalidatePath("/shop");

  if (provisionedPassword && phone) {
    await sendSms([phone], `اسدزاده: حساب هنرجویی شما ساخته شد. ورود با شماره موبایل و رمز ${provisionedPassword} — لطفاً پس از ورود رمز را تغییر دهید.`);
  }

  if (demo) {
    await finalizePaidOrder(id);
    redirect(`/checkout/success?order=${id}${provisionedPassword ? "&account=new" : ""}`);
  }

  const order = orders[0];
  const base = getSettings().site.siteUrl.replace(/\/$/, "") || "http://localhost:3000";
  const r = await requestPayment(order, `${base}/api/payment/callback`);
  if (!r.ok || !r.payUrl || !r.authority) {
    await releaseOrder(id);
    redirect(`/checkout/failed?order=${id}&reason=${encodeURIComponent(r.error ?? "خطای درگاه")}`);
  }
  writeDb({ orders: getOrders().map((o) => (o.id === id ? { ...o, authority: r.authority } : o)) });
  redirect(r.payUrl);
}

/**
 * بررسی آیا کاربر قبلاً آیتم‌های سبد را خریداری کرده است.
 * آیدی‌های تکراری برمی‌گرداند.
 */
export async function checkAlreadyOwned(items: { kind: string; slug: string }[]): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const allOrders = getOrders();
  const allEnrollments = getEnrollments();
  const owned: string[] = [];
  for (const item of items) {
    if (item.kind === "course") {
      const enrolled = allEnrollments.some((e) => e.courseSlug === item.slug && e.userId === user.id);
      if (enrolled) owned.push(item.slug);
    }
    if (item.kind === "class") {
      const bought = allOrders.some(
        (o) => o.status === "پرداخت شده" && o.userId === user.id && (o.lines ?? []).some((l) => l.kind === "class" && l.slug === item.slug)
      );
      if (bought) owned.push(item.slug);
    }
  }
  return owned;
}
