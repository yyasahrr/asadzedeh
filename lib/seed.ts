import type { Certificate, Order, Student } from "./types";

/* ---------------- Seed: students / orders / certificates ----------------
   Used to initialize the file store (data/db.json) on first run. */

export const students: Student[] = [
  { name: "سارا محمدی", phone: "09123456789", courses: 3, joinDate: "تیر ۱۴۰۵", status: "فعال" },
  { name: "حسین احمدی", phone: "09129876543", courses: 2, joinDate: "مرداد ۱۴۰۵", status: "فعال" },
  { name: "نگار رضایی", phone: "09351234567", courses: 2, joinDate: "خرداد ۱۴۰۵", status: "فعال" },
  { name: "لیلا کریمی", phone: "09127654321", courses: 1, joinDate: "شهریور ۱۴۰۵", status: "فعال" },
  { name: "امیر حسینی", phone: "09201112233", courses: 1, joinDate: "مرداد ۱۴۰۵", status: "در انتظار پرداخت" },
  { name: "مریم صادقی", phone: "09193334455", courses: 4, joinDate: "اردیبهشت ۱۴۰۵", status: "فعال" },
];

export const orders: Order[] = [
  { id: "AZ-9041", student: "سارا محمدی", item: "گبه‌بافی (آنلاین)", amount: 1750000, status: "پرداخت شده" },
  { id: "AZ-9040", student: "حسین احمدی", item: "فرش‌بافی متوسط (حضوری)", amount: 6500000, status: "در انتظار پرداخت" },
  { id: "AZ-9039", student: "نگار رضایی", item: "رنگرزی سنتی (آنلاین)", amount: 3200000, status: "پرداخت شده" },
  { id: "AZ-9038", student: "لیلا کریمی", item: "گلیم‌بافی مقدماتی (حضوری)", amount: 4800000, status: "پرداخت شده" },
  { id: "AZ-9037", student: "امیر حسینی", item: "طراحی نقشه (آنلاین)", amount: 3650000, status: "لغو شده" },
];

export const certificates: Certificate[] = [
  { code: "AZ-C-1182", student: "سارا محمدی", course: "گلیم‌بافی مقدماتی", date: "تیر ۱۴۰۵", hours: 12 },
  { code: "AZ-C-1204", student: "سارا محمدی", course: "رنگرزی سنتی", date: "مرداد ۱۴۰۵", hours: 14 },
];

/** Images available for courses/classes in admin forms. */
export const galleryImages = [
  { value: "/images/course-carpet.jpg", label: "فرش (لچک‌ترنج)" },
  { value: "/images/course-kilim.jpg", label: "گلیم" },
  { value: "/images/course-dye.jpg", label: "رنگرزی" },
  { value: "/images/course-restore.jpg", label: "مرمت" },
  { value: "/images/course-design.jpg", label: "طراحی نقشه" },
  { value: "/images/workshop-loom.jpg", label: "دار قالی کارگاه" },
  { value: "/images/workshop-threads.jpg", label: "نخ‌های رنگی" },
  { value: "/images/hero-weaver.jpg", label: "دست‌های بافنده" },
];
