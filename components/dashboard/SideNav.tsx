"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  MessageSquareText,
  ReceiptText,
  Settings,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  courses: BookOpenCheck,
  classes: CalendarDays,
  assignments: ClipboardList,
  certificates: Award,
  orders: ReceiptText,
  profile: UserRound,
  students: UsersRound,
  blog: FileText,
  media: Images,
  content: LayoutTemplate,
  comments: MessageSquareText,
  notify: Bell,
  payments: CreditCard,
  settings: Settings,
};

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

export function SideNav({ items, dark = false }: { items: NavItem[]; dark?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="ناوبری پنل" className="space-y-1">
      {items.map(({ href, label, icon, badge }) => {
        const Icon = iconMap[icon] ?? LayoutDashboard;
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors",
              dark
                ? active
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
                : active
                  ? "bg-navy-800 text-white shadow-card"
                  : "text-ink-600 hover:bg-sand-100 hover:text-navy-900"
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-black",
                  dark ? "bg-madder-700 text-white" : active ? "bg-white/20 text-white" : "bg-madder-50 text-madder-700"
                )}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
