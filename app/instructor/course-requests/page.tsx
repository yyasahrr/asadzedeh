import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus, Send } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getCourseRequestsByInstructor, getInstructorByUser } from "@/lib/store";
import { toFa } from "@/lib/format";
import { TableShell, Td } from "@/components/admin/TableShell";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteCourseRequest, submitCourseRequest } from "./actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "درخواست دوره جدید" };
export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  "پیش‌نویس": "bg-sand-100 text-ink-600",
  "در انتظار بررسی": "bg-ochre-100 text-ochre-800",
  "تأیید شده": "bg-teal-100 text-teal-800",
  "رد شده": "bg-madder-50 text-madder-700",
};

export default async function CourseRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const inst = getInstructorByUser(user.id);
  if (!inst) return null;

  const { created } = await searchParams;
  const requests = getCourseRequestsByInstructor(user.id);

  const pendingRequests = requests.filter((r) => r.status === "در انتظار بررسی").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink-500">پنل مدرس</p>
          <h1 className="mt-1 text-2xl font-black text-navy-900">درخواست دوره جدید</h1>
          {pendingRequests > 0 && (
            <p className="mt-1 text-sm text-ochre-700">
              {toFa(pendingRequests)} درخواست در انتظار بررسی ادمین
            </p>
          )}
        </div>
        <Link
          href="/instructor/course-requests/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700"
        >
          <Plus className="h-4 w-4" />
          دوره جدید
        </Link>
      </div>

      {created && (
        <div className="rounded-xl bg-teal-50 p-4 text-sm font-bold text-teal-800">
          درخواست دوره با موفقیت ثبت شد و برای بررسی به ادمین ارسال شد.
        </div>
      )}

      <TableShell head={["عنوان دوره", "دسته", "سطح", "قیمت", "وضعیت", "تاریخ", "عملیات"]}>
        {requests.map((r) => (
          <tr key={r.id} className="transition-colors hover:bg-sand-50">
            <Td className="font-bold text-navy-900">{r.shortTitle}</Td>
            <Td className="text-ink-600">{r.category}</Td>
            <Td className="text-ink-600">{r.level}</Td>
            <Td className="font-bold whitespace-nowrap">
              {r.price > 0 ? `${toFa(r.price)} تومان` : "رایگان"}
            </Td>
            <Td>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", statusColors[r.status] ?? "")}>
                {r.status}
              </span>
            </Td>
            <Td className="whitespace-nowrap text-xs text-ink-600">
              {new Date(r.createdAt).toLocaleDateString("fa-IR")}
            </Td>
            <Td>
              <span className="flex items-center gap-1">
                <Link
                  href={`/instructor/course-requests/${r.id}`}
                  aria-label={`مدیریت ${r.shortTitle}`}
                  title="مدیریت"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-teal-700 transition-colors hover:bg-teal-50"
                >
                  <BookOpen className="h-4 w-4" />
                </Link>
                {(r.status === "پیش‌نویس" || r.status === "رد شده") && (
                  <form action={submitCourseRequest}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      title="ارسال برای بررسی"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-800 transition-colors hover:bg-navy-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}
                {r.status !== "تأیید شده" && (
                  <DeleteButton
                    action={deleteCourseRequest}
                    hidden={{ name: "id", value: r.id }}
                    label={r.shortTitle}
                  />
                )}
              </span>
            </Td>
          </tr>
        ))}
      </TableShell>

      {requests.length === 0 && (
        <div className="rounded-2xl bg-card p-8 text-center shadow-card">
          <p className="text-sm text-ink-500">هنوز درخواست دوره‌ای ندارید.</p>
          <Link
            href="/instructor/course-requests/new"
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700"
          >
            <Plus className="h-4 w-4" />
            درخواست دوره جدید
          </Link>
        </div>
      )}
    </div>
  );
}
