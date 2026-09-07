import fs from "node:fs";
import path from "node:path";
import type {
  Article,
  AuditEntry,
  Certificate,
  Comment,
  CourseRequest,
  Enrollment,
  InPersonClass,
  Instructor,
  LearningPath,
  NotifyLog,
  OnlineCourse,
  Order,
  PaymentRecord,
  Preorder,
  Product,
  SeoEntry,
  SeoRedirect,
  Session,
  Settings,
  Student,
  Subscriber,
  Submission,
  Ticket,
  User,
  VideoAsset,
} from "./types";
import {
  articles as seedArticles,
  inPersonClasses as seedClasses,
  instructors as seedInstructors,
  learningPaths as seedLearningPaths,
  onlineCourses as seedCourses,
} from "./data";
import {
  certificates as seedCertificates,
  comments as seedComments,
  defaultSettings,
  enrollments as seedEnrollments,
  orders as seedOrders,
  products as seedProducts,
  students as seedStudents,
  users as seedUsers,
} from "./seed";
import { getLearningPathCoursesTotal as pathTotal, getLearningPathDiscount as pathDiscount, getLearningPathFinalPrice as pathFinal } from "./pricing";
import { getSql } from "./db/client";
import { runMigrations } from "./db/migrate";
import { isProduction } from "./env";
import { logger } from "./logger";
import { CURRENCY } from "./money";
// Re-exported so server code can keep importing them from the store.
export { availableSeats, availableStock } from "./stock";

/**
 * Domain store.
 * Getters stay synchronous (in-memory cache) so existing Server Components keep working.
 * PostgreSQL is the single authoritative store — there is no file-based snapshot
 * behind it. The cache is loaded once at boot and every write goes to the
 * database; nothing survives only in memory or only on disk.
 */

const JSON_PATH = path.join(process.cwd(), "data", "db.json");

export interface Db {
  courses: OnlineCourse[];
  classes: InPersonClass[];
  students: Student[];
  orders: Order[];
  certificates: Certificate[];
  articles: Article[];
  users: User[];
  sessions: Session[];
  comments: Comment[];
  submissions: Submission[];
  subscribers: Subscriber[];
  notifyLog: NotifyLog[];
  settings: Settings;
  instructors: Instructor[];
  videos: VideoAsset[];
  enrollments: Enrollment[];
  products: Product[];
  preorders: Preorder[];
  audit: AuditEntry[];
  learningPaths: LearningPath[];
  tickets: Ticket[];
  courseRequests: CourseRequest[];
  seoEntries: SeoEntry[];
  seoRedirects: SeoRedirect[];
  payments: PaymentRecord[];
}

function withSeedLessons(course: OnlineCourse): OnlineCourse {
  if (course.lessons && course.lessons.length > 0) return course;
  let order = 0;
  const chapters = course.syllabus.map((s, i) => ({
    id: `ch-${course.slug}-${i + 1}`,
    title: s.title,
    order: i + 1,
  }));
  const chapterIdByTitle = new Map(chapters.map((ch) => [ch.title, ch.id]));
  const lessons = course.syllabus.flatMap((chapter) =>
    chapter.lessons.map((title) => {
      order += 1;
      return {
        id: `ls-${course.slug}-${order}`,
        title,
        chapterId: chapterIdByTitle.get(chapter.title) ?? chapters[0]?.id ?? "",
        order,
        durationMin: 18 + ((order * 7) % 25),
        free: order === 1,
      };
    }),
  );
  return { ...course, chapters, lessons };
}

function defaultSeo(): NonNullable<Settings["seo"]> {
  return {
    defaultTitle: "اسدزاده | آموزش فرش، گلیم و هنرهای بافت ایرانی",
    titleTemplate: "%s | اسدزاده",
    defaultDescription:
      "آموزش تخصصی فرش‌بافی، گلیم‌بافی، گبه‌بافی، رنگرزی، مرمت و طراحی نقشه به‌صورت آنلاین و حضوری.",
    defaultOgImage: "/images/hero-weaver.jpg",
    siteName: "اسدزاده",
    canonicalBaseUrl: "https://asadzedeh.ir",
    robotsIndex: true,
    robotsFollow: true,
    social: { instagram: "", telegram: "", twitter: "" },
    organization: {
      name: "آموزشگاه اسدزاده",
      logo: "/icon.svg",
      phone: defaultSettings.site.phone,
      address: defaultSettings.site.address,
      openingHours: "",
    },
  };
}

