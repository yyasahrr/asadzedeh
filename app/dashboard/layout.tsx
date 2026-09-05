import { SideNav } from "@/components/dashboard/SideNav";
import { dashboardStudent } from "@/lib/data";

const items = [
  { href: "/dashboard", label: "پیشخوان", icon: "dashboard" },
  { href: "/dashboard/courses", label: "دوره‌های من", icon: "courses" },
  { href: "/dashboard/classes", label: "کلاس‌های من", icon: "classes" },
  { href: "/dashboard/assignments", label: "تمرین‌ها", icon: "assignments", badge: "۲" },
  { href: "/dashboard/certificates", label: "گواهی‌ها", icon: "certificates" },
  { href: "/dashboard/orders", label: "سفارش‌ها", icon: "orders" },
  { href: "/dashboard/profile", label: "پروفایل", icon: "profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell py-8 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start print:hidden">
          <div className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5">
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-sand-100 p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-lg font-black text-white">
                {dashboardStudent.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-navy-900">{dashboardStudent.name}</p>
                <p className="text-xs text-ink-500">{dashboardStudent.level}</p>
              </div>
            </div>
            <SideNav items={items} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
