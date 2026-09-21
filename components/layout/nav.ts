import { CalendarDays, MapPinned, Route, Video } from "lucide-react";

export const educationLinks = [
  { href: "/courses", label: "دوره‌های آنلاین", description: "یادگیری ویدیویی و پروژه‌محور", icon: Video },
  { href: "/classes", label: "دوره‌های حضوری", description: "آموزش عملی در کارگاه", icon: MapPinned },
  { href: "/classes/schedule", label: "برنامه کلاس‌ها", description: "تاریخ، ساعت، ظرفیت و ثبت‌نام", icon: CalendarDays },
  { href: "/paths", label: "مسیرهای آموزشی", description: "یادگیری مرحله‌به‌مرحله", icon: Route },
] as const;

export const primaryNavLinks = [
  { href: "/instructors", label: "اساتید" },
  { href: "/shop", label: "فروشگاه" },
  { href: "/blog", label: "دانشنامه" },
  { href: "/about", label: "درباره ما" },
] as const;

export const navLinks = [{ href: "/", label: "خانه" }, ...educationLinks.map(({ href, label }) => ({ href, label })), ...primaryNavLinks];
