import { getSql, type SqlExecutor } from "./client";
import { logger } from "@/lib/logger";
import { ORDER_LABEL } from "@/lib/order-status";
import type { OrderLine } from "@/lib/types";

/**
 * Commerce primitives.
 *
 * Every statement here is a *conditional* UPDATE. Concurrency safety comes from
 * the database (row locks + a WHERE clause that must still hold), not from an
 * in-process mutex — so two Node processes, or two requests in one process, can
 * race for the last unit and exactly one of them wins.
 *
 * Columns are the source of truth; the JSON `payload` column is patched in the
 * same transaction so the document cache stays consistent.
 */

const PAID_LABEL = ORDER_LABEL.PAID;

export type ReservationLine = Pick<OrderLine, "kind" | "slug" | "qty" | "title">;

export type ReservationResult =
  | { ok: true }
  | { ok: false; reason: "stock" | "capacity" | "missing"; slug: string; title?: string };

async function patch(
  exec: SqlExecutor,
  table: string,
  pk: string,
  key: string,
  fields: Record<string, unknown>,
) {
  await exec.query(`UPDATE ${table} SET payload = payload || $2::jsonb WHERE ${pk} = $1`, [
    key,
    JSON.stringify(fields),
  ]);
}

/* ------------------------------------------------------------------ products */

/** Hold `qty` units. Fails (0 rows) when available stock cannot cover the request. */
export async function reserveProductStock(
  exec: SqlExecutor,
  slug: string,
  qty: number,
): Promise<boolean> {
  if (qty <= 0) return true;
  const rows = await exec.query<{ reserved_stock: number }>(
    `UPDATE products
        SET reserved_stock = reserved_stock + $2,
            updated_at = now()
      WHERE slug = $1
        AND active
        AND (kind <> 'physical' OR allow_backorder OR (stock - reserved_stock) >= $2)
      RETURNING reserved_stock`,
    [slug, qty],
  );
  if (rows.length === 0) return false;
  await patch(exec, "products", "slug", slug, { reservedStock: Number(rows[0].reserved_stock) });
  return true;
}

/** Give a reservation back (failed, cancelled or abandoned payment). */
export async function releaseProductReservation(
  exec: SqlExecutor,
  slug: string,
  qty: number,
): Promise<void> {
  if (qty <= 0) return;
  const rows = await exec.query<{ reserved_stock: number }>(
    `UPDATE products
        SET reserved_stock = GREATEST(0, reserved_stock - $2),
            updated_at = now()
      WHERE slug = $1
      RETURNING reserved_stock`,
    [slug, qty],
  );
  if (rows[0]) {
    await patch(exec, "products", "slug", slug, {
      reservedStock: Number(rows[0].reserved_stock),
    });
  }
}

/** Verified payment: turn the reservation into a real stock decrement. */
export async function settleProductStock(
  exec: SqlExecutor,
  slug: string,
  qty: number,
): Promise<void> {
  if (qty <= 0) return;
  const rows = await exec.query<{ stock: number; reserved_stock: number; sold: number }>(
    `UPDATE products
        SET stock = CASE WHEN kind <> 'physical' OR allow_backorder
                         THEN stock
                         ELSE GREATEST(0, stock - $2) END,
            reserved_stock = GREATEST(0, reserved_stock - $2),
            sold = sold + $2,
            updated_at = now()
      WHERE slug = $1
      RETURNING stock, reserved_stock, sold`,
    [slug, qty],
  );
  if (rows[0]) {
    await patch(exec, "products", "slug", slug, {
      stock: Number(rows[0].stock),
      reservedStock: Number(rows[0].reserved_stock),
      sold: Number(rows[0].sold),
    });
  }
}

/* ------------------------------------------------------------------- classes */

