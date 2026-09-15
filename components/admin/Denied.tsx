import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function Denied() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-16 text-center shadow-card ring-1 ring-ink-900/5">
      <ShieldAlert className="h-11 w-11 text-madder-700" />
      <h1 className="text-xl font-black text-navy-900">دسترسی ندارید</h1>
      <p className="max-w-sm text-sm leading-7 text-ink-600">
        نقش کاربری شما اجازه مشاهده این بخش را نمی‌دهد. اگر فکر می‌کنید اشتباهی شده، با مدیر کل در میان بگذارید.
      </p>
      <Link href="/admin" className="mt-2 inline-flex h-10 items-center rounded-xl bg-navy-800 px-6 text-sm font-bold text-white">
        بازگشت به نمای کلی
      </Link>
    </div>
  );
}
