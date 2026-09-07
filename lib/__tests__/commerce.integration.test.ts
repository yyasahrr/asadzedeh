import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Ephemeral database: never touch the developer's data/pglite directory.
// NODE_ENV is typed read-only in @types/node, so go through Object.assign.
Object.assign(process.env, {
  NODE_ENV: "test",
  PGLITE_DIR: "memory",
  APP_SECRET: "test-secret-for-ci-only-0123456789",
});

type Client = typeof import("@/lib/db/client");
type Commerce = typeof import("@/lib/db/commerce");

let client: Client;
let commerce: Commerce;
let sql: Awaited<ReturnType<Client["getSql"]>>;

async function exec<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  return sql.query<T>(text, params);
}

async function reset() {
  for (const table of [
    "order_items",
    "payments",
    "orders",
    "enrollments",
    "users",
    "classes",
    "products",
  ]) {
    await sql.execute(`DELETE FROM ${table}`);
  }
}

async function seedProduct(slug: string, stock: number, opts: { kind?: string; backorder?: boolean } = {}) {
  await exec(
    `INSERT INTO products (slug, title, price, stock, kind, active, allow_backorder, payload)
     VALUES ($1, $2, 1000, $3, $4, TRUE, $5, $6::jsonb)`,
    [
      slug,
      `Product ${slug}`,
      stock,
      opts.kind ?? "physical",
      opts.backorder ?? false,
      JSON.stringify({ slug, title: `Product ${slug}`, stock, reservedStock: 0 }),
    ],
  );
}

async function seedClass(slug: string, remaining: number, capacity = 10) {
  await exec(
    `INSERT INTO classes (slug, title, price, remaining, capacity, payload)
     VALUES ($1, $2, 2000, $3, $4, $5::jsonb)`,
    [slug, `Class ${slug}`, remaining, capacity, JSON.stringify({ slug, remaining })],
  );
}

async function seedUser(id: string, phone: string) {
  await exec(
    `INSERT INTO users (id, phone, password_hash, role, payload)
     VALUES ($1, $2, 'x', 'student', $3::jsonb)`,
    [id, phone, JSON.stringify({ id, phone, role: "student" })],
  );
}

async function seedOrder(id: string, status = "در انتظار پرداخت") {
  await exec(
    `INSERT INTO orders (id, status, amount, payload) VALUES ($1, $2, 1000, $3::jsonb)`,
    [id, status, JSON.stringify({ id, status })],
  );
}

async function seedPayment(id: string, orderId: string) {
  await exec(
    `INSERT INTO payments (id, order_id, provider, status, amount, payload)
     VALUES ($1, $2, 'zarinpal', 'pending', 1000, $3::jsonb)`,
    [id, orderId, JSON.stringify({ id, orderId, status: "pending" })],
  );
}

beforeAll(async () => {
  client = await import("@/lib/db/client");
  commerce = await import("@/lib/db/commerce");
  const { runMigrations } = await import("@/lib/db/migrate");
  sql = await client.getSql();
  await runMigrations();
});

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await client.closeDb();
});

