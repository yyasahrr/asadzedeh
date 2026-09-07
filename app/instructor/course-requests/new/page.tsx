import type { Metadata } from "next";
import Link from "next/link";
import { createCourseRequest } from "../actions";
import { CourseRequestForm } from "@/components/instructor/CourseRequestForm";

export const metadata: Metadata = { title: "درخواست دوره جدید" };

export default function NewCourseRequestPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink-500">پنل مدرس</p>
          <h1 className="mt-1 text-2xl font-black text-navy-900">درخواست دوره جدید</h1>
        </div>
        <Link
          href="/instructor/course-requests"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-900/10 bg-white px-4 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-50"
        >
          بازگشت
        </Link>
      </div>

      <div className="rounded-2xl bg-ochre-50 p-4 text-sm text-ochre-800">
        <strong>توجه:</strong> پس از تکمیل فرم، دوره شما برای بررسی به ادمین ارسال می‌شود. پس از تأیید ادمین، دوره روی سایت منتشر خواهد شد.
      </div>

      <CourseRequestForm action={createCourseRequest} submitLabel="ارسال برای بررسی" />
    </div>
  );
}
