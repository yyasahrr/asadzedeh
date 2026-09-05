import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";

export const metadata: Metadata = { title: "پرداخت ناموفق" };

const reasons: Record<string, string> = {
  cancelled: "پرداخت توسط شما لغو شد.",
  notfound: "سفارشی پیدا نشد.",
};

export default async function FailedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; reason?: string }>;
}) {
  const { order, reason } = await searchParams;
  return (
    <div className="shell py-14">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-3xl bg-card px-8 py-12 text-center shadow-card ring-1 ring-ink-900/5">
        <XCircle className="h-14 w-14 text-madder-700" />
        <h1 className="text-2xl font-black text-navy-900">پرداخت انجام نشد</h1>
        <p className="text-sm leading-7 text-ink-600">
          {reasons[reason ?? ""] ?? reason ?? "خطایی رخ داد."}
          {order && <> (سفارش <span dir="ltr" className="font-bold">{order}</span>)</>}
          {" "}اگر مبلغی از حسابتان کم شده، حداکثر تا ۷۲ ساعت آینده برمی‌گردد.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href="/cart" className="inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white">
            تلاش مجدد
          </Link>
          <Link href="/" className="inline-flex h-11 items-center rounded-xl bg-sand-200 px-6 text-sm font-bold text-ink-800">
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </div>
  );
}