export async function reserveClassSeat(exec: SqlExecutor, slug: string): Promise<boolean> {
  const rows = await exec.query<{ reserved_seats: number }>(
    `UPDATE classes
        SET reserved_seats = reserved_seats + 1,
            updated_at = now()
      WHERE slug = $1
        AND (remaining - reserved_seats) > 0
      RETURNING reserved_seats`,
    [slug],
  );
  if (rows.length === 0) return false;
  await patch(exec, "classes", "slug", slug, { reservedSeats: Number(rows[0].reserved_seats) });
  return true;
}

export async function releaseClassSeat(exec: SqlExecutor, slug: string): Promise<void> {
  const rows = await exec.query<{ reserved_seats: number }>(
    `UPDATE classes
        SET reserved_seats = GREATEST(0, reserved_seats - 1),
            updated_at = now()
      WHERE slug = $1 AND reserved_seats > 0
      RETURNING reserved_seats`,
    [slug],
  );
  if (rows[0]) {
    await patch(exec, "classes", "slug", slug, { reservedSeats: Number(rows[0].reserved_seats) });
  }
}

export async function settleClassSeat(exec: SqlExecutor, slug: string): Promise<void> {
  const rows = await exec.query<{ remaining: number; reserved_seats: number }>(
    `UPDATE classes
        SET remaining = GREATEST(0, remaining - 1),
            reserved_seats = GREATEST(0, reserved_seats - 1),
            updated_at = now()
      WHERE slug = $1
      RETURNING remaining, reserved_seats`,
    [slug],
  );
  if (rows[0]) {
    await patch(exec, "classes", "slug", slug, {
      remaining: Number(rows[0].remaining),
      reservedSeats: Number(rows[0].reserved_seats),
    });
  }
}

/* ------------------------------------------------------- order line wrappers */

/** Merge duplicate product lines so one slug is reserved once with the total quantity. */
function reservableProducts(lines: ReservationLine[]): { slug: string; qty: number }[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (line.kind !== "product") continue;
    merged.set(line.slug, (merged.get(line.slug) ?? 0) + Math.max(1, line.qty));
  }
  return [...merged].map(([slug, qty]) => ({ slug, qty }));
}

/** Thrown inside the transaction so a partially-reserved order rolls back. */
class ReservationRejected extends Error {
  constructor(
    readonly reason: "stock" | "capacity" | "missing",
    readonly slug: string,
    readonly title?: string,
  ) {
    super(`reservation rejected: ${reason} ${slug}`);
  }
}

/**
 * Reserve every seat/unit an order needs, atomically.
 * All-or-nothing: a line that cannot be covered throws, which rolls the whole
 * transaction back — no half-reserved order can survive.
 */
