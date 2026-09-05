import Link from "next/link";
import { SideNav } from "@/components/dashboard/SideNav";
import { LogoMark } from "@/components/Logo";

const items = [
  { href: "/admin", label: "نمای کلی", icon: "dashboard" },
  { href: "/admin/courses", label: "دوره‌ها", icon: "courses" },
  { href: "/admin/students", label: "هنرجویان", icon: "students" },
  { href: "/admin/orders", label: "سفارش‌ها", icon: "orders", badge: "۱۲" },
  { href: "/admin/classes", label: "کلاس‌های حضوری", icon: "classes" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell py-8 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-navy-900 p-4 shadow-card">
            <Link href="/admin" className="mb-4 flex items-center gap-2.5 rounded-xl bg-white/5 p-3">
              <LogoMark className="h-8 w-8" />
              <div>
                <p className="text-sm font-black text-white">مدیریت اسدزاده</p>
                <p className="text-[11px] text-white/50">نسخه ۱٫۰ • شهریور ۱۴۰۵</p>
              </div>
            </Link>
            <SideNav items={items} dark />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
