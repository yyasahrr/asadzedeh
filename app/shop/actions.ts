"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth";
import { faToday, normalizeDigits } from "@/lib/format";
import { sendSms } from "@/lib/notify";
import { getPreorders, getProduct, getSettings, getUsers, writeDb } from "@/lib/store";
import type { Preorder } from "@/lib/types";

function nextPreorderId(): string {
  const nums = getPreorders().map((p) => Number(p.id.replace(/[^0-9]/g, "")) || 0);
  return `PO-${Math.max(1200, ...nums) + 1}`;
}

/** Public: a customer requests a made-to-order item (e.g. custom loom). */
export async function submitPreorder(fd: FormData) {
  const user = await getSessionUser();
  const slug = String(fd.get("slug") ?? "");
  const product = getProduct(slug);
  if (!product || product.kind !== "preorder" || !product.active) redirect("/shop");
  if (!getSettings().shop.enabled) redirect(`/shop/${slug}?error=disabled`);

  const customer = String(fd.get("name") ?? "").trim() || user?.name || "";
  const phone = normalizeDigits(String(fd.get("phone") ?? "").trim()) || user?.phone || "";
  if (!customer || !/^09\d{9}$/.test(phone)) redirect(`/shop/${slug}?error=validation#preorder`);

  // Collect spec fields (spec_<label>) into a record.
  const specs: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("spec_") && typeof v === "string" && v.trim()) specs[k.slice(5)] = v.trim();
  }

  const depositPercent = product.preorder?.depositPercent ?? getSettings().shop.preorderDepositPercent;
  const quotedPrice = product.price;
  const id = nextPreorderId();
  const preorder: Preorder = {
    id,
    productSlug: product.slug,
    productTitle: product.title,
    customer,
    phone,
    userId: user?.id ?? getUsers().find((u) => u.phone === phone)?.id,
    specs,
    note: String(fd.get("note") ?? "").trim() || undefined,
    quotedPrice,
    deposit: Math.round((quotedPrice * depositPercent) / 100),
    depositPaid: false,
    status: "ثبت شده",
    createdAt: faToday(),
    eta: product.preorder ? `حدود ${product.preorder.leadTimeDays} روز کاری پس از تأیید` : undefined,
    timeline: [{ date: faToday(), status: "ثبت شده", note: "درخواست توسط مشتری ثبت شد" }],
  };
  writeDb({ preorders: [preorder, ...getPreorders()] });
  await audit({
    action: "preorder.create",
    actor: user ? { id: user.id, name: user.name, role: user.role } : null,
    target: `preorder:${id}`,
    detail: { product: product.slug, specs, phone: phone.replace(/^(\d{4})\d{3}(\d{4})$/, "$1***$2") },
  });
  await sendSms([phone], `اسدزاده: پیش‌سفارش ${id} برای «${product.title}» ثبت شد. کارشناس ما برای تأیید مشخصات و اعلام قیمت قطعی تماس می‌گیرد.`);
  revalidatePath("/admin/preorders");
  revalidatePath("/dashboard/orders");
  redirect(`/shop/preorder?id=${id}`);
}
