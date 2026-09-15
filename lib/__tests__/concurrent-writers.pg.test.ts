import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertSafeTestUrl, startTestDatabase, type TestDatabase } from "./helpers/pg";

/**
 * C4 — append-only tables must not be pruned on write.
 *
 * `persist()` used to write every collection as
 *   DELETE FROM <table> WHERE <pk> NOT IN (<the rows I happen to hold>)
 * followed by one upsert per row. With a single Node process that is correct.
 * With two, each holds a stale in-memory array and every write deletes the rows
 * the other process just inserted — orders and payments silently vanish.
 *
 * These tests reproduce the two-writer case at the SQL level. The store is
 * deliberately a per-process singleton, so the point is not to build two stores
 * in one process; it is to prove that a write cannot erase rows it did not
 * supply, while content collections (where the admin delete buttons rely on the
 * prune) still do.
 */

let db: TestDatabase;
let sql: Awaited<ReturnType<typeof import("@/lib/db/client").getSql>>;
let store: typeof import("@/lib/store");

beforeAll(async () => {
  db = await startTestDatabase();
  assertSafeTestUrl(db.url);

  // Must be set before lib/db/client is imported: getEnv() caches its result.
  Object.assign(process.env, { NODE_ENV: "test", DATABASE_URL: db.url, APP_SECRET: "test-secret-for-ci-only-0123456789" });

  const client = await import("@/lib/db/client");
  const { runMigrations } = await import("@/lib/db/migrate");
  sql = await client.getSql();
  expect(sql.kind).toBe("postgres");
  await runMigrations();

  store = await import("@/lib/store");
  await store.initStore();
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  for (const table of ["orders", "certificates", "courses"]) {
    await sql.execute(`DELETE FROM ${table}`);
  }
});

// `execute` takes no parameters, so parameterised writes go through `query`.
const insertOrder = (id: string, amount: number) =>
  sql.query(
    `INSERT INTO orders (id, user_id, status, amount, currency, payload, updated_at)
     VALUES ($1, NULL, 'در انتظار پرداخت', $2, 'TOMAN', $3::text::jsonb, now())`,
    [id, amount, JSON.stringify({ id, amount, lines: [] })],
  );

describe("append-only tables survive a concurrent writer", () => {
  it("persisting one order does not delete an order another process wrote", async () => {
    // Writer B inserts an order this process has never seen.
    await insertOrder("ord-B", 5000);

    // Writer A persists a collection containing only its own order.
    store.writeDb({
      orders: [{ id: "ord-A", amount: 1000, status: "در انتظار پرداخت", lines: [], createdAt: new Date().toISOString() } as never],
    });
    await store.flushStore();

    const ids = await sql.query<{ id: string }>("SELECT id FROM orders ORDER BY id");
    expect(ids.map((r) => r.id)).toEqual(["ord-A", "ord-B"]);
  });

  it("keeps rows through repeated interleaved writes", async () => {
    await insertOrder("ord-X", 100);

    for (let i = 0; i < 5; i++) {
      store.writeDb({
        orders: [{ id: `ord-A${i}`, amount: i, status: "در انتظار پرداخت", lines: [], createdAt: new Date().toISOString() } as never],
      });
      await store.flushStore();
      // The other writer keeps adding rows this process cannot see.
      await insertOrder(`ord-X${i}`, i);
    }

    const count = await sql.query<{ n: string }>("SELECT count(*)::text AS n FROM orders");
    // 5 of ours + 1 pre-existing + 5 theirs; nothing pruned.
    expect(Number(count[0].n)).toBe(11);
  });

  it("still updates a row it does hold", async () => {
    await insertOrder("ord-U", 100);

    store.writeDb({
      orders: [{ id: "ord-U", amount: 999, status: "پرداخت شده", lines: [], createdAt: new Date().toISOString() } as never],
    });
    await store.flushStore();

    const rows = await sql.query<{ status: string; amount: string }>(
      "SELECT status, amount::text AS amount FROM orders WHERE id = 'ord-U'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("پرداخت شده");
    expect(Number(rows[0].amount)).toBe(999);
  });

  it("does not empty a table when the in-memory collection is empty", async () => {
    await insertOrder("ord-KEEP", 700);

    store.writeDb({ orders: [] });
    await store.flushStore();

    const rows = await sql.query<{ id: string }>("SELECT id FROM orders");
    expect(rows.map((r) => r.id)).toEqual(["ord-KEEP"]);
  });

  it("deletes a certificate only when asked explicitly", async () => {
    const cert = (code: string) =>
      sql.query(
        `INSERT INTO certificates (code, user_id, student_name, course_title, instructor_name, hours, issued_at, revoked_at, payload)
         VALUES ($1, NULL, 'نام دانش‌آموز', 'دوره تست', NULL, 10, now(), NULL, $2::text::jsonb)`,
        [code, JSON.stringify({ code })],
      );
    await cert("AZ-T-1");
    await cert("AZ-T-2");

    // Persisting a filtered collection no longer removes the row...
    store.writeDb({ certificates: [] });
    await store.flushStore();
    let rows = await sql.query<{ code: string }>("SELECT code FROM certificates ORDER BY code");
    expect(rows.map((r) => r.code)).toEqual(["AZ-T-1", "AZ-T-2"]);

    // ...an explicit delete does.
    await store.deleteStoreRow("certificates", "code", "AZ-T-1");
    rows = await sql.query<{ code: string }>("SELECT code FROM certificates ORDER BY code");
    expect(rows.map((r) => r.code)).toEqual(["AZ-T-2"]);
  });

  it("a full reset does clear the append-only tables explicitly", async () => {
    // resetDb() no longer relies on the prune, so it has to DELETE these itself
    // or a dev "reset demo data" would leave the old orders behind.
    await insertOrder("ord-STALE", 4242);
    let rows = await sql.query<{ id: string }>("SELECT id FROM orders WHERE id = 'ord-STALE'");
    expect(rows).toHaveLength(1);

    await store.resetDb();

    rows = await sql.query<{ id: string }>("SELECT id FROM orders WHERE id = 'ord-STALE'");
    expect(rows).toHaveLength(0);
    // And the seeded catalogue is back.
    const courses = await sql.query<{ n: string }>("SELECT count(*)::text AS n FROM courses");
    expect(Number(courses[0].n)).toBeGreaterThan(0);
  });

  it("still prunes content collections, which admin deletes depend on", async () => {
    const course = (slug: string) =>
      sql.query(
        `INSERT INTO courses (slug, title, status, price, instructor_slug, payload, created_at, updated_at)
         VALUES ($1, $2, 'published', 0, NULL, $3::text::jsonb, now(), now())`,
        [slug, `عنوان ${slug}`, JSON.stringify({ slug, title: `عنوان ${slug}`, price: 0 })],
      );
    await course("keep-me");
    await course("delete-me");

    // A content write still reflects deletions — that is how the admin
    // "delete course" button works, and courses are not append-only.
    store.writeDb({ courses: [{ slug: "keep-me", title: "عنوان keep-me", price: 0 } as never] });
    await store.flushStore();

    const rows = await sql.query<{ slug: string }>("SELECT slug FROM courses ORDER BY slug");
    expect(rows.map((r) => r.slug)).toEqual(["keep-me"]);
  });
});