function normalizeLearningPath(item: LearningPath): LearningPath {
  return {
    ...item,
    id: item.id || `lp-${item.slug}`,
    pathCourses: Array.isArray(item.pathCourses) ? item.pathCourses : [],
    active: typeof item.active === "boolean" ? item.active : true,
    status: item.status || "published",
    pricingMode: item.pricingMode || "FIXED",
    fixedPrice: item.fixedPrice,
    discountPercentage: item.discountPercentage,
    createdAt: typeof item.createdAt === "string" && item.createdAt.length > 0 ? item.createdAt : new Date().toISOString(),
    steps: Array.isArray(item.pathCourses) ? item.pathCourses.length : 0,
    courses: Array.isArray(item.pathCourses) ? item.pathCourses.length : 0,
  };
}

function mergeSettings(base: Settings, parsed: Partial<Settings> | undefined): Settings {
  if (!parsed) return { ...base, seo: base.seo ?? defaultSeo() };
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof Settings)[]) {
    const b = base[key] as unknown;
    const p = parsed[key] as unknown;
    if (p && typeof p === "object" && !Array.isArray(p) && b && typeof b === "object" && !Array.isArray(b)) {
      out[key] = { ...(b as object), ...(p as object) };
    } else if (p !== undefined) {
      out[key] = p;
    }
  }
  const settings = out as unknown as Settings;
  settings.seo = { ...defaultSeo(), ...(parsed.seo ?? base.seo) };
  return settings;
}

function ensureSeedUsers(users: User[]): User[] {
  if (process.env.NODE_ENV === "production") return users;
  const known = new Set(users.map((u) => u.id));
  const missing = seedUsers.filter((u) => !known.has(u.id) && !users.some((x) => x.phone === u.phone));
  return missing.length > 0 ? [...users, ...missing] : users;
}

export function seed(): Db {
  return {
    courses: seedCourses.map(withSeedLessons),
    classes: seedClasses,
    students: seedStudents,
    orders: seedOrders,
    certificates: seedCertificates,
    articles: seedArticles,
    users: seedUsers,
    sessions: [],
    comments: seedComments,
    submissions: [],
    subscribers: [],
    notifyLog: [],
    settings: { ...defaultSettings, seo: defaultSeo() },
    instructors: seedInstructors,
    videos: [],
    enrollments: seedEnrollments,
    products: seedProducts,
    preorders: [],
    audit: [],
    learningPaths: seedLearningPaths.map(normalizeLearningPath),
    tickets: [],
    courseRequests: [],
    seoEntries: [],
    seoRedirects: [],
    payments: [],
  };
}

function emptyDb(): Db {
  return {
    courses: [],
    classes: [],
    students: [],
    orders: [],
    certificates: [],
    articles: [],
    users: [],
    sessions: [],
    comments: [],
    submissions: [],
    subscribers: [],
    notifyLog: [],
    settings: { ...defaultSettings, seo: defaultSeo() },
    instructors: [],
    videos: [],
    enrollments: [],
    products: [],
    preorders: [],
    audit: [],
    learningPaths: [],
    tickets: [],
    courseRequests: [],
    seoEntries: [],
    seoRedirects: [],
    payments: [],
  };
}

/**
 * Per-process store state.
 *
 * Next bundles this module into several server chunks, so plain module-level
 * variables are NOT shared: the chunk that ran `initStore()` at boot would hold
 * the loaded data while the chunk rendering a page held an empty shell. The SQL
 * client already solves the same problem for connections (see lib/db/client.ts);
 * the document cache needs it too.
 *
 * A write-ahead log used to hide this, because every chunk re-read the same
 * file. With PostgreSQL as the single source of truth the state itself has to be
 * a real singleton.
 */
interface StoreState {
  cache: Db | null;
  ready: boolean;
  persistChain: Promise<void>;
  initPromise: Promise<void> | null;
  writeLock: Promise<void>;
  pendingWrites: Set<keyof Db>;
}

const globalStore = globalThis as unknown as { __asadzedehStore?: StoreState };

if (!globalStore.__asadzedehStore) {
  globalStore.__asadzedehStore = {
    cache: null,
    ready: false,
    persistChain: Promise.resolve(),
    initPromise: null,
    writeLock: Promise.resolve(),
    pendingWrites: new Set<keyof Db>(),
  };
}