export async function reserveOrderLines(
  lines: ReservationLine[],
): Promise<ReservationResult> {
  const sql = await getSql();
  const wanted = reservableProducts(lines);
  const hasSeats = lines.some((line) => line.kind === "class");
  if (wanted.length === 0 && !hasSeats) return { ok: true };
  try {
    return await sql.transaction(async (tx) => {
      for (const line of lines) {
        if (line.kind !== "class") continue;
        const taken = await reserveClassSeat(tx, line.slug);
        if (!taken) throw new ReservationRejected("capacity", line.slug, line.title);
      }
      for (const { slug, qty } of wanted) {
        const productLine = lines.find((l) => l.kind === "product" && l.slug === slug);
        if (!productLine) continue;
        const taken = await reserveProductStock(tx, slug, qty);
        if (!taken) throw new ReservationRejected("stock", slug, productLine.title);
      }
      return { ok: true as const };
    });
  } catch (error) {
    if (error instanceof ReservationRejected) {
      return { ok: false, reason: error.reason, slug: error.slug, title: error.title };
    }
    logger.error({
      event: "commerce.reserve.failed",
      err: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: "missing", slug: wanted[0]?.slug ?? "" };
  }
}

/** Payment failed / order cancelled: hand the reservation back exactly once. */
export async function releaseOrderLines(lines: ReservationLine[]): Promise<void> {
  const sql = await getSql();
  const wanted = reservableProducts(lines);
  await sql.transaction(async (tx) => {
    for (const line of lines) {
      if (line.kind === "class") await releaseClassSeat(tx, line.slug);
    }
    for (const { slug, qty } of wanted) {
      if (!lines.some((l) => l.kind === "product" && l.slug === slug)) continue;
      await releaseProductReservation(tx, slug, qty);
    }
  });
}

/** Payment verified: convert reservations into real decrements. */
export async function settleOrderLines(lines: ReservationLine[]): Promise<void> {
  const sql = await getSql();
  const wanted = reservableProducts(lines);
  await sql.transaction(async (tx) => {
    for (const line of lines) {
      if (line.kind === "class") await settleClassSeat(tx, line.slug);
    }
    for (const { slug, qty } of wanted) {
      if (!lines.some((l) => l.kind === "product" && l.slug === slug)) continue;
      await settleProductStock(tx, slug, qty);
    }
  });
}


/* ------------------------------------------------- transactional fulfilment */

export interface FinalizeArgs {
  orderId: string;
  paymentId?: string;
  /** Gateway reference (Zarinpal ref_id). Unique across payments. */
  refId?: string;
  authority?: string;
  lines: ReservationLine[];
  userId?: string | null;
  /** Course slugs to enrol the buyer in (already resolved from lines/paths). */
  courseSlugs?: string[];
  /** Called for each enrolment row this transaction actually created. */
  newEnrollmentId?: (courseSlug: string) => string;
  today?: string;
}

export type FinalizeOutcome = "finalized" | "already-finalized" | "not-found";

export interface FinalizeResult {
  outcome: FinalizeOutcome;
  /** Enrolment rows created by this transaction (empty on a replay). */
  created: { id: string; courseSlug: string }[];
}

/**
 * Everything that must happen when a payment is verified, in ONE transaction:
 *
 *   lock the order row  →  payment PAID  →  order PAID  →  settle stock/seats
 *   →  create enrolments  →  mark the order settled
 *
 * Any failure rolls all of it back, so "payment PAID but enrolment missing" and
 * "payment PAID but stock not decremented" are both unreachable.
 *
 * The order row is locked with `SELECT … FOR UPDATE` so two concurrent callbacks
 * for the same order serialise instead of interleaving.
 *
 * Deliberately *not* inside the transaction: SMS delivery, `revalidatePath`,
 * SpotPlayer licence creation and the hash-chained audit entry. Those are
 * external or append-only side effects that must not roll business state back,
 * and each is independently idempotent or safe to retry.
 */
export async function finalizePaidOrderTx(args: FinalizeArgs): Promise<FinalizeResult> {
  const sql = await getSql();
  const paidLabel = PAID_LABEL;

  return sql.transaction(async (tx) => {
    const locked = await tx.query<{ id: string; status: string; settled_at: string | null; released_at: string | null }>(
      "SELECT id, status, settled_at, released_at FROM orders WHERE id = $1 FOR UPDATE",
      [args.orderId],
    );
    if (locked.length === 0) return { outcome: "not-found" as const, created: [] };
    // `settled_at` is the fulfilment marker, not `status`: an order can legitimately
    // already read PAID (demo gateway) and still need its stock and enrolments.
    // A released order is terminal and must never be fulfilled.
    if (locked[0].settled_at || locked[0].released_at) {
      return { outcome: "already-finalized" as const, created: [] };
    }

    if (args.paymentId) {
      const verifiedAt = new Date().toISOString();
      await tx.query(
        `UPDATE payments
            SET status = 'paid',
                gateway_transaction_id = COALESCE($2, gateway_transaction_id),
                authority = COALESCE($3, authority),
                verified_at = $4,
                payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb
          WHERE id = $1`,
        [
          args.paymentId,
          args.refId ?? null,
          args.authority ?? null,
          verifiedAt,
          JSON.stringify({ status: "paid", gatewayTransactionId: args.refId ?? null, verifiedAt }),
        ],
      );
    }

    await tx.query(
      `UPDATE orders
          SET status = $2, ref_id = COALESCE($3, ref_id), updated_at = now(),
              payload = payload || $4::jsonb
        WHERE id = $1`,
      [args.orderId, paidLabel, args.refId ?? null, JSON.stringify({ status: paidLabel, refId: args.refId ?? null })],
    );

    // Inventory and seats: reservation → real decrement.
    for (const line of args.lines) {
      if (line.kind === "class") await settleClassSeat(tx, line.slug);
    }
    for (const { slug, qty } of reservableProducts(args.lines)) {
      await settleProductStock(tx, slug, qty);
    }

    const created: { id: string; courseSlug: string }[] = [];
    for (const courseSlug of args.courseSlugs ?? []) {
      if (!args.userId) break;
      const id = args.newEnrollmentId ? args.newEnrollmentId(courseSlug) : `en-${courseSlug}-${args.orderId}`;
      const payload = {
        id,
        userId: args.userId,
        courseSlug,
        orderId: args.orderId,
        createdAt: args.today ?? new Date().toISOString(),
        completed: [],
      };
      const inserted = await tx.query<{ id: string }>(
        `INSERT INTO enrollments (id, user_id, course_slug, order_id, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (user_id, course_slug) DO NOTHING
         RETURNING id`,
        [id, args.userId, courseSlug, args.orderId, JSON.stringify(payload)],
      );
      if (inserted.length > 0) created.push({ id, courseSlug });
    }

    const settledAt = new Date().toISOString();
    await tx.query(
      `UPDATE orders
          SET settled_at = $2, released_at = NULL, updated_at = now(),
              payload = payload || $3::jsonb
        WHERE id = $1`,
      [args.orderId, settledAt, JSON.stringify({ settledAt })],
    );

    return { outcome: "finalized" as const, created };
  });
}

/* --------------------------------------------------- payments / orders / ACL */

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "23505";
}

