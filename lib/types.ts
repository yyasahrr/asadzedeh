/** Shared domain types for the Asadzedeh learning platform. */

export type Level = "مقدماتی" | "متوسط" | "پیشرفته" | "همه سطوح";

export interface OnlineCourse {
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  instructor: string;
  instructorRole: string;
  level: Level;
  sessions: number;
  hours: number;
  price: number;
  oldPrice?: number;
  rating: number;
  students: number;
  image: string;
  excerpt: string;
  outcomes: string[];
  syllabus: { title: string; lessons: string[] }[];
  badge?: string;
}

export interface InPersonClass {
  slug: string;
  title: string;
  instructor: string;
  startDate: string;
  days: string;
  time: string;
  sessions: number;
  capacity: number;
  remaining: number;
  location: string;
  price: number;
  image: string;
  excerpt: string;
  includes: string[];
}

export interface LearningPath {
  slug: string;
  title: string;
  description: string;
  steps: number;
  duration: string;
  courses: number;
  icon: string;
  accent: "navy" | "teal" | "madder" | "ochre" | "moss";
}

export interface Instructor {
  slug: string;
  name: string;
  specialty: string;
  experience: string;
  students: number;
  courses: number;
  image: string;
  bio: string;
}

export interface Article {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  minutes: number;
  date: string;
  image: string;
  body: string[];
}

export interface StudentWork {
  id: number;
  title: string;
  student: string;
  course: string;
  image: string;
}

export interface Student {
  name: string;
  phone: string;
  courses: number;
  joinDate: string;
  status: string;
}

export interface Order {
  id: string;
  student: string;
  item: string;
  amount: number;
  status: string;
  authority?: string;
  refId?: string;
  date?: string;
}

export interface Certificate {
  code: string;
  student: string;
  course: string;
  date: string;
  hours: number;
}

/* ---------- Backend ---------- */

export type Role = "admin" | "manager" | "editor" | "support" | "student";

export interface User {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  scope: "course" | "class";
  slug: string;
  name: string;
  text: string;
  date: string;
  status: "pending" | "approved";
}

export interface Submission {
  id: string;
  assignment: string;
  course: string;
  student: string;
  file: string;
  date: string;
  status: "در حال بررسی" | "تأیید شده" | "نیاز به اصلاح";
  note?: string;
}

export interface Subscriber {
  email: string;
  date: string;
}

export interface NotifyLog {
  id: string;
  date: string;
  channel: "sms" | "email";
  to: string;
  message: string;
  status: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  siteUrl: string;
  announcement: { enabled: boolean; text: string; link: string };
  hero: {
    badge: string;
    titleA: string;
    titleHighlight: string;
    titleB: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    image: string;
    note: string;
  };
  footerAbout: string;
  socials: { instagram: string; telegram: string };
  aboutIntro: string[];
}

export interface SmsSettings {
  provider: "demo" | "kavenegar" | "ghasedak";
  apiKey: string;
  sender: string;
}

export interface EmailSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface PaymentSettings {
  provider: "demo" | "zarinpal";
  merchantId: string;
  sandbox: boolean;
}

export interface Settings {
  site: SiteSettings;
  sms: SmsSettings;
  email: EmailSettings;
  payment: PaymentSettings;
}
