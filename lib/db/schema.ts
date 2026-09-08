import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    payload: jsonb("payload").notNull(),
    lockedUntil: ts("locked_until"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_phone_idx").on(t.phone),
    uniqueIndex("users_email_idx").on(t.email),
    index("users_role_idx").on(t.role),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeen: ts("last_seen"),
    expiresAt: ts("expires_at"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const courses = pgTable(
  "courses",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    status: text("status").notNull().default("published"),
    price: integer("price").notNull(),
    instructorSlug: text("instructor_slug"),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("courses_status_idx").on(t.status), index("courses_instructor_idx").on(t.instructorSlug)],
);

export const classes = pgTable(
  "classes",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    price: integer("price").notNull(),
    remaining: integer("remaining").notNull().default(0),
    reservedSeats: integer("reserved_seats").notNull().default(0),
    capacity: integer("capacity").notNull().default(0),
    instructorSlug: text("instructor_slug"),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("classes_instructor_idx").on(t.instructorSlug)],
);

export const instructors = pgTable("instructors", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id"),
  payload: jsonb("payload").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const articles = pgTable(
  "articles",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("articles_title_idx").on(t.title)],
);

export const learningPaths = pgTable("learning_paths", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  active: boolean("active").notNull().default(true),
  payload: jsonb("payload").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const videos = pgTable("videos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    price: integer("price").notNull(),
    stock: integer("stock").notNull().default(0),
    reservedStock: integer("reserved_stock").notNull().default(0),
    allowBackorder: boolean("allow_backorder").notNull().default(false),
    sold: integer("sold").notNull().default(0),
    kind: text("kind").notNull(),
    active: boolean("active").notNull().default(true),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("products_active_idx").on(t.active), index("products_kind_idx").on(t.kind)],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    status: text("status").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("TOMAN"),
    authority: text("authority"),
    refId: text("ref_id"),
    releasedAt: ts("released_at"),
    settledAt: ts("settled_at"),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_user_status_idx").on(t.userId, t.status),
    index("orders_settled_idx").on(t.settledAt),
    uniqueIndex("orders_authority_idx").on(t.authority),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    price: integer("price").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull().references(() => orders.id),
    provider: text("provider").notNull(),
    status: text("status").notNull(),
    amount: integer("amount").notNull(),
    gatewayTransactionId: text("gateway_transaction_id"),
    authority: text("authority"),
    payload: jsonb("payload"),
    createdAt: ts("created_at").notNull().defaultNow(),
    verifiedAt: ts("verified_at"),
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    index("payments_status_idx").on(t.status),
    index("payments_created_idx").on(t.createdAt),
    uniqueIndex("payments_gateway_tx_idx").on(t.gatewayTransactionId),
    uniqueIndex("payments_authority_idx").on(t.authority),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseSlug: text("course_slug").notNull(),
    orderId: text("order_id"),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("enrollments_user_course_idx").on(t.userId, t.courseSlug),
    index("enrollments_course_idx").on(t.courseSlug),
  ],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    courseSlug: text("course_slug").notNull(),
    progress: integer("progress").notNull().default(0),
    completedAt: ts("completed_at"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] }), index("lesson_progress_course_idx").on(t.courseSlug)],
);

export const certificates = pgTable(
  "certificates",
  {
    code: text("code").primaryKey(),
    userId: text("user_id"),
    studentName: text("student_name").notNull(),
    courseTitle: text("course_title").notNull(),
    instructorName: text("instructor_name"),
    hours: integer("hours").notNull(),
    issuedAt: ts("issued_at").notNull().defaultNow(),
    revokedAt: ts("revoked_at"),
    payload: jsonb("payload").notNull(),
  },
  (t) => [index("certificates_user_idx").on(t.userId), index("certificates_user_code_idx").on(t.userId, t.code)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    ts: ts("ts").notNull().defaultNow(),
    level: text("level").notNull(),
    action: text("action").notNull(),
    actorId: text("actor_id"),
    payload: jsonb("payload").notNull(),
  },
  (t) => [index("audit_ts_idx").on(t.ts), index("audit_action_idx").on(t.action), index("audit_actor_idx").on(t.actorId)],
);

export const preorders = pgTable(
  "preorders",
  {
    id: text("id").primaryKey(),
    productSlug: text("product_slug").notNull(),
    userId: text("user_id"),
    status: text("status").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("preorders_user_idx").on(t.userId), index("preorders_status_idx").on(t.status)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    status: text("status").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("tickets_user_idx").on(t.userId), index("tickets_status_idx").on(t.status)],
);

export const courseRequests = pgTable("course_requests", {
  id: text("id").primaryKey(),
  instructorUserId: text("instructor_user_id").notNull(),
  status: text("status").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  slug: text("slug").notNull(),
  status: text("status").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  status: text("status").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  email: text("email").primaryKey(),
  payload: jsonb("payload").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const notifyLogs = pgTable("notify_logs", {
  id: text("id").primaryKey(),
  channel: text("channel").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const students = pgTable("students", {
  phone: text("phone").primaryKey(),
  payload: jsonb("payload").notNull(),
});

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("default"),
  payload: jsonb("payload").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const seoEntries = pgTable(
  "seo_entries",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").notNull(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("seo_entries_entity_idx").on(t.entityType, t.entityId),
    index("seo_entries_type_idx").on(t.entityType),
  ],
);

export const seoRedirects = pgTable("seo_redirects", {
  id: text("id").primaryKey(),
  fromPath: text("from_path").notNull(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("seo_redirects_from_idx").on(t.fromPath)]);

export const seoAudits = pgTable("seo_audits", {
  id: text("id").primaryKey(),
  summary: jsonb("summary").notNull(),
  results: jsonb("results").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const coupons = pgTable("coupons", {
  code: text("code").primaryKey(),
  percent: integer("percent"),
  amount: integer("amount"),
  active: boolean("active").notNull().default(true),
  maxUses: integer("max_uses"),
  used: integer("used").notNull().default(0),
  expiresAt: ts("expires_at"),
});

export const passwordResets = pgTable(
  "password_resets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    /** Wrong guesses against this code. Bounds brute force inside its validity window. */
    attempts: integer("attempts").notNull().default(0),
  },
  (t) => [
    index("password_resets_user_idx").on(t.userId),
    index("password_resets_lookup_idx").on(t.userId, t.usedAt, t.expiresAt),
  ],
);

/**
 * One-time login codes.
 *
 * Keyed by phone rather than user id: a code may also be the act that creates
 * the account, and issuing one must not depend on the number being registered.
 */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    purpose: text("purpose").notNull().default("login"),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    /** Wrong guesses against this code. */
    attempts: integer("attempts").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("otp_codes_lookup_idx").on(t.phone, t.usedAt, t.expiresAt),
    index("otp_codes_recent_idx").on(t.phone, t.createdAt),
  ],
);

export const kvMeta = pgTable("kv_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});
