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
  /** Course teaser (trailer) — public preview video. */
  trailer?: Trailer;
  /** Slug of the instructor profile (links to Instructor). */
  instructorSlug?: string;
  /** فصل‌های دوره (مدیریت ساختاریافته). */
  chapters?: Chapter[];
  /** Uploaded lesson videos (online courses). */
  lessons?: Lesson[];
  /** Per-course video protection profile. */
  protection?: CourseProtection;
}

/** Teaser video: either a self-hosted upload or an external embed (Aparat/YouTube/…). */
export interface Trailer {
  kind: "upload" | "embed" | "none";
  /** For uploads: video id in the video library. For embeds: the embed/iframe URL. */
  src: string;
  poster?: string;
  durationSec?: number;
}

export type VideoStatus = "uploaded" | "processing" | "ready" | "failed";

/** A stored video asset (server-side, never exposed as a static file). */
export interface VideoAsset {
  id: string;
  title: string;
  /** Original file name as uploaded. */
  originalName: string;
  /** Path relative to the private video vault (not under /public). */
  file: string;
  /** HLS playlist relative path when transcoded. */
  hls?: string;
  sizeBytes: number;
  mime: string;
  durationSec?: number;
  status: VideoStatus;
  /** Progress detail / ffmpeg error. */
  note?: string;
  uploadedBy: string;
  createdAt: string;
  /** Number of chunks received / expected (chunked upload). */
  chunks?: { received: number; total: number };
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
}

export interface Lesson {
  id: string;
  title: string;
  /** Chapter id (links to Chapter.id) */
  chapterId: string;
  order: number;
  videoId?: string;
  durationMin: number;
  /** Free preview lessons can be watched without purchase. */
  free: boolean;
  description?: string;
  attachments?: LessonAttachment[];
  /** تاریخ برگزاری جلسه (توسط ادمین ثبت می‌شود). */
  completedDate?: string;
}

export interface LessonAttachment {
  label: string;
  path: string;
  fileName?: string;
  mime?: string;
  sizeBytes?: number;
}