/**
 * Move a payment to PAID.
 * Returns false when the payment was already PAID, or when the gateway
 * transaction id was already recorded by another callback — both mean
 * "this callback is a replay, do nothing".
 */
export async function markPaymentPaid(
  paymentId: string,
  gatewayTransactionId: string | undefined,
  authority?: string,
): Promise<boolean> {
  const sql = await getSql();
  const verifiedAt = new Date().toISOString();
  try {
    const rows = await sql.query<{ id: string }>(
      `UPDATE payments
          SET status = 'paid',
              gateway_transaction_id = COALESCE($2, gateway_transaction_id),
              authority = COALESCE($3, authority),
              verified_at = $4,
              payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb
        WHERE id = $1 AND status <> 'paid'
        RETURNING id`,
      [
        paymentId,
        gatewayTransactionId ?? null,
        authority ?? null,
        verifiedAt,
        JSON.stringify({
          status: "paid",
          gatewayTransactionId: gatewayTransactionId ?? null,
          verifiedAt,
        }),
      ],
    );
    return rows.length > 0;
  } catch (error) {
    if (isUniqueViolation(error)) {
      logger.warn({ event: "payment.replay", paymentId, gatewayTransactionId });
      return false;
    }
    throw error;
  }
}

/** Move an order to PAID. Returns false when it was already paid. */
export async function markOrderPaid(orderId: string, refId?: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `UPDATE orders
        SET status = $2,
            ref_id = COALESCE($3, ref_id),
            updated_at = now(),
            payload = payload || $4::jsonb
      WHERE id = $1 AND status <> $2
      RETURNING id`,
    [orderId, PAID_LABEL, refId ?? null, JSON.stringify({ status: PAID_LABEL, refId: refId ?? null })],
  );
  return rows.length > 0;
}