describe("product stock reservation", () => {
  it("refuses to reserve more than is available (no oversell)", async () => {
    await seedProduct("rug", 2);

    expect(await commerce.reserveProductStock(sql, "rug", 1)).toBe(true);
    expect(await commerce.reserveProductStock(sql, "rug", 1)).toBe(true);
    // Third unit does not exist — the conditional UPDATE matches no row.
    expect(await commerce.reserveProductStock(sql, "rug", 1)).toBe(false);
    expect(await commerce.reserveProductStock(sql, "rug", 5)).toBe(false);

    const availability = await commerce.readAvailability("product", "rug");
    expect(availability).toEqual({ available: 0, stock: 2, reserved: 2 });
  });

  it("keeps stock intact while units are only reserved", async () => {
    await seedProduct("rug", 5);
    await commerce.reserveProductStock(sql, "rug", 3);

    const rows = await exec<{ stock: number; reserved_stock: number }>(
      "SELECT stock, reserved_stock FROM products WHERE slug = 'rug'",
    );
    expect(Number(rows[0].stock)).toBe(5);
    expect(Number(rows[0].reserved_stock)).toBe(3);
  });

  it("only decrements stock once, when the payment is settled", async () => {
    await seedProduct("rug", 5);
    await commerce.reserveProductStock(sql, "rug", 2);
    await commerce.settleProductStock(sql, "rug", 2);

    const rows = await exec<{ stock: number; reserved_stock: number; sold: number }>(
      "SELECT stock, reserved_stock, sold FROM products WHERE slug = 'rug'",
    );
    expect(Number(rows[0].stock)).toBe(3);
    expect(Number(rows[0].reserved_stock)).toBe(0);
    expect(Number(rows[0].sold)).toBe(2);
  });

  it("returns the hold when the order is released", async () => {
    await seedProduct("rug", 5);
    await commerce.reserveProductStock(sql, "rug", 4);
    await commerce.releaseProductReservation(sql, "rug", 4);

    const availability = await commerce.readAvailability("product", "rug");
    expect(availability?.available).toBe(5);
    expect(availability?.reserved).toBe(0);
  });

  it("lets exactly `stock` concurrent reservations win", async () => {
    await seedProduct("rug", 3);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => commerce.reserveProductStock(sql, "rug", 1)),
    );
    expect(results.filter(Boolean)).toHaveLength(3);

    const availability = await commerce.readAvailability("product", "rug");
    expect(availability?.available).toBe(0);
  });

  it("ignores the stock guard for backorder and non-physical products", async () => {
    await seedProduct("made-to-order", 0, { backorder: true });
    await seedProduct("pattern-pdf", 0, { kind: "preorder" });

    expect(await commerce.reserveProductStock(sql, "made-to-order", 4)).toBe(true);
    expect(await commerce.reserveProductStock(sql, "pattern-pdf", 1)).toBe(true);
  });

  it("refuses to reserve an inactive product", async () => {
    await seedProduct("rug", 5);
    await exec("UPDATE products SET active = FALSE WHERE slug = 'rug'");
    expect(await commerce.reserveProductStock(sql, "rug", 1)).toBe(false);
  });
});

describe("class capacity reservation", () => {
  it("hands out at most `remaining` seats", async () => {
    await seedClass("kilim-oct", 2);

    expect(await commerce.reserveClassSeat(sql, "kilim-oct")).toBe(true);
    expect(await commerce.reserveClassSeat(sql, "kilim-oct")).toBe(true);
    expect(await commerce.reserveClassSeat(sql, "kilim-oct")).toBe(false);
  });

  it("does not consume a seat until payment settles", async () => {
    await seedClass("kilim-oct", 2);
    await commerce.reserveClassSeat(sql, "kilim-oct");

    let rows = await exec<{ remaining: number; reserved_seats: number }>(
      "SELECT remaining, reserved_seats FROM classes WHERE slug = 'kilim-oct'",
    );
    expect(Number(rows[0].remaining)).toBe(2);
    expect(Number(rows[0].reserved_seats)).toBe(1);

    await commerce.settleClassSeat(sql, "kilim-oct");
    rows = await exec<{ remaining: number; reserved_seats: number }>(
      "SELECT remaining, reserved_seats FROM classes WHERE slug = 'kilim-oct'",
    );
    expect(Number(rows[0].remaining)).toBe(1);
    expect(Number(rows[0].reserved_seats)).toBe(0);
  });

  it("lets exactly `remaining` concurrent seat reservations win", async () => {
    await seedClass("kilim-oct", 4);
    const results = await Promise.all(
      Array.from({ length: 12 }, () => commerce.reserveClassSeat(sql, "kilim-oct")),
    );
    expect(results.filter(Boolean)).toHaveLength(4);
  });
});

