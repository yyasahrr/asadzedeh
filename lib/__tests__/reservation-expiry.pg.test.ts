import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertSafeTestUrl, startTestDatabase, type TestDatabase } from "./helpers/pg";

/**
 * Reservation expiry sweep.
 *
 * Reservations are taken at checkout, before the gateway confirms anything. A
 * shopper who closes the tab never triggers the callback that would release
 * them, so those units stay unsellable forever. These tests pin the sweep that
 * reclaims them — and, more importantly, the cases where it must NOT fire, since
 * releasing a paid order's reservation would hand the same unit to two people.
 */

let db: TestDatabase;
let sql: Awaited<ReturnType<typeof import("@/lib/db/client").getSql>>;
let commerce: typeof import("@/lib/db/commerce");

beforeAll(async () => {
  db = await startTestDatabase();
  assertSafeTestUrl(db.url);

  Object.assign(process.env, { NODE_ENV: "test", DATABASE_URL: db.url, APP_SECRET: "test-secret-for-ci-only-0123456789" });

  const client = await import("@/lib/db/client");
  const { runMigrations } = await import("@/lib/db/migrate");
  sql = await client.getSql();
  expect(sql.kind).toBe("postgres");
  await runMigrations();

  commerce = await import("@/lib/db/commerce");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  for (const table of ["order_items", "orders", "products", "classes"]) {
    await sql.execute(`DELETE FROM ${table}`);
  }
  await sql.query(
    `INSERT INTO products (slug, title, kind, price, stock, reserved_stock, active, payload)
     VALUES ('loom', 'دستگاه بافت', 'physical', 1000, 5, 0, true, '{}'::jsonb)`,
  );
  await sql.query(
    `INSERT INTO classes (slug, title, price, remaining, reserved_seats, payload)
     VALUES ('dyeing', 'کارگاه رنگرزی', 2000, 4, 0, '{}'::jsonb)`,
  );
});

/** An order with real lines and a backdated creation time. */
async function placeOrder(
  id: string,
  status: string,
  ageMinutes: number,
  lines: { kind: string; slug: string; qty: number }[],
) {
  await sql.query(
    `INSERT INTO orders (id, status, amount, currency, payload, created_at, updated_at)
     VALUES ($1, $2, 1000, 'TOMAN', '{}'::jsonb, now() - make_interval(mins => $3), now())`,
    [id, status, ageMinutes],
  );
  for (const line of lines) {
    await sql.query(
      `INSERT INTO order_items (id, order_id, kind, slug, title, price, qty)
       VALUES ($1, $2, $3, $4, 'عنوان', 1000, $5)`,
      [`${id}:${line.kind}:${line.slug}`, id, line.kind, line.slug, line.qty],
    );
  }
}

const productReserved = async () =>
  Number((await sql.query<{ v: string }>("SELECT reserved_stock::text AS v FROM products WHERE slug='loom'"))[0].v);
const seatsReserved = async () =>
  Number((await sql.query<{ v: string }>("SELECT reserved_seats::text AS v FROM classes WHERE slug='dyeing'"))[0].v);

