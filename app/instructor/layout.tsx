import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, LogOut, ShieldCheck } from "lucide-react";
import { SideNav } from "@/components/dashboard/SideNav";
import { LogoMark } from "@/components/Logo";
import { getSessionUser, isStaff, needsMfa } from "@/lib/auth";
import { getCourses, getInstructorByUser, getSubmissions } from "@/lib/store";
import { toFa } from "@/lib/format";
import { logout } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth?next=/instructor");
  const inst = getInstructorByUser(user.id);

  if (!inst) {
    // Staff without an instructor profile go back to admin; students to their dashboard.
    if (isStaff(user) && user.role !== "instructor") redirect("/admin");
    return (
      <div className="shell py-16">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl bg-card px-8 py-12 text-center shadow-card ring-1 ring-ink-900/5">
          <GraduationCap className="h-12 w-12 text-navy-700" />
          <h1 className="text-xl font-black text-navy-900">پنل مدرس</h1>
          <p className="text-sm leading-7 text-ink-600">حساب شما به پروفایل مدرسی متصل نیست. برای دریافت دسترسی با مدیریت آموزشگاه تماس بگیرید.</p>
          <Link href="/dashboard" className="mt-2 inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white">پیشخوان هنرجو</Link>
        </div>
      </div>
    );
  }

  const mfa = needsMfa(user);
  if (mfa === "verify") redirect("/auth/verify?mode=session&next=/instructor");

  const myCourses = getCourses().filter((c) => c.instructorSlug === inst.slug);
  const titles = new Set(myCourses.flatMap((c) => [c.title, c.shortTitle]));
  const pending = getSubmissions().filter((s) => titles.has(s.course) && s.status === "در حال بررسی").length;

  const items = [
    { href: "/instructor", label: "پیشخوان", icon: "dashboard" },
    { href: "/instructor/courses", label: "دوره‌های من", icon: "courses", badge: toFa(myCourses.length) },
    { href: "/instructor/students", label: "هنرجویان و تمرین‌ها", icon: "students", badge: pending ? toFa(pending) : undefined },
    { href: "/instructor/earnings", label: "درآمد", icon: "payments" },
    { href: "/instructor/profile", label: "پروفایل عمومی", icon: "profile" },
  ];

  return (
    <div className="shell py-6 lg:py-8">
      <div className="grid gap-5 lg:grid-cols-[254px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="persian-corner overflow-hidden rounded-3xl bg-teal-900 p-3.5 shadow-lift">
            <Link href="/instructor" className="mb-3 flex items-center gap-2.5 rounded-xl bg-white/5 p-3">
              <LogoMark className="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{inst.name}</p>
                <p className="text-[11px] text-teal-100">پنل مدرس • {inst.specialty}</p>
              </div>
              {user.totpEnabled && <ShieldCheck className="h-4 w-4 text-teal-200" aria-label="ورود دومرحله‌ای فعال" />}
            </Link>
            <SideNav items={items} dark />
            <div className="mt-3 flex items-center gap-1 border-t border-white/10 pt-3">
              <Link href="/account/security" className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white/60 transition-colors hover:bg-white/5 hover:text-white">
                <ShieldCheck className="h-[18px] w-[18px]" />
                امنیت حساب
              </Link>
              <form action={logout}>
                <button type="submit" className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white/60 transition-colors hover:bg-white/5 hover:text-white">
                  <LogOut className="h-[18px] w-[18px]" />
                  خروج
                </button>
              </form>
            </div>
          </div>
        </aside>
        <div className="dashboard-canvas min-w-0 p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
