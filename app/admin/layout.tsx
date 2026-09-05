import Link from "next/link";
import { LogOut, ShieldAlert } from "lucide-react";
import { SideNav } from "@/components/dashboard/SideNav";
import { LogoMark } from "@/components/Logo";
import { getSessionUser, can, isStaff, roleLabels, type Permission } from "@/lib/auth";
import { getComments, getOrders, getSubmissions } from "@/lib/store";
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
          <Link href="/auth" className="mt-2 inline-flex h-11 items-center rounded-xl bg-navy-800 px-8 font-bold text-white">
            ورود به حساب
          </Link>
        </div>
      </div>
    );
  }

  const pendingComments = getComments().filter((c) => c.status === "pending").length;
  const pendingSubs = getSubmissions().filter((s) => s.status === "در حال بررسی").length;
  const pendingOrders = getOrders().filter((o) => o.status === "در انتظار پرداخت").length;

  const items = [
    { href: "/admin", label: "نمای کلی", icon: "dashboard" },
    { href: "/admin/courses", label: "دوره‌ها", icon: "courses", perm: "courses" },
    { href: "/admin/classes", label: "کلاس‌های حضوری", icon: "classes", perm: "classes" },
    { href: "/admin/blog", label: "مقالات", icon: "blog", perm: "blog" },
    { href: "/admin/media", label: "رسانه", icon: "media", perm: "media" },
    { href: "/admin/content", label: "محتوای سایت", icon: "content", perm: "content" },
    { href: "/admin/comments", label: "نظرات", icon: "comments", perm: "comments", badge: pendingComments ? toFa(pendingComments) : undefined },
    { href: "/admin/students", label: "هنرجویان", icon: "students", perm: "students" },
    { href: "/admin/orders", label: "سفارش‌ها", icon: "orders", perm: "orders", badge: pendingOrders ? toFa(pendingOrders) : undefined },
    { href: "/admin/submissions", label: "تمرین‌ها", icon: "assignments", perm: "submissions", badge: pendingSubs ? toFa(pendingSubs) : undefined },
    { href: "/admin/certificates", label: "گواهی‌ها", icon: "certificates", perm: "certificates" },
    { href: "/admin/notify", label: "پیامک و ایمیل", icon: "notify", perm: "notify" },
    { href: "/admin/payments", label: "پرداخت", icon: "payments", perm: "payments" },
    { href: "/admin/users", label: "کاربران و دسترسی", icon: "profile", perm: "users" },
    { href: "/admin/settings", label: "تنظیمات", icon: "settings", perm: "settings" },
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
            </Link>
            <SideNav
              items={items.map((i) => ({ href: i.href, label: i.label, icon: i.icon, badge: i.badge }))}
              dark
            />
            <form action={logout} className="mt-3 border-t border-white/10 pt-3">
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-[18px] w-[18px]" />
                خروج از حساب
              </button>
            </form>
          </div>
        </aside>
        <div className="dashboard-canvas min-w-0 p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
