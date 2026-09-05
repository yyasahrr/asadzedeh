import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { TableShell, Td } from "@/components/admin/TableShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getSessionUser } from "@/lib/auth";
import { formatPrice, toFa } from "@/lib/format";
import { getCourses, getInstructorByUser, getOrders } from "@/lib/store";

export const metadata: Metadata = { title: "درآمد" };
export const dynamic = "force-dynamic";

export default async function InstructorEarningsPage() {
  const user = (await getSessionUser())!;
  const inst = getInstructorByUser(user.id)!;
  const courses = getCourses().filter((c) => c.instructorSlug === inst.slug);
  const slugs = new Map(courses.map((c) => [c.slug, c]));
  const share = (inst.commissionPercent ?? 60) / 100;

  const rows = getOrders()
    .filter((o) => o.status === "پرداخت شده" && o.lines?.some((l) => l.kind === "course" && slugs.has(l.slug)))
    .map((o) => {
      const mine = o.lines!.filter((l) => l.kind === "course" && slugs.has(l.slug));
      const gross = mine.reduce((s, l) => s + l.price * l.qty, 0);
      return { id: o.id, date: o.date ?? "", student: o.student, items: mine.map((l) => l.title).join("، "), gross, net: Math.round(gross * share), status: o.status };
    });
  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const totalNet = rows.reduce((s, r) => s + r.net, 0);
  const perCourse = courses.map((c) => ({
    title: c.shortTitle,
    count: rows.filter((r) => r.items.includes(c.title) || r.items.includes(c.shortTitle)).length,
    gross: getOrders().filter((o) => o.status === "پرداخت شده").reduce((s, o) => s + (o.lines ?? []).filter((l) => l.slug === c.slug).reduce((x, l) => x + l.price * l.qty, 0), 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-900">درآمد من</h1>
        <p className="mt-1 text-sm text-ink-600">سهم شما {toFa(inst.commissionPercent ?? 60)}٪ از فروش هر دوره است. تسویه به‌صورت ماهانه توسط مدیریت انجام می‌شود.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <p className="text-xs font-bold text-ink-500">فروش ناخالص دوره‌ها</p>
          <p className="mt-2 text-xl font-black text-navy-900">{formatPrice(totalGross)}</p>
        </div>
        <div className="rounded-2xl bg-teal-900 p-5 text-white shadow-lift">
          <p className="flex items-center gap-1.5 text-xs font-bold text-teal-100"><Wallet className="h-4 w-4" /> سهم شما</p>
          <p className="mt-2 text-xl font-black">{formatPrice(totalNet)}</p>
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-ink-900/5">
          <p className="text-xs font-bold text-ink-500">تعداد فروش</p>
          <p className="mt-2 text-xl font-black text-navy-900">{toFa(rows.length)}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-black text-navy-900">به تفکیک دوره</h2>
        <TableShell head={["دوره", "تعداد فروش", "فروش ناخالص", "سهم شما"]}>
          {perCourse.map((p) => (
            <tr key={p.title}>
              <Td className="text-sm font-bold text-ink-900">{p.title}</Td>
              <Td className="text-sm text-ink-700">{toFa(p.count)}</Td>
              <Td className="text-sm text-ink-700">{formatPrice(p.gross)}</Td>
              <Td className="text-sm font-bold text-teal-800">{formatPrice(Math.round(p.gross * share))}</Td>
            </tr>
          ))}
        </TableShell>
      </section>

      <section>
        <h2 className="mb-3 font-black text-navy-900">ریز فروش‌ها</h2>
        <TableShell head={["سفارش", "تاریخ", "هنرجو", "اقلام", "مبلغ", "سهم شما", "وضعیت"]}>
          {rows.length === 0 && (
            <tr><Td colSpan={7} className="text-center text-sm text-ink-500">هنوز فروشی برای دوره‌های شما ثبت نشده است.</Td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="text-xs font-bold text-ink-700" dir="ltr">{r.id}</Td>
              <Td className="text-xs text-ink-500 whitespace-nowrap">{r.date}</Td>
              <Td className="text-sm text-ink-800">{r.student}</Td>
              <Td className="text-xs text-ink-600">{r.items}</Td>
              <Td className="text-sm text-ink-700 whitespace-nowrap">{formatPrice(r.gross)}</Td>
              <Td className="text-sm font-bold text-teal-800 whitespace-nowrap">{formatPrice(r.net)}</Td>
              <Td><StatusBadge status={r.status} /></Td>
            </tr>
          ))}
        </TableShell>
      </section>
    </div>
  );
}
