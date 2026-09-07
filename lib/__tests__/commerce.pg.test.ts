import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertSafeTestUrl, startTestDatabase, type TestDatabase } from "./helpers/pg";

/**
 * Concurrency and constraint tests against a **real PostgreSQL server**.
 *
 * PGlite cannot contend with itself, so the guarantees asserted here — exactly
 * one winner for the last unit, no negative stock, one effect per replayed
 * callback — are only meaningful against PostgreSQL with parallel connections.
 */

let db: TestDatabase;
let client: typeof import("@/lib/db/client");
let commerce: typeof import("@/lib/db/commerce");
let sql: Awaited<ReturnType<typeof import("@/lib/db/client").getSql>>;

async function exec<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  return sql.query<T>(text, params);
}

async function reset() {
  for (const table of ["order_items", "payments", "orders", "enrollments", "certificates", "audit_logs", "users", "classes", "products"]) {
    await sql.execute(`DELETE FROM ${table}`);
  }
}

beforeAll(async () => {
  db = await startTestDatabase();
  assertSafeTestUrl(db.url);

  // Must be set before lib/db/client is imported: getEnv() caches its result.
  Object.assign(process.env, { NODE_ENV: "test", DATABASE_URL: db.url, APP_SECRET: "test-secret-for-ci-only-0123456789" });

  client = await import("@/lib/db/client");
  commerce = await import("@/lib/db/commerce");
  const { runMigrations } = await import("@/lib/db/migrate");

  sql = await client.getSql();
  expect(sql.kind).toBe("postgres");
  await runMigrations();
}, 120_000);

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await client?.closeDb();
  await db?.stop();
});

async function seedProduct(slug: string, stock: number, opts: { kind?: string; backorder?: boolean } = {}) {
  await exec(
    `INSERT INTO products (slug, title, price, stock, kind, active, allow_backorder, payload)
     VALUES ($1, $2, 1000, $3, $4, TRUE, $5, $6::jsonb)`,
    [slug, `Product ${slug}`, stock, opts.kind ?? "physical", opts.backorder ?? false, JSON.stringify({ slug, stock })],
  );
}

async function seedClass(slug: string, remaining: number) {
  await exec(
    `INSERT INTO classes (slug, title, price, remaining, capacity, payload)
     VALUES ($1, $2, 2000, $3, $4, $5::jsonb)`,
    [slug, `Class ${slug}`, remaining, remaining, JSON.stringify({ slug, remaining })],
  );
}

async function seedUser(id: string) {
  await exec(
    `INSERT INTO users (id, phone, password_hash, role, payload) VALUES ($1, $2, 'x', 'student', $3::jsonb)`,
    [id, `09${id}`, JSON.stringify({ id, role: "student" })],
  );
}

async function seedOrder(id: string) {
  await exec(`INSERT INTO orders (id, status, amount, payload) VALUES ($1, 'در انتظار پرداخت', 1000, $2::jsonb)`, [
    id,
    JSON.stringify({ id }),
  ]);
}

async function seedPayment(id: string, orderId: string) {
  await exec(
    `INSERT INTO payments (id, order_id, provider, status, amount, payload) VALUES ($1, $2, 'zarinpal', 'pending', 1000, $3::jsonb)`,
    [id, orderId, JSON.stringify({ id, status: "pending" })],
  );
}