describe("order line reservation", () => {
  it("rolls the whole reservation back when one line cannot be covered", async () => {
    await seedProduct("rug", 1);
    await seedClass("kilim-oct", 1);

    const result = await commerce.reserveOrderLines([
      { kind: "class", slug: "kilim-oct", qty: 1, title: "Class kilim-oct" },
      { kind: "product", slug: "rug", qty: 5, title: "Product rug" },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("stock");

    // The seat that was taken first inside the transaction must be back.
    const rows = await exec<{ reserved_seats: number }>(
      "SELECT reserved_seats FROM classes WHERE slug = 'kilim-oct'",
    );
    expect(Number(rows[0].reserved_seats)).toBe(0);
  });

  it("reserves every line when all of them can be covered", async () => {
    await seedProduct("rug", 4);
    await seedClass("kilim-oct", 3);

    const result = await commerce.reserveOrderLines([
      { kind: "class", slug: "kilim-oct", qty: 1, title: "Class kilim-oct" },
      { kind: "product", slug: "rug", qty: 4, title: "Product rug" },
    ]);
    expect(result.ok).toBe(true);

    expect((await commerce.readAvailability("class", "kilim-oct"))?.available).toBe(2);
    expect((await commerce.readAvailability("product", "rug"))?.available).toBe(0);
  });

  it("reports capacity as the failure reason for a full class", async () => {
    await seedClass("kilim-oct", 0);
    const result = await commerce.reserveOrderLines([
      { kind: "class", slug: "kilim-oct", qty: 1, title: "Class kilim-oct" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("capacity");
  });
});

describe("payment idempotency", () => {
  it("flips a payment to PAID exactly once", async () => {
    await seedOrder("AZ-1");
    await seedPayment("pay-1", "AZ-1");

    expect(await commerce.markPaymentPaid("pay-1", "REF-1")).toBe(true);
    // Replayed gateway callback.
    expect(await commerce.markPaymentPaid("pay-1", "REF-1")).toBe(false);
    expect(await commerce.markPaymentPaid("pay-1", "REF-OTHER")).toBe(false);

    const rows = await exec<{ status: string }>("SELECT status FROM payments WHERE id = 'pay-1'");
    expect(rows[0].status).toBe("paid");
  });

  it("rejects a second payment that reuses a gateway transaction id", async () => {
    await seedOrder("AZ-1");
    await seedPayment("pay-1", "AZ-1");
    await seedPayment("pay-2", "AZ-1");

    expect(await commerce.markPaymentPaid("pay-1", "REF-SHARED")).toBe(true);
    // UNIQUE (gateway_transaction_id) turns the replay into a no-op, not a second charge.
    expect(await commerce.markPaymentPaid("pay-2", "REF-SHARED")).toBe(false);
  });

  it("flips an order to PAID exactly once", async () => {
    await seedOrder("AZ-1");
    expect(await commerce.markOrderPaid("AZ-1", "REF-1")).toBe(true);
    expect(await commerce.markOrderPaid("AZ-1", "REF-1")).toBe(false);

    const rows = await exec<{ status: string; ref_id: string }>(
      "SELECT status, ref_id FROM orders WHERE id = 'AZ-1'",
    );
    expect(rows[0].status).toBe("پرداخت شده");
    expect(rows[0].ref_id).toBe("REF-1");
  });
});

describe("enrollment idempotency", () => {
  it("never creates a duplicate enrollment for the same student and course", async () => {
    await seedUser("u-1", "09120000001");

    expect(
      await commerce.insertEnrollmentIfAbsent("en-1", "u-1", "carpet", "AZ-1", { id: "en-1" }),
    ).toBe(true);
    expect(
      await commerce.insertEnrollmentIfAbsent("en-2", "u-1", "carpet", "AZ-1", { id: "en-2" }),
    ).toBe(false);

    const rows = await exec<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM enrollments WHERE user_id = 'u-1' AND course_slug = 'carpet'",
    );
    expect(Number(rows[0].n)).toBe(1);
  });
});

describe("order items", () => {
  it("writes lines once and updates them on a re-run", async () => {
    await seedOrder("AZ-1");
    const lines = [
      { kind: "product" as const, slug: "rug", title: "Rug", price: 1000, qty: 2 },
      { kind: "class" as const, slug: "kilim-oct", title: "Kilim", price: 2000, qty: 1 },
    ];

    await commerce.writeOrderItems("AZ-1", lines);
    await commerce.writeOrderItems("AZ-1", lines);

    const rows = await exec<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM order_items WHERE order_id = 'AZ-1'",
    );
    expect(Number(rows[0].n)).toBe(2);
  });
});
