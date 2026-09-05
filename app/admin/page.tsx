import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  CreditCard,
  FileText,
  Images,
  LayoutTemplate,
  Mail,
  MessageSquareText,
  ReceiptText,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { adminOverview } from "@/lib/data";
import { getOrders, getStudents, getSubscribers } from "@/lib/store";
import { getSessionUser, can, type Permission } from "@/lib/auth";
import { formatPrice, formatPriceCompact, toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

export const metadata: Metadata = { title: "مدیریت" };

const days = ["شنبه", "۱شنبه", "۲شنبه", "۳شنبه", "۴شنبه", "۵شنبه", "جمعه"];

const quickLinks: { href: string; label: string; desc: string; icon: typeof UsersRound; perm?: Permission }[] = [
  { href: "/admin/courses", label: "دوره‌ها", desc: "افزودن و ویرایش", icon: BookOpenCheck, perm: "courses" },
  { href: "/admin/classes", label: "کلاس‌ها", desc: "ظرفیت و ثبت‌نام", icon: CalendarDays, perm: "classes" },
  { href: "/admin/blog", label: "مقالات", desc: "دانشنامه", icon: FileText, perm: "blog" },
  { href: "/admin/media", label: "رسانه", desc: "آپلود تصویر", icon: Images, perm: "media" },
  { href: "/admin/content", label: "محتوا", desc: "هیرو، هدر و فوتر", icon: LayoutTemplate, perm: "content" },
  { href: "/admin/comments", label: "نظرات", desc: "تأیید و پاسخ", icon: MessageSquareText, perm: "comments" },
  { href: "/admin/students", label: "هنرجویان", desc: "مدیریت", icon: UsersRound, perm: "students" },
  { href: "/admin/orders", label: "سفارش‌ها", desc: "وضعیت پرداخت", icon: ReceiptText, perm: "orders" },
  { href: "/admin/certificates", label: "گواهی‌ها", desc: "صدور مدرک", icon: Award, perm: "certificates" },
  { href: "/admin/notify", label: "پیامک و ایمیل", desc: "ارسال همگانی", icon: Mail, perm: "notify" },
  { href: "/admin/payments", label: "پرداخت", desc: "درگاه و تراکنش", icon: CreditCard, perm: "payments" },
];

export default async function AdminPage() {
  const user = await getSessionUser();
  const max = Math.max(...adminOverview.weeklySales);
  const orders = getOrders();
  const revenue = orders.filter((o) => o.status === "پرداخت شده").reduce((s, o) => s + o.amount, 0);
  const pending = orders.filter((o) => o.status === "در انتظار پرداخت").length;

  const kpis = [
    { label: "درآمد کل (ثبت‌شده)", value: formatPriceCompact(revenue) },
    { label: "هنرجویان", value: `${toFa(getStudents().length)} نفر` },
    { label: "سفارش در انتظار پرداخت", value: `${toFa(pending)} سفارش` },
    { label: "عضو خبرنامه", value: `${toFa(getSubscribers().length)} نفر` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">نمای کلی</h1>
        <p className="text-sm text-ink-500">خوش آمدید، {user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
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
              className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
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

      <section className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5" aria-label="فروش هفتگی">
        <h2 className="font-extrabold text-navy-900">فروش ۷ روز اخیر (میلیون تومان)</h2>
        <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label="نمودار فروش هفتگی">
          {adminOverview.weeklySales.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-ink-500">{toFa(v)}</span>
              <div className="flex w-full flex-1 items-end rounded-lg bg-sand-100">
                <div className="w-full rounded-lg bg-navy-800 transition-all" style={{ height: `${Math.round((v / max) * 100)}%` }} />
              </div>
              <span className="text-[11px] text-ink-500">{days[i]}</span>
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
