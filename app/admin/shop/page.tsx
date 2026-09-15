import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Boxes, ExternalLink, Hammer, Pencil, Plus, Settings, ShoppingBag, TriangleAlert } from "lucide-react";
import { adjustStock, deleteProduct } from "../actions";
import { Denied } from "@/components/admin/Denied";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { TableShell, Td } from "@/components/admin/TableShell";
import { can, getSessionUser } from "@/lib/auth";
import { formatPrice, toFa } from "@/lib/format";
import { getOrders, getPreorders, getProducts, getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "فروشگاه" };
export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const user = await getSessionUser();
  if (!user || !can(user, "shop")) return <Denied />;
  const products = getProducts();
  const shop = getSettings().shop;
  const lowStock = products.filter((p) => p.kind === "physical" && p.active && p.stock <= 2);
  const openPreorders = getPreorders().filter((p) => !["تحویل شده", "لغو شده"].includes(p.status)).length;
  const productRevenue = getOrders()
    .filter((o) => o.status === "پرداخت شده")
    .reduce((s, o) => s + (o.lines ?? []).filter((l) => l.kind === "product" || l.kind === "preorder").reduce((x, l) => x + l.price * l.qty, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy-900">فروشگاه لوازم</h1>
          <p className="mt-1 text-sm text-ink-600">{toFa(products.length)} محصول • فروش کالا: {formatPrice(productRevenue)} • {shop.enabled ? "فروشگاه فعال است" : "فروشگاه غیرفعال است"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/shop" target="_blank" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300"><ExternalLink className="h-4 w-4" /> مشاهده فروشگاه</Link>
          <Link href="/admin/shop/settings" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-700 hover:bg-sand-300"><Settings className="h-4 w-4" /> تنظیمات و ارسال</Link>
          <Link href="/admin/shop/new" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-navy-800 px-4 text-sm font-bold text-white hover:bg-navy-700"><Plus className="h-4 w-4" /> محصول جدید</Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
          <ShoppingBag className="h-5 w-5 text-teal-700" />
          <div className="text-sm"><p className="font-bold text-ink-900">{toFa(products.filter((p) => p.active).length)} محصول فعال</p><p className="text-xs text-ink-500">{toFa(products.filter((p) => p.kind === "preorder").length)} مورد ساخت سفارشی</p></div>
        </div>
        <Link href="/admin/preorders" className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5 hover:shadow-lift">
          <Hammer className="h-5 w-5 text-ochre-600" />
          <div className="text-sm"><p className="font-bold text-ink-900">{toFa(openPreorders)} پیش‌سفارش باز</p><p className="text-xs text-ink-500">مدیریت پیش‌سفارش‌ها ←</p></div>
        </Link>
        <div className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${lowStock.length ? "bg-ochre-50 ring-ochre-200" : "bg-card shadow-card ring-ink-900/5"}`}>
          {lowStock.length ? <TriangleAlert className="h-5 w-5 text-ochre-700" /> : <Boxes className="h-5 w-5 text-teal-700" />}
          <div className="text-sm"><p className="font-bold text-ink-900">{lowStock.length ? `${toFa(lowStock.length)} کالا رو به اتمام` : "موجودی‌ها مناسب است"}</p><p className="text-xs text-ink-500">{lowStock.map((p) => p.title).join("، ") || "هشدار در ۲ عدد و کمتر"}</p></div>
        </div>
      </div>

      <TableShell head={["محصول", "نوع", "قیمت", "موجودی", "فروش", "ارسال", "وضعیت", "عملیات"]}>
        {products.length === 0 && (
          <tr><Td colSpan={8} className="text-center text-sm text-ink-500">هنوز محصولی ثبت نشده است.</Td></tr>
        )}
        {products.map((p) => (
          <tr key={p.slug} className={p.active ? "" : "opacity-60"}>
            <Td>
              <div className="flex items-center gap-3">
                <Image src={p.image} alt={p.title} width={48} height={48} className="h-12 w-12 rounded-xl object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900">{p.title}</p>
                  <p className="text-xs text-ink-500">{p.category}{p.sku ? <span dir="ltr"> • {p.sku}</span> : ""}</p>
                </div>
              </div>
            </Td>
            <Td>
              {p.kind === "preorder" ? <span className="rounded-md bg-ochre-100 px-2 py-0.5 text-[11px] font-bold text-ochre-800">پیش‌سفارش</span> : <span className="rounded-md bg-sand-200 px-2 py-0.5 text-[11px] font-bold text-ink-700">کالا</span>}
            </Td>
            <Td className="text-sm text-ink-800 whitespace-nowrap">
              {formatPrice(p.price)}
              {p.oldPrice ? <><br /><span className="text-xs text-ink-400 line-through">{formatPrice(p.oldPrice)}</span></> : null}
            </Td>
            <Td>
              {p.kind === "preorder" ? (
                <span className="text-xs text-ink-500">—</span>
              ) : (
                <div className="flex items-center gap-1" dir="ltr">
                  <form action={adjustStock}><input type="hidden" name="slug" value={p.slug} /><input type="hidden" name="delta" value="-1" /><button type="submit" className="h-7 w-7 cursor-pointer rounded-md bg-sand-100 text-sm font-black hover:bg-sand-200">−</button></form>
                  <span className={`w-8 text-center text-sm font-black ${p.stock <= 2 ? "text-ochre-700" : "text-ink-900"}`}>{toFa(p.stock)}</span>
                  <form action={adjustStock}><input type="hidden" name="slug" value={p.slug} /><input type="hidden" name="delta" value="1" /><button type="submit" className="h-7 w-7 cursor-pointer rounded-md bg-sand-100 text-sm font-black hover:bg-sand-200">+</button></form>
                </div>
              )}
            </Td>
            <Td className="text-sm text-ink-700">{toFa(p.sold)}</Td>
            <Td className="text-xs text-ink-600">{p.shippingMethods.length ? p.shippingMethods.map((id) => shop.shippingMethods.find((m) => m.id === id)?.label ?? id).join("، ") : "—"}</Td>
            <Td>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${p.active ? "bg-teal-100 text-teal-800" : "bg-sand-200 text-ink-600"}`}>{p.active ? "فعال" : "غیرفعال"}</span>
              {p.featured && <span className="ms-1 rounded-md bg-ochre-100 px-2 py-0.5 text-[11px] font-bold text-ochre-800">ویژه</span>}
            </Td>
            <Td>
              <div className="flex items-center gap-1">
                <Link href={`/shop/${p.slug}`} target="_blank" title="مشاهده" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-teal-700 hover:bg-teal-50"><ExternalLink className="h-4 w-4" /></Link>
                <Link href={`/admin/shop/${p.slug}/edit`} title="ویرایش" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-700 hover:bg-sand-100"><Pencil className="h-4 w-4" /></Link>
                <DeleteButton action={deleteProduct} hidden={{ name: "slug", value: p.slug }} label={p.title} />
              </div>
            </Td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}
