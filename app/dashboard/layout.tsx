import Link from "next/link";
import { LogOut } from "lucide-react";
import { SideNav } from "@/components/dashboard/SideNav";
import { getSessionUser } from "@/lib/auth";
import { dashboardStudent } from "@/lib/data";
import { logout } from "@/app/auth/actions";

const items = [
  { href: "/dashboard", label: "پیشخوان", icon: "dashboard" },
  { href: "/dashboard/courses", label: "دوره‌های من", icon: "courses" },
  { href: "/dashboard/classes", label: "کلاس‌های من", icon: "classes" },
  { href: "/dashboard/assignments", label: "تمرین‌ها", icon: "assignments", badge: "۲" },
  { href: "/dashboard/certificates", label: "گواهی‌ها", icon: "certificates" },
  { href: "/dashboard/orders", label: "سفارش‌ها", icon: "orders" },
  { href: "/dashboard/profile", label: "پروفایل", icon: "profile" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const name = user?.name ?? dashboardStudent.name;
  return (
    <div className="shell py-8 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start print:hidden">
          <div className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-sand-100 p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-lg font-black text-white">
                {name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-navy-900">{name}</p>
                <p className="text-xs text-ink-500">{user ? "هنرجو" : dashboardStudent.level}</p>
              </div>
            </div>
            <SideNav items={items} />
            {user ? (
              <form action={logout} className="mt-3 border-t border-ink-900/10 pt-3">
                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-ink-500 transition-colors hover:bg-sand-100 hover:text-ink-900"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                  خروج از حساب
                </button>
              </form>
            ) : (
              <Link
                href="/auth"
                className="mt-3 block rounded-xl bg-navy-800 px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-navy-700"
              >
                ورود / ثبت‌نام
              </Link>
            )}
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