/** Insert an enrollment unless the student already has one for that course. */
export async function insertEnrollmentIfAbsent(
  id: string,
  userId: string,
  courseSlug: string,
  orderId: string | null,
  payload: unknown,
): Promise<boolean> {
  const sql = await getSql();
  try {
    const rows = await sql.query<{ id: string }>(
      `INSERT INTO enrollments (id, user_id, course_slug, order_id, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (user_id, course_slug) DO NOTHING
       RETURNING id`,
      [id, userId, courseSlug, orderId, JSON.stringify(payload)],
    );
    return rows.length > 0;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

/** Normalised order lines for the relational `order_items` table. */
export async function writeOrderItems(orderId: string, lines: OrderLine[]): Promise<void> {
  if (lines.length === 0) return;
  const sql = await getSql();
  await sql.transaction(async (tx) => {
    for (const line of lines) {
      await tx.query(
        `INSERT INTO order_items (id, order_id, kind, slug, title, price, qty)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, qty = EXCLUDED.qty`,
        [
          `${orderId}:${line.kind}:${line.slug}`,
          orderId,
          line.kind,
          line.slug,
          line.title,
          line.price,
          line.qty,
        ],
      );
    }
  });
}

/** Stock/seats a caller can still sell right now, read straight from the database. */
export async function readAvailability(
  kind: "product" | "class",
  slug: string,
): Promise<{ available: number; stock: number; reserved: number } | null> {
  const sql = await getSql();
  if (kind === "product") {
    const rows = await sql.query<{ stock: number; reserved_stock: number; kind: string; allow_backorder: boolean }>(
      "SELECT stock, reserved_stock, kind, allow_backorder FROM products WHERE slug = $1",
      [slug],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    const unlimited = r.kind !== "physical" || r.allow_backorder;
    const stock = Number(r.stock);
    const reserved = Number(r.reserved_stock);
    return { available: unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, stock - reserved), stock, reserved };
  }
  const rows = await sql.query<{ remaining: number; reserved_seats: number }>(
    "SELECT remaining, reserved_seats FROM classes WHERE slug = $1",
    [slug],
  );
  if (!rows[0]) return null;
  return {
    available: Math.max(0, Number(rows[0].remaining) - Number(rows[0].reserved_seats)),
    stock: Number(rows[0].remaining),
    reserved: Number(rows[0].reserved_seats),
  };
}

/* ------------------------------------------------------------- certificates */

/**
 * Issue a certificate, or do nothing if this learner already holds one for the
 * course.
 *
 * Concurrency-safe by construction: the partial unique index
 * `certificates_user_course_active_idx` (one active certificate per
 * learner+course) rejects the loser, and `ON CONFLICT DO NOTHING` turns that
 * rejection into a clean no-op instead of an exception.
 *
 * Returns true only for the row this call actually inserted.
 */
export async function insertCertificateIfAbsent(certificate: {
  code: string;
  userId?: string | null;
  student: string;
  course: string;
  instructorName?: string | null;
  hours: number;
  issuedAt?: string;
  payload?: unknown;
}): Promise<boolean> {
  const sql = await getSql();
  const issuedAt = certificate.issuedAt ?? new Date().toISOString();
  try {
    const inserted = await sql.query<{ code: string }>(
      `INSERT INTO certificates
         (code, user_id, student_name, course_title, instructor_name, hours, issued_at, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT (user_id, course_title) WHERE revoked_at IS NULL DO NOTHING
       RETURNING code`,
      [
        certificate.code,
        certificate.userId ?? null,
        certificate.student,
        certificate.course,
        certificate.instructorName ?? null,
        certificate.hours,
        issuedAt,
        JSON.stringify(certificate.payload ?? certificate),
      ],
    );
    return inserted.length > 0;
  } catch (error) {
    // A second completion request that raced to the same moment: the index has
    // already recorded a certificate, so this is a no-op rather than a failure.
    if ((error as { code?: string } | null)?.code === "23505") return false;
    throw error;
  }
}