const state = globalStore.__asadzedehStore;

export async function withStoreLock<T>(fn: () => T | Promise<T>): Promise<T> {
  let release: () => void = () => undefined;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prev = state.writeLock;
  state.writeLock = prev.then(() => wait);
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

/** Every jsonb column in the schema is named `payload`. */
const JSONB_COLUMNS = new Set(["payload"]);

function json(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Write rows to a table.
 *
 * `prune` deletes every row whose primary key is absent from `rows`. That is how
 * the admin delete buttons work for content collections, but it is only safe for
 * a single writer: two processes each holding their own in-memory array would
 * delete each other's rows on every write.
 *
 * Append-only tables — orders, payments, enrolments, certificates, audit, tickets
 * — must therefore pass `prune: false` and rely on row-level upserts only. None
 * of them is ever legitimately emptied, so nothing depends on the prune there.
 */
async function replaceTable(
  table: string,
  pk: string,
  rows: { columns: string[]; values: unknown[] }[],
  options: { prune?: boolean } = {},
) {
  const prune = options.prune ?? true;
  const sql = await getSql();
  if (rows.length === 0) {
    // With pruning off an empty array means "nothing to write", never
    // "delete the table".
    if (!prune) return;
    await sql.execute(`DELETE FROM ${table}`);
    return;
  }
  if (prune) {
    const keys = rows.map((r) => r.values[0]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");
    await sql.query(`DELETE FROM ${table} WHERE ${pk} NOT IN (${placeholders})`, keys);
  }
  for (const row of rows) {
    const cols = row.columns.join(", ");
    // jsonb columns must be bound as text and cast explicitly. Without the cast
    // the driver applies its own jsonb serializer to an already-stringified
    // value and stores `"{\"a\":1}"` instead of `{"a":1}` — reads still work
    // through JSON.parse, but no jsonb operator can see inside the value.
    const ph = row.columns
      .map((c, i) => (JSONB_COLUMNS.has(c) ? `$${i + 1}::text::jsonb` : `$${i + 1}`))
      .join(", ");
    const updates = row.columns
      .slice(1)
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(", ");
    await sql.query(
      `INSERT INTO ${table} (${cols}) VALUES (${ph}) ON CONFLICT (${pk}) DO UPDATE SET ${updates}`,
      row.values,
    );
  }
}

async function persist(db: Db, keys?: (keyof Db)[]) {
  const all = !keys || keys.length === 0;
  const has = (k: keyof Db) => all || keys!.includes(k);
  const now = new Date().toISOString();

  if (has("users")) {
    await replaceTable(
      "users",
      "id",
      db.users.map((u) => ({
        columns: ["id", "phone", "email", "password_hash", "role", "payload", "locked_until", "created_at", "updated_at"],
        values: [u.id, u.phone, u.email ?? null, u.passwordHash, u.role, json(u), u.lockedUntil ?? null, now, now],
      })),
    );
  }
  if (has("sessions")) {
    await replaceTable(
      "sessions",
      "token",
      db.sessions.map((s) => ({
        columns: ["token", "user_id", "payload", "created_at", "last_seen", "expires_at"],
        values: [s.token, s.userId, json(s), now, s.lastSeen ?? null, s.expiresAt ?? null],
      })),
    );
  }
  if (has("courses")) {
    await replaceTable(
      "courses",
      "slug",
      db.courses.map((c) => ({
        columns: ["slug", "title", "status", "price", "instructor_slug", "payload", "updated_at"],
        values: [c.slug, c.title, "published", c.price, c.instructorSlug ?? null, json(c), now],
      })),
    );
  }
  if (has("classes")) {
    await replaceTable(
      "classes",
      "slug",
      db.classes.map((c) => ({
        columns: ["slug", "title", "price", "remaining", "capacity", "instructor_slug", "payload", "updated_at"],
        values: [c.slug, c.title, c.price, c.remaining, c.capacity, c.instructorSlug ?? null, json(c), now],
      })),
    );
  }
  if (has("instructors")) {
    await replaceTable(
      "instructors",
      "slug",
      db.instructors.map((i) => ({
        columns: ["slug", "name", "user_id", "payload", "updated_at"],
        values: [i.slug, i.name, i.userId ?? null, json(i), now],
      })),
    );
  }
  if (has("articles")) {
    await replaceTable(
      "articles",
      "slug",
      db.articles.map((a) => ({
        columns: ["slug", "title", "payload", "updated_at"],
        values: [a.slug, a.title, json(a), now],
      })),
    );
  }
  if (has("learningPaths")) {
    await replaceTable(
      "learning_paths",
      "slug",
      db.learningPaths.map((p) => ({
        columns: ["slug", "title", "active", "payload", "updated_at"],
        values: [p.slug, p.title, p.active, json(p), now],
      })),
    );
  }
  if (has("videos")) {
    await replaceTable(
      "videos",
      "id",
      db.videos.map((v) => ({
        columns: ["id", "title", "status", "payload", "updated_at"],
        values: [v.id, v.title, v.status, json(v), now],
      })),
    );
  }
  if (has("products")) {
    await replaceTable(
      "products",
      "slug",
      db.products.map((p) => ({
        // reserved_stock is owned by lib/db/commerce.ts (atomic reservations) and is
        // deliberately not written here so a cache flush can never erase a hold.
        columns: ["slug", "title", "price", "stock", "sold", "allow_backorder", "kind", "active", "payload", "updated_at"],
        values: [p.slug, p.title, p.price, p.stock, p.sold ?? 0, p.allowBackorder ?? false, p.kind, p.active, json(p), now],
      })),
    );
  }
  if (has("orders") || has("payments")) {
    await replaceTable(
      "orders",
      "id",
      db.orders.map((o) => ({
        columns: ["id", "user_id", "status", "amount", "currency", "authority", "ref_id", "payload", "updated_at"],
        values: [o.id, o.userId ?? null, o.status, o.amount, CURRENCY, o.authority || null, o.refId ?? null, json(o), now],
      })),
      { prune: false },
    );
  }
  if (has("enrollments")) {
    await replaceTable(
      "enrollments",
      "id",
      db.enrollments.map((e) => ({
        columns: ["id", "user_id", "course_slug", "order_id", "payload", "created_at"],
        values: [e.id, e.userId, e.courseSlug, e.orderId ?? null, json(e), now],
      })),
      { prune: false },
    );
  }
  if (has("certificates")) {
    await replaceTable(
      "certificates",
      "code",
      db.certificates.map((c) => ({
        columns: ["code", "user_id", "student_name", "course_title", "instructor_name", "hours", "issued_at", "revoked_at", "payload"],
        values: [c.code, c.userId ?? null, c.student, c.course, c.instructorName ?? null, c.hours, c.issuedAt ?? now, c.revokedAt ?? null, json(c)],
      })),
      { prune: false },
    );
  }
  if (has("audit")) {
    await replaceTable(
      "audit_logs",
      "id",
      db.audit.map((a) => ({
        columns: ["id", "ts", "level", "action", "actor_id", "payload"],
        values: [a.id, a.ts, a.level, a.action, a.actorId ?? null, json(a)],
      })),
      { prune: false },
    );
  }
  if (has("preorders")) {
    await replaceTable(
      "preorders",
      "id",
      db.preorders.map((p) => ({
        columns: ["id", "product_slug", "user_id", "status", "payload", "updated_at"],
        values: [p.id, p.productSlug, p.userId ?? null, p.status, json(p), now],
      })),
    );
  }
  if (has("tickets")) {
    await replaceTable(
      "tickets",
      "id",
      db.tickets.map((t) => ({
        columns: ["id", "user_id", "status", "payload", "updated_at"],
        values: [t.id, t.userId ?? null, t.status, json(t), now],
      })),
      { prune: false },
    );
  }
  if (has("courseRequests")) {
    await replaceTable(
      "course_requests",
      "id",
      db.courseRequests.map((r) => ({
        columns: ["id", "instructor_user_id", "status", "payload", "updated_at"],
        values: [r.id, r.instructorUserId, r.status, json(r), now],
      })),
    );
  }
  if (has("comments")) {
    await replaceTable(
      "comments",
      "id",
      db.comments.map((c) => ({
        columns: ["id", "scope", "slug", "status", "payload", "created_at"],
        values: [c.id, c.scope, c.slug, c.status, json(c), now],
      })),
    );
  }
  if (has("submissions")) {
    await replaceTable(
      "submissions",
      "id",
      db.submissions.map((s) => ({
        columns: ["id", "user_id", "status", "payload", "created_at"],
        values: [s.id, s.userId ?? null, s.status, json(s), now],
      })),
    );
  }
  if (has("subscribers")) {
    await replaceTable(
      "subscribers",
      "email",
      db.subscribers.map((s) => ({
        columns: ["email", "payload", "created_at"],
        values: [s.email, json(s), now],
      })),
    );
  }
  if (has("notifyLog")) {
    await replaceTable(
      "notify_logs",
      "id",
      db.notifyLog.map((n) => ({
        columns: ["id", "channel", "payload", "created_at"],
        values: [n.id, n.channel, json(n), now],
      })),
    );
  }
  if (has("students")) {
    await replaceTable(
      "students",
      "phone",
      db.students.map((s) => ({
        columns: ["phone", "payload"],
        values: [s.phone, json(s)],
      })),
    );
  }
  if (has("settings")) {
    const sql = await getSql();
    await sql.query(
      `INSERT INTO site_settings (id, payload, updated_at) VALUES ('default', $1::text::jsonb, $2)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
      [json(db.settings), now],
    );
  }
  if (has("seoEntries")) {
    await replaceTable(
      "seo_entries",
      "id",
      db.seoEntries.map((e) => ({
        columns: ["id", "entity_type", "entity_id", "payload", "updated_at"],
        values: [`${e.entityType}:${e.entityId}`, e.entityType, e.entityId, json(e), now],
      })),
    );
  }
  if (has("seoRedirects")) {
    await replaceTable(
      "seo_redirects",
      "id",
      db.seoRedirects.map((r) => ({
        columns: ["id", "from_path", "to_path", "status_code", "enabled", "created_at"],
        values: [r.id, r.fromPath, r.toPath, r.statusCode, r.enabled, now],
      })),
    );
    try {
      const file = path.join(process.cwd(), "data", "seo-redirects.json");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(db.seoRedirects.filter((r) => r.enabled)), "utf-8");
    } catch {
      /* ignore */
    }
  }
  if (has("payments")) {
    await replaceTable(
      "payments",
      "id",
      db.payments.map((p) => ({
        columns: ["id", "order_id", "provider", "status", "amount", "gateway_transaction_id", "authority", "payload", "created_at", "verified_at"],
        values: [p.id, p.orderId, p.provider, p.status, p.amount, p.gatewayTransactionId || null, p.authority || null, json(p), p.createdAt, p.verifiedAt ?? null],
      })),
      { prune: false },
    );
  }
}

/**
 * Delete one row by primary key.
 *
 * Append-only tables no longer prune, so a genuine deletion has to be issued
 * explicitly instead of being inferred from "the id is missing from my array".
 */
export async function deleteStoreRow(table: string, pk: string, value: string): Promise<void> {
  const sql = await getSql();
  await sql.query(`DELETE FROM ${table} WHERE ${pk} = $1`, [value]);
}

function parsePayload<T>(row: Record<string, unknown>, fallbackKey = "payload"): T {
  const raw = row[fallbackKey];
  if (typeof raw === "string") return JSON.parse(raw) as T;
  return raw as T;
}

async function loadFromSql(): Promise<Db | null> {
  const sql = await getSql();
  const count = await sql.query<{ n: string | number }>("SELECT COUNT(*)::int AS n FROM users");
  const n = Number(count[0]?.n ?? 0);
  if (!n) return null;

  const db = emptyDb();
  const take = async <T>(table: string): Promise<T[]> => {
    const rows = await sql.query<Record<string, unknown>>(`SELECT * FROM ${table}`);
    return rows.map((r) => parsePayload<T>(r));
  };

  db.users = await take<User>("users");
  db.sessions = await take<Session>("sessions");
  db.courses = await take<OnlineCourse>("courses");
  db.classes = await take<InPersonClass>("classes");
  db.instructors = await take<Instructor>("instructors");
  db.articles = await take<Article>("articles");
  db.learningPaths = (await take<LearningPath>("learning_paths")).map(normalizeLearningPath);
  db.videos = await take<VideoAsset>("videos");
  db.products = await take<Product>("products");
  db.orders = await take<Order>("orders");
  db.enrollments = await take<Enrollment>("enrollments");
  db.certificates = await take<Certificate>("certificates");
  db.audit = (await take<AuditEntry>("audit_logs")).sort((a, b) => (a.ts < b.ts ? 1 : -1));
  db.preorders = await take<Preorder>("preorders");
  db.tickets = await take<Ticket>("tickets");
  db.courseRequests = await take<CourseRequest>("course_requests");
  db.comments = await take<Comment>("comments");
  db.submissions = await take<Submission>("submissions");
  db.subscribers = await take<Subscriber>("subscribers");
  db.notifyLog = await take<NotifyLog>("notify_logs");
  db.students = await take<Student>("students");
  db.seoEntries = await take<SeoEntry>("seo_entries");
  db.payments = await take<PaymentRecord>("payments");

  const redirects = await sql.query<SeoRedirect>(
    "SELECT id, from_path AS \"fromPath\", to_path AS \"toPath\", status_code AS \"statusCode\", enabled FROM seo_redirects",
  );
  db.seoRedirects = redirects.map((r) => ({
    id: r.id,
    fromPath: r.fromPath,
    toPath: r.toPath,
    statusCode: Number(r.statusCode) as 301 | 308,
    enabled: Boolean(r.enabled),
  }));

  const settingsRows = await sql.query<Record<string, unknown>>("SELECT payload FROM site_settings WHERE id = 'default'");
  if (settingsRows[0]) db.settings = mergeSettings(defaultSettings, parsePayload<Settings>(settingsRows[0]));
  db.users = ensureSeedUsers(db.users);
  db.settings = mergeSettings(defaultSettings, db.settings);
  db.learningPaths = db.learningPaths.map(normalizeLearningPath);
  return db;
}

function readLegacyJson(): Db | null {
  try {
    const raw = fs.readFileSync(JSON_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Db>;
    const base = seed();
    return {
      ...base,
      ...parsed,
      users: ensureSeedUsers(parsed.users ?? base.users),
      settings: mergeSettings(base.settings, parsed.settings),
      learningPaths: (parsed.learningPaths ?? base.learningPaths).map(normalizeLearningPath),
      seoEntries: parsed.seoEntries ?? [],
      seoRedirects: parsed.seoRedirects ?? [],
      payments: parsed.payments ?? [],
    };
  } catch {
    return null;
  }
}

export async function initStore(): Promise<void> {
  if (state.ready) return;
  if (state.initPromise) return state.initPromise;
  state.initPromise = (async () => {
    await runMigrations();
    let loaded = await loadFromSql();
    // Re-apply anything written while the load was in flight.
    const withPendingWrites = (base: Db): Db => {
      if (state.cache && state.pendingWrites.size > 0) {
        const merged = { ...base } as Record<string, unknown>;
        const source = state.cache as unknown as Record<string, unknown>;
        for (const key of state.pendingWrites) merged[key] = source[key];
        return merged as unknown as Db;
      }
      return base;
    };
    if (!loaded) {
      const legacy = readLegacyJson();
      loaded = legacy ?? (isProduction() ? { ...emptyDb(), settings: { ...defaultSettings, seo: defaultSeo() } } : seed());
      state.cache = withPendingWrites(loaded);
      await persist(state.cache);
      if (legacy) {
        logger.info({ event: "db.migrated_json", users: legacy.users.length, orders: legacy.orders.length });
        try {
          fs.copyFileSync(JSON_PATH, `${JSON_PATH}.migrated`);
        } catch {
          /* ignore */
        }
      } else {
        logger.info({ event: "db.seeded", production: isProduction() });
      }
    } else {
      state.cache = withPendingWrites(loaded);
      if (state.pendingWrites.size > 0) await persist(state.cache);
    }
    state.pendingWrites.clear();
    state.ready = true;
  })();
  try {
    await state.initPromise;
  } catch (error) {
    state.initPromise = null;
    throw error;
  }
}

/**
 * Collections written to before `initStore()` finished loading from SQL.
 *
 * Boot is asynchronous but a caller may legitimately write first (the dev seed
 * path, a test). Those writes must survive the load instead of being silently
 * replaced by whatever was in the database a moment earlier.
 */

/**
 * Synchronous accessor for the in-memory cache.
 *
 * Only ever seeds when there is no cache at all. Re-seeding on every read would
 * discard writes that have not been flushed yet, which is exactly the failure a
 * write-ahead log used to paper over. Boot still loads the authoritative copy
 * from PostgreSQL asynchronously; see `withPendingWrites` in `initStore()`.
 */
function ensureReady(): Db {
  if (!state.cache) {
    const legacy = readLegacyJson();
    if (legacy) {
      state.cache = {
        ...seed(),
        ...legacy,
        settings: mergeSettings(defaultSettings, legacy.settings),
        seoEntries: legacy.seoEntries ?? [],
        seoRedirects: legacy.seoRedirects ?? [],
        payments: legacy.payments ?? [],
      };
    } else if (!isProduction()) {
      state.cache = seed();
    } else {
      // Production never invents data. Serve the empty shell until the load
      // from PostgreSQL completes.
      state.cache = { ...emptyDb(), settings: { ...defaultSettings, seo: defaultSeo() } };
    }
    void initStore().catch((error) => logger.error({ event: "db.init.failed", err: String(error) }));
  }
  return state.cache;
}

function schedulePersist(keys: (keyof Db)[]) {
  if (!state.ready) for (const key of keys) state.pendingWrites.add(key);
  state.persistChain = state.persistChain
    .then(() => {
      if (!state.cache) return;
      return persist(state.cache, keys);
    })
    .catch((error) => {
      logger.error({ event: "db.persist.failed", err: String(error), keys });
    });
}

export async function flushStore(): Promise<void> {
  await initStore();
  await state.persistChain;
}

/**
 * Re-read the listed collections from SQL into the in-memory cache.
 *
 * `lib/db/commerce.ts` mutates stock/seats directly in the database so that
 * concurrency is settled by row locks rather than by an in-process mutex. This
 * pulls those authoritative values back into the document cache immediately
 * afterwards, so the cache and the relational columns can never drift apart.
 */
export async function syncCollections(keys: (keyof Db)[]): Promise<void> {
  await initStore();
  await state.persistChain;
  const sql = await getSql();
  const read = async <T>(table: string): Promise<T[]> => {
    const rows = await sql.query<Record<string, unknown>>(`SELECT payload FROM ${table}`);
    return rows.map((r) => parsePayload<T>(r));
  };
  const next: Db = { ...(state.cache ?? emptyDb()) };
  for (const key of keys) {
    switch (key) {
      case "products":
        next.products = await read<Product>("products");
        break;
      case "classes":
        next.classes = await read<InPersonClass>("classes");
        break;
      case "orders":
        next.orders = await read<Order>("orders");
        break;
      case "payments":
        next.payments = await read<PaymentRecord>("payments");
        break;
      case "enrollments":
        next.enrollments = await read<Enrollment>("enrollments");
        break;
      case "courses":
        next.courses = await read<OnlineCourse>("courses");
        break;
      case "certificates":
        next.certificates = await read<Certificate>("certificates");
        break;
      case "users":
        next.users = ensureSeedUsers(await read<User>("users"));
        break;
      case "sessions":
        next.sessions = await read<Session>("sessions");
        break;
      default:
        break;
    }
  }
  state.cache = next;
}

export function writeDb(patch: Partial<Db>): Db {
  const current = ensureReady();
  state.cache = { ...current, ...patch };
  schedulePersist(Object.keys(patch) as (keyof Db)[]);
  return state.cache;
}

export async function writeDbAsync(patch: Partial<Db>): Promise<Db> {
  const db = writeDb(patch);
  await flushStore();
  return db;
}

export function resetDb(): Db {
  if (isProduction()) {
    throw new Error("resetDb is disabled in production");
  }
  state.cache = seed();
  schedulePersist(Object.keys(state.cache) as (keyof Db)[]);
  return state.cache;
}

export function isStoreReady(): boolean {
  return state.ready;
}

function readDb(): Db {
  return ensureReady();
}

/* ---------- Courses / Classes ---------- */
export const getCourses = (): OnlineCourse[] => readDb().courses;
export const getCourse = (slug: string): OnlineCourse | undefined => readDb().courses.find((c) => c.slug === slug);
export const getClasses = (): InPersonClass[] => readDb().classes;
export const getClass = (slug: string): InPersonClass | undefined => readDb().classes.find((c) => c.slug === slug);

export const getInstructors = (): Instructor[] => readDb().instructors;
export const getInstructor = (slug: string): Instructor | undefined => readDb().instructors.find((i) => i.slug === slug);
export const getInstructorByUser = (userId: string): Instructor | undefined =>
  readDb().instructors.find((i) => i.userId === userId);

export const getStudents = (): Student[] => readDb().students;
export const getOrders = (): Order[] => readDb().orders;
export const getOrder = (id: string): Order | undefined => readDb().orders.find((o) => o.id === id);

export const getCertificates = (): Certificate[] => readDb().certificates;
export const getCertificate = (code: string): Certificate | undefined =>
  readDb().certificates.find((c) => c.code.toLowerCase() === code.toLowerCase() && !c.revokedAt);
export const getCertificatesByStudent = (student: string): Certificate[] =>
  readDb().certificates.filter((c) => c.student === student && !c.revokedAt);

export const getArticles = (): Article[] => readDb().articles;
export const getArticle = (slug: string): Article | undefined => readDb().articles.find((a) => a.slug === slug);

export const getUsers = (): User[] => readDb().users;
export const getUserByPhone = (phone: string): User | undefined => readDb().users.find((u) => u.phone === phone);
export const getUserById = (id: string): User | undefined => readDb().users.find((u) => u.id === id);
export const getSession = (token: string): Session | undefined => readDb().sessions.find((s) => s.token === token);
export const getSessions = (): Session[] => readDb().sessions;

export const getComments = (): Comment[] => readDb().comments;
export const getApprovedComments = (scope: "course" | "class", slug: string): Comment[] =>
  readDb().comments.filter((c) => c.scope === scope && c.slug === slug && c.status === "approved");
export const getSubmissions = (): Submission[] => readDb().submissions;

export const getVideos = (): VideoAsset[] => readDb().videos;
export const getVideo = (id: string): VideoAsset | undefined => readDb().videos.find((v) => v.id === id);
export const getEnrollments = (): Enrollment[] => readDb().enrollments;
export const getEnrollmentsByUser = (userId: string): Enrollment[] => readDb().enrollments.filter((e) => e.userId === userId);
export const getEnrollment = (userId: string, courseSlug: string): Enrollment | undefined =>
  readDb().enrollments.find((e) => e.userId === userId && e.courseSlug === courseSlug);

export const getProducts = (): Product[] => readDb().products;
export const getActiveProducts = (): Product[] => readDb().products.filter((p) => p.active);
export const getProduct = (slug: string): Product | undefined => readDb().products.find((p) => p.slug === slug);
export const getPreorders = (): Preorder[] => readDb().preorders;
export const getPreorder = (id: string): Preorder | undefined => readDb().preorders.find((p) => p.id === id);

export const getAudit = (): AuditEntry[] => readDb().audit;

export const getLearningPaths = (): LearningPath[] => readDb().learningPaths;
export const getLearningPath = (slug: string): LearningPath | undefined => readDb().learningPaths.find((p) => p.slug === slug);
export const getActiveLearningPaths = (): LearningPath[] => readDb().learningPaths.filter((p) => p.active);

export function getLearningPathCoursesTotal(item: LearningPath): number {
  return pathTotal(item, getCourses());
}
export function getLearningPathFinalPrice(item: LearningPath): number {
  return pathFinal(item, getCourses());
}
export function getLearningPathDiscount(item: LearningPath): number {
  return pathDiscount(item, getCourses());
}

export const getTickets = (): Ticket[] => readDb().tickets;
export const getTicket = (id: string): Ticket | undefined => readDb().tickets.find((t) => t.id === id);
export const getTicketsByUser = (userId: string): Ticket[] => readDb().tickets.filter((t) => t.userId === userId);

export const getCourseRequests = (): CourseRequest[] => readDb().courseRequests;
export const getCourseRequest = (id: string): CourseRequest | undefined => readDb().courseRequests.find((r) => r.id === id);
export const getCourseRequestsByInstructor = (instructorUserId: string): CourseRequest[] =>
  readDb().courseRequests.filter((r) => r.instructorUserId === instructorUserId);

export const getSubscribers = (): Subscriber[] => readDb().subscribers;
export const getNotifyLog = (): NotifyLog[] => readDb().notifyLog;
export const getSettings = (): Settings => readDb().settings;

export const getSeoEntries = (): SeoEntry[] => readDb().seoEntries;
export const getSeoEntry = (entityType: string, entityId: string): SeoEntry | undefined =>
  readDb().seoEntries.find((e) => e.entityType === entityType && e.entityId === entityId);
export const getSeoRedirects = (): SeoRedirect[] => readDb().seoRedirects;
export const getPayments = (): PaymentRecord[] => readDb().payments;

export function paginate<T>(items: T[], page = 1, perPage = 25): { items: T[]; page: number; perPage: number; total: number; pages: number } {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * perPage;
  return { items: items.slice(start, start + perPage), page: current, perPage, total, pages };
}
