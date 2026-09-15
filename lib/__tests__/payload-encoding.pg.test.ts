import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestDatabase, type TestDatabase } from "./helpers/pg";

/**
 * Payload columns must hold JSON *objects*, not JSON strings.
 *
 * The `postgres` driver runs its jsonb serializer on any parameter PostgreSQL
 * has typed as jsonb. Passing an already-stringified value therefore stored
 * `"{\"a\":1}"`. Reads still worked because everything went through JSON.parse,
 * but no jsonb operator could see inside the value — so `payload || $patch`,
 * `payload->'messages'` and `payload ? 'key'` all silently did nothing.
 *
 * These tests bind through the real store/commerce code paths and assert what
 * actually landed in the column.
 */

let db: TestDatabase;
let client: typeof import("@/lib/db/client");
let sql: Awaited<ReturnType<typeof import("@/lib/db/client").getSql>>;

beforeAll(async () => {
  db = await startTestDatabase();
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: db.url,
    APP_SECRET: "test-secret-for-ci-only-0123456789",
  });
  client = await import("@/lib/db/client");
  const { runMigrations } = await import("@/lib/db/migrate");
  sql = await client.getSql();
  await runMigrations();
}, 120_000);

beforeEach(async () => {
  for (const table of ["order_items", "payments", "orders", "enrollments", "tickets", "products", "users"]) {
    await sql.execute(`DELETE FROM ${table}`);
  }
}, 30_000);

afterAll(async () => {
  await client?.closeDb();
  await db?.stop();
});

const PAYLOAD_TABLES = [
  "users",
  "courses",
  "classes",
  "products",
  "orders",
  "payments",
  "enrollments",
  "tickets",
  "site_settings",
] as const;

describe("payload columns are JSON objects", () => {
  it("after the store seeds and persists", async () => {
    const store = await import("@/lib/store");
    await store.initStore();
    await store.flushStore();

    const offenders: string[] = [];
    for (const table of PAYLOAD_TABLES) {
      const rows = await sql.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM ${table} WHERE jsonb_typeof(payload) <> 'object'`,
      );
      if (Number(rows[0]?.n ?? 0) > 0) offenders.push(`${table}:${rows[0].n}`);
    }
    expect(offenders, `string-encoded payloads in ${offenders.join(", ")}`).toEqual([]);
  });

  it("after a commerce write patches a payload", async () => {
    await sql.execute(
      `INSERT INTO users (id, phone, password_hash, role, payload)
       VALUES ('u-1', '09120000001', 'x', 'student', '{"id":"u-1"}'::text::jsonb)`,
    );
    await sql.execute(
      `INSERT INTO orders (id, user_id, status, amount, payload)
       VALUES ('AZ-1', 'u-1', 'در انتظار پرداخت', 1000, '{"id":"AZ-1"}'::text::jsonb)`,
    );
    await sql.execute(
      `INSERT INTO payments (id, order_id, provider, status, amount, payload)
       VALUES ('pay-1', 'AZ-1', 'zarinpal', 'pending', 1000, '{"id":"pay-1"}'::text::jsonb)`,
    );

    const commerce = await import("@/lib/db/commerce");
    await commerce.markPaymentPaid("pay-1", "REF-1", "AUTH-1");

    const row = await sql.query<{ type: string; status: string; ref: string | null }>(
      `SELECT jsonb_typeof(payload) AS type,
              payload->>'status' AS status,
              payload->>'gatewayTransactionId' AS ref
         FROM payments WHERE id = 'pay-1'`,
    );
    expect(row[0].type).toBe("object");
    expect(row[0].status).toBe("paid");
    expect(row[0].ref).toBe("REF-1");
  });

  it("supports jsonb operators the socket layer depends on", async () => {
    // server.mjs appends chat messages with jsonb_set on payload->'messages'.
    // That only works if payload is an object.
    await sql.execute(
      `INSERT INTO tickets (id, status, payload)
       VALUES ('t-1', 'باز', '{"id":"t-1","messages":[{"id":"m1","text":"اول"}]}'::text::jsonb)`,
    );

    await sql.query(
      `UPDATE tickets
          SET payload = jsonb_set(
                payload,
                '{messages}',
                COALESCE(payload->'messages', '[]'::jsonb) || $1::text::jsonb,
                true
              )
        WHERE id = 't-2' OR id = 't-1'`,
      [JSON.stringify({ id: "m2", text: "دوم" })],
    );

    const row = await sql.query<{ messages: { id: string }[] }>(
      "SELECT payload->'messages' AS messages FROM tickets WHERE id = 't-1'",
    );
    expect(row[0].messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });
});

describe("migration 0003 repairs legacy string payloads", () => {
  it("unwraps a double-encoded payload in place", async () => {
    // Simulate a row written by the old code path.
    await sql.execute(
      `INSERT INTO tickets (id, status, payload)
       VALUES ('legacy', 'باز', to_jsonb('{"id":"legacy","messages":[]}'::text))`,
    );
    const before = await sql.query<{ t: string }>(
      "SELECT jsonb_typeof(payload) AS t FROM tickets WHERE id = 'legacy'",
    );
    expect(before[0].t).toBe("string");

    const { readFileSync } = await import("node:fs");
    const migration = readFileSync(new URL("../../drizzle/0003_payload_json_objects.sql", import.meta.url), "utf8");
    await sql.execute(migration);

    const after = await sql.query<{ t: string; id: string }>(
      "SELECT jsonb_typeof(payload) AS t, payload->>'id' AS id FROM tickets WHERE id = 'legacy'",
    );
    expect(after[0].t).toBe("object");
    expect(after[0].id).toBe("legacy");
  });
});
