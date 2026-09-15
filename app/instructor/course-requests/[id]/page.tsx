import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Send } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getCourseRequest, getInstructorByUser } from "@/lib/store";
import { toFa } from "@/lib/format";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { submitCourseRequest, deleteCourseRequest, updateCourseRequest } from "../actions";
import { CourseRequestForm } from "@/components/instructor/CourseRequestForm";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "مدیریت درخواست دوره" };
export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  "پیش‌نویس": "bg-sand-100 text-ink-600",
  "در انتظار بررسی": "bg-ochre-100 text-ochre-800",
  "تأیید شده": "bg-teal-100 text-teal-800",
  "رد شده": "bg-madder-50 text-madder-700",
};

export default async function CourseRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const inst = getInstructorByUser(user.id);
  if (!inst) return null;

  const { id } = await params;
  const request = getCourseRequest(id);

  if (!request || request.instructorUserId !== user.id) {
    notFound();
  }

  const isEditable = request.status === "پیش‌نویس" || request.status === "رد شده";
  const isPending = request.status === "در انتظار بررسی";
  const isApproved = request.status === "تأیید شده";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink-500">پنل مدرس</p>
          <h1 className="mt-1 text-2xl font-black text-navy-900">{request.shortTitle}</h1>
          <p className="mt-1 flex items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", statusColors[request.status] ?? "")}>
              {request.status}
            </span>
            <span className="text-sm text-ink-500">
              {new Date(request.createdAt).toLocaleDateString("fa-IR")}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/instructor/course-requests"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-900/10 bg-white px-4 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-50"
          >
            بازگشت
          </Link>
          {isEditable && (
            <form action={submitCourseRequest}>
              <input type="hidden" name="id" value={request.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-800"
              >
                <Send className="h-4 w-4" />
                ارسال برای بررسی
              </button>
            </form>
          )}
          {isPending && (
            <div className="rounded-xl bg-ochre-50 px-4 py-2 text-sm text-ochre-800">
              در انتظار بررسی ادمین...
            </div>
          )}
          {isApproved && (
            <div className="rounded-xl bg-teal-50 px-4 py-2 text-sm text-teal-800">
              دوره تأیید و منتشر شد!
            </div>
          )}
          {!isApproved && (
            <form action={deleteCourseRequest}>
              <input type="hidden" name="id" value={request.id} />
              <DeleteButton
                action={deleteCourseRequest}
                hidden={{ name: "id", value: request.id }}
                label={request.shortTitle}
              />
            </form>
          )}
        </div>
      </div>

      {request.status === "رد شده" && request.rejectionReason && (
        <div className="rounded-2xl bg-madder-50 p-4">
          <p className="font-bold text-madder-800">دلیل رد درخواست:</p>
          <p className="mt-1 text-sm text-madder-700">{request.rejectionReason}</p>
          <p className="mt-2 text-xs text-madder-600">
            می‌توانید فرم را ویرایش کرده و مجدداً ارسال کنید.
          </p>
        </div>
      )}

      {isEditable && (
        <div className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="mb-4 text-lg font-bold text-navy-900">ویرایش اطلاعات دوره</h2>
          <CourseRequestForm
            action={updateCourseRequest}
            submitLabel="ذخیره تغییرات"
            initialValues={{
              title: request.title,
              shortTitle: request.shortTitle,
              category: request.category,
              level: request.level,
              sessions: request.sessions,
              hours: request.hours,
              price: request.price,
              oldPrice: request.oldPrice,
              image: request.image,
              excerpt: request.excerpt,
              outcomes: request.outcomes,
              syllabus: request.syllabus,
              badge: request.badge,
            }}
          />
        </div>
      )}

      {!isEditable && (
        <div className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="mb-4 text-lg font-bold text-navy-900">اطلاعات دوره</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold text-ink-500">عنوان</dt>
              <dd className="mt-1 font-bold text-navy-900">{request.title}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-ink-500">دسته</dt>
              <dd className="mt-1 text-navy-900">{request.category}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-ink-500">سطح</dt>
              <dd className="mt-1 text-navy-900">{request.level}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-ink-500">قیمت</dt>
              <dd className="mt-1 font-bold text-navy-900">
                {request.price > 0 ? `${toFa(request.price)} تومان` : "رایگان"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold text-ink-500">معرفی</dt>
              <dd className="mt-1 text-navy-900">{request.excerpt}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold text-ink-500">دستاوردها</dt>
              <dd className="mt-1">
                <ul className="list-disc list-inside text-navy-900">
                  {request.outcomes.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </div>
      )}

      {request.syllabus.length > 0 && (
        <div className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
          <h2 className="mb-4 text-lg font-bold text-navy-900">سرفصل‌ها</h2>
          <dl className="space-y-4">
            {request.syllabus.map((chapter, i) => (
              <div key={i}>
                <dt className="font-bold text-navy-900">{chapter.title}</dt>
                <dd className="mt-1">
                  <ul className="list-disc list-inside text-sm text-ink-600">
                    {chapter.lessons.map((lesson, j) => (
                      <li key={j}>{lesson}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {isApproved && (
        <div className="rounded-2xl bg-teal-50 p-6 text-center">
          <p className="text-lg font-bold text-teal-800">دوره شما تأیید و منتشر شد!</p>
          <p className="mt-2 text-sm text-teal-700">
            می‌توانید از بخش دوره‌های من، جلسات ویدیویی دوره را مدیریت کنید.
          </p>
          <Link
            href={`/instructor/courses`}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-800"
          >
            <BookOpen className="h-4 w-4" />
            دوره‌های من
          </Link>
        </div>
      )}
    </div>
  );
}