export interface CourseProtection {
  /** Delivery via built-in secure player (signed URLs + dynamic watermark). */
  securePlayer: boolean;
  /** Burn the buyer's phone into the video with ffmpeg (per-user copy). */
  burnWatermark: boolean;
  /** Overlay watermark in the player (moving text). */
  overlayWatermark: boolean;
  /** Also deliver via SpotPlayer DRM license. */
  spotPlayer: boolean;
  /** SpotPlayer course id(s) for this course. */
  spotPlayerCourseIds: string[];
  /** Max concurrent devices per student. */
  maxDevices: number;
  /** Disable downloads / right click / picture-in-picture. */
  blockDownload: boolean;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseSlug: string;
  orderId?: string;
  createdAt: string;
  /** Completed lesson ids */
  completed: string[];
  /** Last watched lesson id */
  lastLessonId?: string;
  /** SpotPlayer license info when issued */
  spotLicense?: { id: string; key: string; url: string };
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
  trailer?: Trailer;
  instructorSlug?: string;
  /** فصل‌های کلاس حضوری. */
  chapters?: Chapter[];
  /** فصل‌ها، درس‌ها و محتوای تکمیلی کلاس حضوری. */
  lessons?: Lesson[];
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
  /** Linked staff account (role: instructor). */
  userId?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  /** Revenue share percentage (0-100) used in the instructor panel. */
  commissionPercent?: number;
  /** Long biography paragraphs for the profile page. */
  about?: string[];
  featured?: boolean;
  active?: boolean;
  createdAt?: string;
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

export interface OrderLine {
  kind: "course" | "class" | "product" | "preorder";
  slug: string;
  title: string;
  price: number;
  qty: number;
}

export interface ShippingInfo {
  /** Shipping method label at the time of the order (e.g. «پست پیشتاز»). */
  method: string;
  /** Shipping method id (e.g. "post", "tipax", "pickup"). */
  methodId?: string;
  cost: number;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  recipient: string;
  phone: string;
  trackingCode?: string;
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
  /** Structured lines (new orders); legacy orders only have `item`. */
  lines?: OrderLine[];
  userId?: string;
  phone?: string;
  shipping?: ShippingInfo;
  discount?: number;
  note?: string;
}

export interface Certificate {
  code: string;
  student: string;
  course: string;
  date: string;
  hours: number;
}

/* ---------- Backend ---------- */

export type Role = "admin" | "manager" | "editor" | "support" | "instructor" | "student";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  /** TOTP two-factor (Google Authenticator compatible). */
  totp?: {
    enabled: boolean;
    /** base32 secret (encrypted at rest with APP_SECRET when available) */
    secret: string;
    /** scrypt hashes of one-time recovery codes */
    recoveryCodes: string[];
    enabledAt?: string;
    /** Last accepted TOTP time-step — a code is never accepted twice (RFC 6238 §5.2). */
    lastStep?: number;
  };
  /** Account lock after repeated failures */
  lockedUntil?: string;
  failedLogins?: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
  /** Optional profile fields (student dashboard). */
  city?: string;
  bio?: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  /** Second factor already satisfied for this session */
  mfaVerified?: boolean;
  ip?: string;
  userAgent?: string;
  /** ISO timestamp of last activity */
  lastSeen?: string;
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

/* ---------- Shop ---------- */

export type ProductKind = "physical" | "preorder";

export interface ProductVariant {
  id: string;
  label: string;
  priceDelta: number;
  stock: number;
}

export interface Product {
  slug: string;
  title: string;
  category: string;
  kind: ProductKind;
  price: number;
  oldPrice?: number;
  /** Available stock (physical products). */
  stock: number;
  /** Allow ordering when out of stock (backorder) */
  allowBackorder: boolean;
  /** Preorder: deposit percent and lead time */
  preorder?: { depositPercent: number; leadTimeDays: number; note: string };
  image: string;
  gallery: string[];
  excerpt: string;
  description: string[];
  specs: { label: string; value: string }[];
  /** Allowed shipping method ids */
  shippingMethods: string[];
  weightGrams: number;
  variants?: ProductVariant[];
  badge?: string;
  featured: boolean;
  active: boolean;
  sku?: string;
  createdAt: string;
  sold: number;
}

export interface ShippingMethod {
  id: string;
  label: string;
  description: string;
  cost: number;
  /** Free shipping threshold in Toman (0 = never free) */
  freeOver: number;
  etaDays: string;
  active: boolean;
}

export type PreorderStatus =
  | "ثبت شده"
  | "در انتظار بیعانه"
  | "در حال ساخت"
  | "آماده تحویل"
  | "ارسال شده"
  | "تحویل شده"
  | "لغو شده";

export interface Preorder {
  id: string;
  productSlug: string;
  productTitle: string;
  customer: string;
  phone: string;
  userId?: string;
  /** Custom specs (e.g. loom width/height, wood type) */
  specs: Record<string, string>;
  note?: string;
  quotedPrice: number;
  deposit: number;
  depositPaid: boolean;
  orderId?: string;
  status: PreorderStatus;
  createdAt: string;
  eta?: string;
  timeline: { date: string; status: PreorderStatus; note?: string }[];
}

/* ---------- Audit log ---------- */

export type AuditLevel = "info" | "warn" | "error" | "security";

export interface AuditEntry {
  id: string;
  /** ISO timestamp */
  ts: string;
  level: AuditLevel;
  /** Dot-namespaced action, e.g. course.create, auth.login.failed */
  action: string;
  actorId?: string;
  actorName?: string;
  actorRole?: Role | "anonymous";
  /** Target entity (kind:id) */
  target?: string;
  ip?: string;
  userAgent?: string;
  /** Free-form detail (sanitized; no secrets) */
  detail?: Record<string, unknown>;
  /** Previous log hash (tamper-evident chain) */
  prev: string;
  /** SHA-256 of this entry body + prev */
  hash: string;
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

export interface SecuritySettings {
  /** Force TOTP for every staff role when entering /admin */
  requireStaff2fa: boolean;
  /** Minutes of inactivity before an admin session is re-challenged */
  adminSessionMinutes: number;
  /** Max failed logins before temporary lock */
  maxFailedLogins: number;
  lockMinutes: number;
}

export interface VideoSettings {
  /** Default protection profile for new courses */
  defaults: CourseProtection;
  /** Signed URL lifetime (seconds) */
  signedUrlSeconds: number;
  /** Transcode to HLS after upload */
  transcode: boolean;
  /** ffmpeg binary path (auto = ffmpeg-static or PATH) */
  ffmpegPath: string;
  /** Overlay watermark texts (in addition to phone) */
  watermarkExtra: string;
  /** Overlay reposition interval in seconds */
  watermarkIntervalSec: number;
  /** Player primary color */
  playerColor: string;
}

export interface SpotPlayerSettings {
  enabled: boolean;
  apiKey: string;
  /** Test licenses only */
  test: boolean;
  /** Default device limits */
  devices: { all: number; windows: number; mac: number; android: number; ios: number; web: number };
  /** Default course id mapping fallback */
  defaultCourseId: string;
}

export interface InstagramSettings {
  enabled: boolean;
  /** Instagram username without @ */
  username: string;
  /** Optional post/reel permalinks to embed (up to 6) */
  posts: string[];
  /** Custom iframe embed code override (sanitised: only src is used) */
  embedUrl: string;
  title: string;
  description: string;
}

export interface ShopSettings {
  enabled: boolean;
  title: string;
  description: string;
  shippingMethods: ShippingMethod[];
  /** Global free-shipping threshold (0 = disabled) */
  freeShippingOver: number;
  preorderDepositPercent: number;
  preorderIntro: string;
}

export interface Settings {
  site: SiteSettings;
  sms: SmsSettings;
  email: EmailSettings;
  payment: PaymentSettings;
  security: SecuritySettings;
  video: VideoSettings;
  spotplayer: SpotPlayerSettings;
  instagram: InstagramSettings;
  shop: ShopSettings;
}