describe("real PostgreSQL: product inventory contention", () => {
  it("sells the last unit to exactly one of two simultaneous buyers", async () => {
    await seedProduct("rug", 1);

    const [a, b] = await Promise.all([
      commerce.reserveProductStock(sql, "rug", 1),
      commerce.reserveProductStock(sql, "rug", 1),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect([a, b].filter((won) => !won)).toHaveLength(1);

    const rows = await exec<{ stock: number; reserved_stock: number }>(
      "SELECT stock, reserved_stock FROM products WHERE slug = 'rug'",
    );
    expect(Number(rows[0].stock)).toBe(1);
    expect(Number(rows[0].reserved_stock)).toBe(1);
  });

  it("never lets stock go negative under 25 simultaneous buyers", async () => {
    await seedProduct("rug", 3);

    const results = await Promise.all(
      Array.from({ length: 25 }, () => commerce.reserveProductStock(sql, "rug", 1)),
    );

    expect(results.filter(Boolean)).toHaveLength(3);

    const rows = await exec<{ stock: number; reserved_stock: number }>(
      "SELECT stock, reserved_stock FROM products WHERE slug = 'rug'",
    );
    expect(Number(rows[0].reserved_stock)).toBe(3);
    expect(Number(rows[0].stock)).toBeGreaterThanOrEqual(0);
    expect((await commerce.readAvailability("product", "rug"))?.available).toBe(0);
  });

  it("the database itself rejects a negative stock value", async () => {
    await seedProduct("rug", 1);
    await expect(exec("UPDATE products SET stock = -1 WHERE slug = 'rug'")).rejects.toThrow(/check/i);
  });
});

describe("real PostgreSQL: class seat contention", () => {
  it("gives the last seat to exactly one of two simultaneous students", async () => {
    await seedClass("kilim-oct", 1);

    const [a, b] = await Promise.all([
      commerce.reserveClassSeat(sql, "kilim-oct"),
      commerce.reserveClassSeat(sql, "kilim-oct"),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);

    const rows = await exec<{ remaining: number; reserved_seats: number }>(
      "SELECT remaining, reserved_seats FROM classes WHERE slug = 'kilim-oct'",
    );
    expect(Number(rows[0].reserved_seats)).toBe(1);
    expect(Number(rows[0].remaining)).toBe(1);
  });

  it("never overbooks under 20 simultaneous bookings for 4 seats", async () => {
    await seedClass("kilim-oct", 4);

    const results = await Promise.all(
      Array.from({ length: 20 }, () => commerce.reserveClassSeat(sql, "kilim-oct")),
    );
    expect(results.filter(Boolean)).toHaveLength(4);
  });
});

describe("real PostgreSQL: duplicate payment callbacks", () => {
  it("applies the effect once when the same callback arrives five times at once", async () => {
    await seedUser("u-1");
    await seedOrder("AZ-1");
    await seedPayment("pay-1", "AZ-1");

    const flips = await Promise.all(
      Array.from({ length: 5 }, () => commerce.markPaymentPaid("pay-1", "REF-1", "AUTH-1")),
    );
    expect(flips.filter(Boolean)).toHaveLength(1);

    const orderFlips = await Promise.all(Array.from({ length: 5 }, () => commerce.markOrderPaid("AZ-1", "REF-1")));
    expect(orderFlips.filter(Boolean)).toHaveLength(1);

    const enrols = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        commerce.insertEnrollmentIfAbsent(`en-${i}`, "u-1", "carpet", "AZ-1", { id: `en-${i}` }),
      ),
    );
    expect(enrols.filter(Boolean)).toHaveLength(1);

    const counts = await exec<{ payments: number; orders: number; enrolments: number }>(
      `SELECT (SELECT COUNT(*)::int FROM payments WHERE status = 'paid')  AS payments,
              (SELECT COUNT(*)::int FROM orders  WHERE status = 'پرداخت شده') AS orders,
              (SELECT COUNT(*)::int FROM enrollments WHERE user_id = 'u-1')  AS enrolments`,
    );
    expect(counts[0]).toEqual({ payments: 1, orders: 1, enrolments: 1 });
  });

  it("rejects two payments that present the same gateway transaction reference", async () => {
    await seedOrder("AZ-1");
    await seedPayment("pay-1", "AZ-1");
    await seedPayment("pay-2", "AZ-1");

    const results = await Promise.all([
      commerce.markPaymentPaid("pay-1", "REF-SHARED"),
      commerce.markPaymentPaid("pay-2", "REF-SHARED"),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe("real PostgreSQL: schema constraints", () => {
  it("enforces every invariant the business depends on", async () => {
    await seedUser("u-1");
    await seedOrder("AZ-1");
    await seedPayment("pay-1", "AZ-1");

    await expect(
      exec(`INSERT INTO enrollments (id, user_id, course_slug, payload) VALUES ('e1','u-1','c1','{}'::jsonb), ('e2','u-1','c1','{}'::jsonb)`),
    ).rejects.toThrow(/duplicate key|unique/i);

    await exec("UPDATE payments SET gateway_transaction_id = 'REF-1' WHERE id = 'pay-1'");
    await seedPayment("pay-2", "AZ-1");
    await expect(
      exec("UPDATE payments SET gateway_transaction_id = 'REF-1' WHERE id = 'pay-2'"),
    ).rejects.toThrow(/duplicate key|unique/i);

    await expect(exec("UPDATE orders SET amount = -5 WHERE id = 'AZ-1'")).rejects.toThrow(/check/i);

    await seedClass("kilim-oct", 2);
    await expect(exec("UPDATE classes SET remaining = -1 WHERE slug = 'kilim-oct'")).rejects.toThrow(/check/i);

    await expect(
      exec("INSERT INTO seo_redirects (id, from_path, to_path, status_code) VALUES ('r1','/a','/b',302)"),
    ).rejects.toThrow(/check/i);
  });
});

describe("real PostgreSQL: transactional fulfilment", () => {
  it("fulfils payment, order, stock and enrolment together", async () => {
    await seedUser("u-1");
    await seedProduct("rug", 5);
    await seedClass("kilim-oct", 3);
    await seedOrder("AZ-1");
    await seedPayment("pay-1", "AZ-1");

    const result = await commerce.finalizePaidOrderTx({
      orderId: "AZ-1",
      paymentId: "pay-1",
      refId: "REF-1",
      authority: "AUTH-1",
      userId: "u-1",
      courseSlugs: ["carpet"],
      lines: [
        { kind: "class", slug: "kilim-oct", qty: 1, title: "Class kilim-oct" },
        { kind: "product", slug: "rug", qty: 2, title: "Product rug" },
      ],
    });

    expect(result.outcome).toBe("finalized");
    expect(result.created).toHaveLength(1);

    const state = await exec<{
      payment: string;
      order: string;
      settled: string | null;
      stock: number;
      remaining: number;
      enrolments: number;
    }>(
      `SELECT (SELECT status FROM payments WHERE id = 'pay-1')            AS payment,
              (SELECT status FROM orders  WHERE id = 'AZ-1')             AS order,
              (SELECT settled_at::text FROM orders WHERE id = 'AZ-1')    AS settled,
              (SELECT stock FROM products WHERE slug = 'rug')            AS stock,
              (SELECT remaining FROM classes WHERE slug = 'kilim-oct')   AS remaining,
              (SELECT COUNT(*)::int FROM enrollments WHERE user_id = 'u-1') AS enrolments`,
    );
    expect(state[0].payment).toBe("paid");
    expect(state[0].order).toBe("پرداخت شده");
    expect(state[0].settled).toBeTruthy();
    expect(Number(state[0].stock)).toBe(3);
    expect(Number(state[0].remaining)).toBe(2);
    expect(Number(state[0].enrolments)).toBe(1);
  });

  it("rolls EVERYTHING back when the enrolment step fails", async () => {
    await seedProduct("rug", 5);
    await seedOrder("AZ-2");
    await seedPayment("pay-2", "AZ-2");

    // u-ghost does not exist, so the enrolment INSERT violates the foreign key
    // after the payment and order have already been flipped inside the same
    // transaction. Nothing may survive.
    await expect(
      commerce.finalizePaidOrderTx({
        orderId: "AZ-2",
        paymentId: "pay-2",
        refId: "REF-2",
        userId: "u-ghost",
        courseSlugs: ["carpet"],
        lines: [{ kind: "product", slug: "rug", qty: 2, title: "Product rug" }],
      }),
    ).rejects.toThrow();

    const state = await exec<{ payment: string; order: string; settled: string | null; stock: number }>(
      `SELECT (SELECT status FROM payments WHERE id = 'pay-2')         AS payment,
              (SELECT status FROM orders  WHERE id = 'AZ-2')           AS order,
              (SELECT settled_at::text FROM orders WHERE id = 'AZ-2')  AS settled,
              (SELECT stock FROM products WHERE slug = 'rug')          AS stock`,
    );
    expect(state[0].payment).toBe("pending");
    expect(state[0].order).toBe("در انتظار پرداخت");
    expect(state[0].settled).toBeNull();
    expect(Number(state[0].stock)).toBe(5);
  });

  it("is a no-op when called twice, even in parallel", async () => {
    await seedUser("u-1");
    await seedProduct("rug", 5);
    await seedOrder("AZ-3");
    await seedPayment("pay-3", "AZ-3");

    const args: Parameters<typeof commerce.finalizePaidOrderTx>[0] = {
      orderId: "AZ-3",
      paymentId: "pay-3",
      refId: "REF-3",
      userId: "u-1",
      courseSlugs: ["carpet"],
      lines: [{ kind: "product", slug: "rug", qty: 2, title: "Product rug" }],
    };

    const results = await Promise.all([
      commerce.finalizePaidOrderTx(args),
      commerce.finalizePaidOrderTx(args),
      commerce.finalizePaidOrderTx(args),
    ]);

    expect(results.filter((r) => r.outcome === "finalized")).toHaveLength(1);
    const stock = await exec<{ stock: number }>("SELECT stock FROM products WHERE slug = 'rug'");
    expect(Number(stock[0].stock)).toBe(3);
  });

  it("never fulfils an order whose reservation was released", async () => {
    await seedUser("u-1");
    await seedProduct("rug", 5);
    await seedOrder("AZ-4");
    await exec("UPDATE orders SET released_at = now() WHERE id = 'AZ-4'");

    const result = await commerce.finalizePaidOrderTx({
      orderId: "AZ-4",
      userId: "u-1",
      courseSlugs: ["carpet"],
      lines: [{ kind: "product", slug: "rug", qty: 2, title: "Product rug" }],
    });

    expect(result.outcome).toBe("already-finalized");
    const stock = await exec<{ stock: number }>("SELECT stock FROM products WHERE slug = 'rug'");
    expect(Number(stock[0].stock)).toBe(5);
  });
});

describe("real PostgreSQL: one certificate per learner per course", () => {
  it("rejects a second certificate for the same user and course", async () => {
    await seedUser("u-1");
    const insert = (code: string) =>
      exec(
        `INSERT INTO certificates (code, user_id, student_name, course_title, hours, payload)
         VALUES ($1, 'u-1', 'سارا', 'گلیم‌بافی', 12, '{}'::jsonb)`,
        [code],
      );

    await insert("AZ-C-1");
    await expect(insert("AZ-C-2")).rejects.toThrow(/duplicate key|unique/i);
  });

  it("issues exactly one certificate under parallel completion requests", async () => {
    await seedUser("u-1");
    const results = await Promise.allSettled(
      ["AZ-C-A", "AZ-C-B", "AZ-C-C", "AZ-C-D"].map((code) =>
        exec(
          `INSERT INTO certificates (code, user_id, student_name, course_title, hours, payload)
           VALUES ($1, 'u-1', 'سارا', 'رنگرزی', 14, '{}'::jsonb)`,
          [code],
        ),
      ),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const count = await exec<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM certificates WHERE user_id = 'u-1'",
    );
    expect(Number(count[0].n)).toBe(1);
  });

  it("allows reissue after the original is revoked", async () => {
    await seedUser("u-1");
    await exec(
      `INSERT INTO certificates (code, user_id, student_name, course_title, hours, payload)
       VALUES ('AZ-C-1', 'u-1', 'سارا', 'گلیم‌بافی', 12, '{}'::jsonb)`,
    );
    await exec("UPDATE certificates SET revoked_at = now() WHERE code = 'AZ-C-1'");
    await expect(
      exec(
        `INSERT INTO certificates (code, user_id, student_name, course_title, hours, payload)
         VALUES ('AZ-C-2', 'u-1', 'سارا', 'گلیم‌بافی', 12, '{}'::jsonb)`,
      ),
    ).resolves.toBeDefined();
  });
});
