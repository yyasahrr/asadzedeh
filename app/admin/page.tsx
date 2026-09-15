import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  CreditCard,
  FileText,
  Film,
  GraduationCap,
  Hammer,
  Images,
  LayoutTemplate,
  Mail,
  MessageSquareText,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Store,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { getAudit, getEnrollments, getOrders, getPreorders, getProducts, getStudents, getSubscribers, getUsers, getVideos } from "@/lib/store";
import { getSessionUser, can, type Permission } from "@/lib/auth";
import type { AuditEntry, Order } from "@/lib/types";
import { formatPrice, formatPriceCompact, toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "مدیریت" };

const quickLinks: { href: string; label: string; desc: string; icon: typeof UsersRound; perm?: Permission }[] = [
  { href: "/admin/courses", label: "دوره‌ها", desc: "افزودن و ویرایش", icon: BookOpenCheck, perm: "courses" },
  { href: "/admin/classes", label: "کلاس‌ها", desc: "ظرفیت و ثبت‌نام", icon: CalendarDays, perm: "classes" },
  { href: "/admin/blog", label: "مقالات", desc: "دانشنامه", icon: FileText, perm: "blog" },
  { href: "/admin/media", label: "رسانه", desc: "آپلود تصویر", icon: Images, perm: "media" },
  { href: "/admin/content", label: "محتوا", desc: "هیرو، هدر و فوتر", icon: LayoutTemplate, perm: "content" },
  { href: "/admin/comments", label: "نظرات", desc: "تأیید و پاسخ", icon: MessageSquareText, perm: "comments" },
  { href: "/admin/students", label: "هنرجویان", desc: "مدیریت", icon: UsersRound, perm: "students" },
  { href: "/admin/orders", label: "سفارش‌ها", desc: "پرداخت و ارسال", icon: ReceiptText, perm: "orders" },
  { href: "/admin/shop", label: "فروشگاه", desc: "محصول، قیمت، موجودی", icon: Store, perm: "shop" },
  { href: "/admin/preorders", label: "پیش‌سفارش‌ها", desc: "ساخت دار و سفارشی", icon: Hammer, perm: "preorders" },
  { href: "/admin/videos", label: "ویدیوها", desc: "آپلود و حفاظت", icon: Film, perm: "videos" },
  { href: "/admin/instructors", label: "مدرسان", desc: "پروفایل و پنل استاد", icon: GraduationCap, perm: "instructors" },
  { href: "/admin/audit", label: "لاگ سیستم", desc: "رخدادها و امنیت", icon: ScrollText, perm: "audit" },
  { href: "/admin/security", label: "امنیت", desc: "۲FA و نشست‌ها", icon: ShieldCheck, perm: "security" },
  { href: "/admin/certificates", label: "گواهی‌ها", desc: "صدور مدرک", icon: Award, perm: "certificates" },
  { href: "/admin/notify", label: "پیامک و ایمیل", desc: "ارسال همگانی", icon: Mail, perm: "notify" },
  { href: "/admin/payments", label: "پرداخت", desc: "درگاه و تراکنش", icon: CreditCard, perm: "payments" },
];

function countRecent(entries: AuditEntry[], ms: number, pred: (e: AuditEntry) => boolean) {
  const threshold = Date.now() - ms;
  return entries.filter((e) => pred(e) && Date.parse(e.ts) > threshold).length;
}

/** Last 7 days of paid revenue keyed by ISO day (order.create audit rows carry the timestamp). */
function buildWeeklySales(audit: AuditEntry[], paid: Order[]) {
  const series = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("fa-IR", { weekday: "short" }), value: 0 };
  });
  for (const e of audit) {
    if (e.action !== "order.create") continue;
    const day = series.find((d) => d.key === e.ts.slice(0, 10));
    if (!day) continue;
    const orderId = e.target?.replace(/^order:/, "");
    const order = orderId ? paid.find((o) => o.id === orderId) : undefined;
    if (order) day.value += order.amount;
  }
  return series;
}

