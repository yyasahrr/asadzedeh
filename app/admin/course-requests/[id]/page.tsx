import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { getCourseRequest, getInstructor } from "@/lib/store";
import { toFa } from "@/lib/format";
import { Denied } from "@/components/admin/Denied";
import { can, getSessionUser } from "@/lib/auth";
import { approveCourseRequest, rejectCourseRequest } from "../actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "بررسی درخواست دوره" };
export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  "پیش‌نویس": "bg-sand-100 text-ink-600",
  "در انتظار بررسی": "bg-ochre-100 text-ochre-800",
  "تأیید شده": "bg-teal-100 text-teal-800",
  "رد شده": "bg-madder-50 text-madder-700",
};

export default async function CourseRequestReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ approved?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !can(user, "courses")) return <Denied />;

  const { id } = await params;
  const { approved } = await searchParams;
  const request = getCourseRequest(id);

  if (!request) {
    notFound();
  }

  const instructor = getInstructor(request.instructorSlug);
  const isPending = request.status === "در انتظار بررسی";
  const isApproved = request.status === "تأیید شده";
  const isRejected = request.status === "رد شده";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink-500">مدیریت دوره‌ها</p>
          <h1 className="mt-1 text-2xl font-black text-navy-900">{request.shortTitle}</h1>
          <p className="mt-1 flex items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", statusColors[request.status] ?? "")}>
              {request.status}
            </span>
            <span className="text-sm text-ink-500">
              درخواست شده در {new Date(request.createdAt).toLocaleDateString("fa-IR")}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/course-requests"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-900/10 bg-white px-4 text-sm font-bold text-ink-700 transition-colors hover:bg-sand-50"
          >
            بازگشت
          </Link>
        </div>
      </div>

      {approved === "1" && (
        <div className="rounded-2xl bg-teal-50 p-4">
          <p className="flex items-center gap-2 font-bold text-teal-800">
            <CheckCircle className="h-5 w-5" />
            دوره با موفقیت تأیید و منتشر شد!
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/admin/courses`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-teal-700 px-5 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-50"
            >
              لیست دوره‌ها
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
            <h2 className="mb-4 text-lg font-bold text-navy-900">اطلاعات دوره</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold text-ink-500">عنوان کامل</dt>
                <dd className="mt-1 font-bold text-navy-900">{request.title}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-500">عنوان کوتاه</dt>
                <dd className="mt-1 text-navy-900">{request.shortTitle}</dd>
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
              <div>
                <dt className="text-xs font-bold text-ink-500">تعداد جلسات</dt>
                <dd className="mt-1 text-navy-900">{toFa(request.sessions)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-ink-500">ساعت آموزش</dt>
                <dd className="mt-1 text-navy-900">{toFa(request.hours)}</dd>
              </div>
              {request.oldPrice && (
                <div>
                  <dt className="text-xs font-bold text-ink-500">قیمت قبلی</dt>
                  <dd className="mt-1 text-ink-500 line-through">{toFa(request.oldPrice)} تومان</dd>
                </div>
              )}
              {request.badge && (
                <div>
                  <dt className="text-xs font-bold text-ink-500">نشان</dt>
                  <dd className="mt-1">
                    <span className="rounded bg-madder-50 px-2 py-0.5 text-xs font-bold text-madder-700">{request.badge}</span>
                  </dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold text-ink-500">تصویر</dt>
                <dd className="mt-2">
                  <Image src={request.image} alt={request.title} width={256} height={160} className="h-40 w-64 rounded-xl object-cover" />
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

          {isRejected && request.rejectionReason && (
            <div className="rounded-2xl bg-madder-50 p-4">
              <p className="flex items-center gap-2 font-bold text-madder-800">
                <XCircle className="h-5 w-5" />
                دلیل رد:
              </p>
              <p className="mt-1 text-sm text-madder-700">{request.rejectionReason}</p>
              {request.reviewedBy && (
                <p className="mt-2 text-xs text-madder-600">
                  توسط {request.reviewedBy} در {new Date(request.reviewedAt!).toLocaleDateString("fa-IR")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
            <h2 className="mb-4 text-lg font-bold text-navy-900">مدرس</h2>
            {instructor ? (
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs font-bold text-ink-500">نام</dt>
                  <dd className="font-bold text-navy-900">{instructor.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-ink-500">تخصص</dt>
                  <dd className="text-navy-900">{instructor.specialty}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-ink-500">سابقه</dt>
                  <dd className="text-navy-900">{instructor.experience}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-ink-500">تعداد دوره‌ها</dt>
                  <dd className="text-navy-900">{toFa(instructor.courses)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-ink-500">مدرس یافت نشد</p>
            )}
          </div>

          {isPending && (
            <div className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
              <h2 className="mb-4 text-lg font-bold text-navy-900">عملیات</h2>
              <div className="space-y-3">
                <form action={async () => {
                  "use server";
                  await approveCourseRequest(id);
                }}>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-800"
                  >
                    <CheckCircle className="h-5 w-5" />
                    تأیید و انتشار دوره
                  </button>
                </form>
                <form action={rejectCourseRequest}>
                  <input type="hidden" name="id" value={id} />
                  <div className="mb-2">
                    <label htmlFor="reject-reason" className="mb-1 block text-xs font-bold text-ink-500">
                      دلیل رد (اختیاری)
                    </label>
                    <textarea
                      id="reject-reason"
                      name="reason"
                      rows={3}
                      className="w-full rounded-xl border border-ink-900/10 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                      placeholder="توضیحات برای استاد..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-madder-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-madder-800"
                  >
                    <XCircle className="h-5 w-5" />
                    رد درخواست
                  </button>
                </form>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="rounded-2xl bg-teal-50 p-6 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-teal-700" />
              <p className="mt-2 font-bold text-teal-800">دوره تأیید و منتشر شد</p>
              <Link
                href={`/admin/courses`}
                className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-800"
              >
                مدیریت دوره‌ها
              </Link>
            </div>
          )}

          <div className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
            <h2 className="mb-4 text-lg font-bold text-navy-900">اطلاعات درخواست</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">شناسه</dt>
                <dd className="font-mono text-ink-700" dir="ltr">{id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">تاریخ درخواست</dt>
                <dd>{new Date(request.createdAt).toLocaleDateString("fa-IR")}</dd>
              </div>
              {request.reviewedAt && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">تاریخ بررسی</dt>
                  <dd>{new Date(request.reviewedAt).toLocaleDateString("fa-IR")}</dd>
                </div>
              )}
              {request.reviewedBy && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">بررسی‌کننده</dt>
                  <dd>{request.reviewedBy}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