describe("releaseExpiredReservations", () => {
  it("reclaims stock and seats from an unpaid order past the TTL", async () => {
    // Hold one unit and one seat, then backdate the order past the TTL.
    await commerce.reserveOrderLines([
      { kind: "product", slug: "loom", qty: 2, title: "دستگاه بافت" },
      { kind: "class", slug: "dyeing", qty: 1, title: "کارگاه رنگرزی" },
    ]);
    expect(await productReserved()).toBe(2);
    expect(await seatsReserved()).toBe(1);

    await placeOrder("ord-1", "در انتظار پرداخت", 45, [
      { kind: "product", slug: "loom", qty: 2 },
      { kind: "class", slug: "dyeing", qty: 1 },
    ]);

    const released = await commerce.releaseExpiredReservations({ ttlMinutes: 30 });

    expect(released.map((r) => r.orderId)).toEqual(["ord-1"]);
    expect(await productReserved()).toBe(0);
    expect(await seatsReserved()).toBe(0);

    const row = await sql.query<{ released_at: string | null }>("SELECT released_at FROM orders WHERE id='ord-1'");
    expect(row[0].released_at).not.toBeNull();
  });

  it("leaves a paid order alone", async () => {
    await commerce.reserveOrderLines([{ kind: "product", slug: "loom", qty: 3, title: "دستگاه بافت" }]);
    await placeOrder("ord-paid", "پرداخت شده", 120, [{ kind: "product", slug: "loom", qty: 3 }]);

    const released = await commerce.releaseExpiredReservations({ ttlMinutes: 30 });

    expect(released).toHaveLength(0);
    expect(await productReserved()).toBe(3);
  });

  it("leaves every post-payment state alone", async () => {
    for (const [i, status] of ["در حال پردازش", "ارسال شده", "تحویل شده"].entries()) {
      await placeOrder(`ord-${i}`, status, 200, []);
    }
    const released = await commerce.releaseExpiredReservations({ ttlMinutes: 30 });
    expect(released).toHaveLength(0);
  });

  it("leaves an order that is still inside the TTL alone", async () => {
    await commerce.reserveOrderLines([{ kind: "product", slug: "loom", qty: 1, title: "دستگاه بافت" }]);
    await placeOrder("ord-fresh", "در انتظار پرداخت", 5, [{ kind: "product", slug: "loom", qty: 1 }]);

    const released = await commerce.releaseExpiredReservations({ ttlMinutes: 30 });

    expect(released).toHaveLength(0);
    expect(await productReserved()).toBe(1);
  });

  it("never releases the same order twice", async () => {
    await commerce.reserveOrderLines([{ kind: "product", slug: "loom", qty: 4, title: "دستگاه بافت" }]);
    await placeOrder("ord-1", "ناموفق", 90, [{ kind: "product", slug: "loom", qty: 4 }]);

    const first = await commerce.releaseExpiredReservations({ ttlMinutes: 30 });
    expect(first).toHaveLength(1);
    expect(await productReserved()).toBe(0);

    // A second pass must be a no-op, not a second (negative) adjustment.
    const second = await commerce.releaseExpiredReservations({ ttlMinutes: 30 });
    expect(second).toHaveLength(0);
    expect(await productReserved()).toBe(0);
  });

  it("skips an already-settled order", async () => {
    await placeOrder("ord-settled", "در انتظار پرداخت", 90, []);
    await sql.execute("UPDATE orders SET settled_at = now() WHERE id = 'ord-settled'");

    const released = await commerce.releaseExpiredReservations({ ttlMinutes: 30 });
    expect(released).toHaveLength(0);
  });

  it("runs concurrently without double-releasing", async () => {
    await commerce.reserveOrderLines([{ kind: "product", slug: "loom", qty: 5, title: "دستگاه بافت" }]);
    for (let i = 0; i < 5; i++) {
      await placeOrder(`ord-${i}`, "در انتظار پرداخت", 60, [{ kind: "product", slug: "loom", qty: 1 }]);
    }
    expect(await productReserved()).toBe(5);

    // FOR UPDATE SKIP LOCKED: the sweeps must partition the work, not repeat it.
    const results = await Promise.all(
      Array.from({ length: 4 }, () => commerce.releaseExpiredReservations({ ttlMinutes: 30 })),
    );

    const swept = results.flatMap((r) => r.map((x) => x.orderId));
    expect(new Set(swept).size).toBe(swept.length); // no order swept twice
    expect(swept.length).toBe(5); // all five eventually swept
    expect(await productReserved()).toBe(0);
  });

  it("does nothing when the TTL is not positive", async () => {
    await placeOrder("ord-1", "ناموفق", 500, []);
    expect(await commerce.releaseExpiredReservations({ ttlMinutes: 0 })).toHaveLength(0);
    expect(await commerce.releaseExpiredReservations({ ttlMinutes: -5 })).toHaveLength(0);
  });

  it("caps how many orders one pass touches", async () => {
    for (let i = 0; i < 6; i++) {
      await placeOrder(`ord-${i}`, "ناموفق", 90, []);
    }
    const first = await commerce.releaseExpiredReservations({ ttlMinutes: 30, limit: 4 });
    expect(first).toHaveLength(4);

    const second = await commerce.releaseExpiredReservations({ ttlMinutes: 30, limit: 4 });
    expect(second).toHaveLength(2);
  });
});
