import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { SideNav } from "@/components/dashboard/SideNav";
import { LogoMark } from "@/components/Logo";
import { getSessionUser, can, isStaff, needsMfa, roleLabels, type Permission } from "@/lib/auth";
import { getComments, getCourseRequests, getOrders, getPreorders, getSubmissions, getTickets, getVideos } from "@/lib/store";
import { toFa } from "@/lib/format";
import { logout } from "@/app/auth/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!isStaff(user)) {
    return (
      <div className="shell py-16">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl bg-card px-8 py-12 text-center shadow-card ring-1 ring-ink-900/5">
          <ShieldAlert className="h-12 w-12 text-madder-700" />
          <h1 className="text-xl font-black text-navy-900">ورود به پنل مدیریت</h1>
          <p className="text-sm leading-7 text-ink-600">
            این بخش مخصوص همکاران است. لطفاً با حساب کاربری مجاز وارد شوید.
          </p>
          <Link href="/auth?next=/admin" className="mt-2 inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white">
            ورود به حساب
          </Link>
        </div>
      </div>
    );
  }

  // Instructors have their own panel.
  if (user!.role === "instructor") redirect("/instructor");

  // Second-factor gate for the admin area.
  const mfa = needsMfa(user);
  if (mfa === "verify") redirect("/auth/verify?mode=session");
  if (mfa === "enrol") redirect("/account/security?required=1");

  const pendingComments = getComments().filter((c) => c.status === "pending").length;
  const pendingSubs = getSubmissions().filter((s) => s.status === "در حال بررسی").length;
  const pendingOrders = getOrders().filter((o) => o.status === "در انتظار پرداخت").length;
  const processingVideos = getVideos().filter((v) => v.status === "processing").length;
  const openPreorders = getPreorders().filter((p) => p.status === "ثبت شده" || p.status === "در انتظار بیعانه").length;
  const openTickets = getTickets().filter((t) => t.status === "باز" || t.status === "در حال بررسی").length;
  const pendingCourseRequests = getCourseRequests().filter((r) => r.status === "در انتظار بررسی").length;

  const items = [
    { href: "/admin", label: "نمای کلی", icon: "dashboard" },
    { href: "/admin/course-requests", label: "درخواست‌های دوره", icon: "courses", perm: "courses", badge: pendingCourseRequests ? toFa(pendingCourseRequests) : undefined },
    { href: "/admin/courses", label: "دوره‌ها", icon: "courses", perm: "courses" },
    { href: "/admin/classes", label: "کلاس‌های حضوری", icon: "classes", perm: "classes" },
    { href: "/admin/videos", label: "ویدیوها و امنیت پخش", icon: "videos", perm: "videos", badge: processingVideos ? toFa(processingVideos) : undefined },
    { href: "/admin/instructors", label: "اساتید", icon: "instructors", perm: "instructors" },
    { href: "/admin/shop", label: "فروشگاه", icon: "shop", perm: "shop" },
    { href: "/admin/preorders", label: "پیش‌سفارش‌ها", icon: "preorders", perm: "preorders", badge: openPreorders ? toFa(openPreorders) : undefined },
    { href: "/admin/blog", label: "مقالات", icon: "blog", perm: "blog" },
    { href: "/admin/media", label: "رسانه", icon: "media", perm: "media" },
    { href: "/admin/content", label: "محتوای سایت", icon: "content", perm: "content" },
    { href: "/admin/comments", label: "نظرات", icon: "comments", perm: "comments", badge: pendingComments ? toFa(pendingComments) : undefined },
    { href: "/admin/students", label: "هنرجویان", icon: "students", perm: "students" },
    { href: "/admin/enrollments", label: "اعضای دوره‌ها", icon: "enrollments", perm: "orders" },
    { href: "/admin/learning-paths", label: "مسیرهای آموزشی", icon: "paths", perm: "courses" },
    { href: "/admin/orders", label: "سفارش‌ها", icon: "orders", perm: "orders", badge: pendingOrders ? toFa(pendingOrders) : undefined },
    { href: "/admin/support", label: "تیکت‌های پشتیبانی", icon: "support", perm: "orders", badge: openTickets ? toFa(openTickets) : undefined },
    { href: "/admin/submissions", label: "تمرین‌ها", icon: "assignments", perm: "submissions", badge: pendingSubs ? toFa(pendingSubs) : undefined },
    { href: "/admin/certificates", label: "گواهی‌ها", icon: "certificates", perm: "certificates" },
    { href: "/admin/notify", label: "پیامک و ایمیل", icon: "notify", perm: "notify" },
    { href: "/admin/payments", label: "پرداخت", icon: "payments", perm: "payments" },
    { href: "/admin/audit", label: "لاگ سیستم", icon: "audit", perm: "audit" },
    { href: "/admin/users", label: "کاربران و دسترسی", icon: "profile", perm: "users" },
    { href: "/admin/security", label: "امنیت پنل", icon: "security", perm: "security" },
    { href: "/admin/settings", label: "تنظیمات", icon: "settings", perm: "settings" },
    { href: "/admin/workshop", label: "نقشه کارگاه", icon: "map", perm: "settings" },
  ].filter((i) => !i.perm || can(user, i.perm as Permission));

  return (
    <div className="shell py-6 lg:py-8">
      <div className="grid gap-5 lg:grid-cols-[254px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="persian-corner overflow-hidden rounded-3xl bg-navy-900 p-3.5 shadow-lift">
            <Link href="/admin" className="mb-3 flex items-center gap-2.5 rounded-xl bg-white/5 p-3">
              <LogoMark className="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{user!.name}</p>
                <p className="text-[11px] text-ochre-200">{roleLabels[user!.role]}</p>
              </div>
              {user!.totpEnabled && <ShieldCheck className="h-4 w-4 text-teal-200" aria-label="ورود دومرحله‌ای فعال" />}
            </Link>
            {!user!.totpEnabled && (
              <Link href="/account/security" className="mb-3 block rounded-xl bg-ochre-200/15 px-3 py-2 text-[11px] font-bold leading-5 text-ochre-200 ring-1 ring-ochre-200/30 hover:bg-ochre-200/25">
                ⚠️ ورود دومرحله‌ای فعال نیست — فعال‌سازی
              </Link>
            )}
            <div className="thin-scroll max-h-[calc(100vh-15rem)] overflow-y-auto pe-1">
              <SideNav
                items={items.map((i) => ({ href: i.href, label: i.label, icon: i.icon, badge: i.badge }))}
                dark
              />
            </div>
            <div className="mt-3 flex items-center gap-1 border-t border-white/10 pt-3">
              <Link href="/account/security" className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white/60 transition-colors hover:bg-white/5 hover:text-white">
                <ShieldCheck className="h-[18px] w-[18px]" />
                حساب من
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
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