export default async function AdminPage() {
  const user = await getSessionUser();
  const orders = getOrders();
  const paid = orders.filter((o) => o.status === "پرداخت شده" || o.status === "ارسال شده" || o.status === "تحویل شده");
  const revenue = paid.reduce((s, o) => s + o.amount, 0);
  const pending = orders.filter((o) => o.status === "در انتظار پرداخت").length;
  const toShip = orders.filter((o) => o.status === "پرداخت شده" && o.shipping && o.shipping.methodId !== "pickup" && !o.shipping.method.includes("حضوری")).length;
  const openPreorders = getPreorders().filter((p) => !["تحویل شده", "لغو شده"].includes(p.status)).length;
  const lowStock = getProducts().filter((p) => p.kind === "physical" && p.active && p.stock <= 2).length;
  const students = new Set([...getStudents().map((s) => s.phone), ...getUsers().filter((u) => u.role === "student").map((u) => u.phone)]).size;
  const enrollments = getEnrollments().length;
  const readyVideos = getVideos().filter((v) => v.status === "ready").length;
  const audit = getAudit();
  const securityToday = countRecent(audit, 864e5, (e) => e.level === "security");
  const daySeries = buildWeeklySales(audit, paid);
  const max = Math.max(1, ...daySeries.map((d) => d.value));

  const kpis = [
    { label: "درآمد کل (پرداخت‌شده)", value: formatPriceCompact(revenue) },
    { label: "هنرجویان / ثبت‌نام دوره", value: `${toFa(students)} نفر / ${toFa(enrollments)}` },
    { label: "در انتظار پرداخت / آماده ارسال", value: `${toFa(pending)} / ${toFa(toShip)} سفارش` },
    { label: "پیش‌سفارش باز / کالای کم‌موجودی", value: `${toFa(openPreorders)} / ${toFa(lowStock)}` },
    { label: "ویدیوهای آماده پخش", value: `${toFa(readyVideos)} ویدیو` },
    { label: "رخداد امنیتی ۲۴ ساعت اخیر", value: `${toFa(securityToday)} مورد` },
    { label: "عضو خبرنامه", value: `${toFa(getSubscribers().length)} نفر` },
    { label: "کل سفارش‌ها", value: `${toFa(orders.length)} سفارش` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">نمای کلی</h1>
        <p className="text-sm text-ink-500">خوش آمدید، {user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bento-surface p-5">
            <p className="text-[13px] font-bold text-ink-500">{k.label}</p>
            <p className="mt-1.5 flex items-center gap-2 text-2xl font-black text-navy-900">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks
          .filter((l) => !l.perm || can(user, l.perm))
          .map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="bento-surface flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-teal-600/20 hover:shadow-lift"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-white">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <strong className="block text-sm text-navy-900">{label}</strong>
                <span className="text-xs text-ink-500">{desc}</span>
              </span>
            </Link>
          ))}
      </div>

      <section className="bento-surface p-6" aria-label="فروش هفتگی">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-extrabold text-navy-900">فروش ۷ روز اخیر (پرداخت‌شده)</h2>
          <span className="text-xs text-ink-500">جمع: {formatPriceCompact(daySeries.reduce((s, d) => s + d.value, 0))}</span>
        </div>
        <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label="نمودار فروش هفتگی">
          {daySeries.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-ink-500">{d.value ? formatPriceCompact(d.value) : "—"}</span>
              <div className="flex w-full flex-1 items-end rounded-lg bg-sand-100">
                <div className="w-full rounded-lg bg-navy-800 transition-all" style={{ height: `${Math.max(d.value ? 4 : 0, Math.round((d.value / max) * 100))}%` }} />
              </div>
              <span className="text-[11px] text-ink-500">{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="سفارش‌های اخیر">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold text-navy-900">سفارش‌های اخیر</h2>
          <Link href="/admin/orders" className="text-[13px] font-bold text-teal-600 hover:text-teal-700">همه سفارش‌ها ←</Link>
        </div>
        <TableShell head={["شماره", "هنرجو", "دوره", "مبلغ", "وضعیت"]}>
          {orders.slice(0, 5).map((o) => (
            <tr key={o.id} className="transition-colors hover:bg-sand-50">
              <Td className="font-bold text-navy-800"><span dir="ltr">{o.id}</span></Td>
              <Td className="font-semibold">{o.student}</Td>
              <Td className="max-w-64 truncate text-ink-600">{o.item}</Td>
              <Td className="font-bold whitespace-nowrap">{formatPrice(o.amount)}</Td>
              <Td><StatusBadge status={o.status} /></Td>
            </tr>
          ))}
        </TableShell>
      </section>
    </div>
  );
}
