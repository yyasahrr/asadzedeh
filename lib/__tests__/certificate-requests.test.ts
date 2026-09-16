import { beforeAll, beforeEach, describe, expect, it } from "vitest";

Object.assign(process.env, {
  NODE_ENV: "test",
  PGLITE_DIR: "memory",
  APP_SECRET: "test-secret-for-ci-only-0123456789",
});

type Client = typeof import("@/lib/db/client");
type Requests = typeof import("@/lib/certificate-requests");
let client: Client;
let requests: Requests;
let sql: Awaited<ReturnType<Client["getSql"]>>;

beforeAll(async () => {
  client = await import("@/lib/db/client");
  requests = await import("@/lib/certificate-requests");
  sql = await client.getSql();
  const { runMigrations } = await import("@/lib/db/migrate");
  await runMigrations();
});

beforeEach(async () => {
  await sql.execute("DELETE FROM certificate_requests");
  await sql.execute("DELETE FROM certificates");
  await sql.execute("DELETE FROM users");
  await sql.query(
    `INSERT INTO users (id, phone, role, password_hash, payload)
     VALUES ('u-cert', '09120000000', 'student', 'hash', $1::text::jsonb)`,
    [JSON.stringify({ id: "u-cert", name: "هنرجو", phone: "09120000000", role: "student", passwordHash: "hash", createdAt: "now" })],
  );
});

describe("certificate completion requests", () => {
  it("creates one pending request and does not issue a certificate", async () => {
    const input = {
      userId: "u-cert", courseSlug: "course-one", studentName: "هنرجو", studentPhone: "09120000000",
      courseTitle: "دوره یک", instructorName: "مدرس", hours: 12, completedAt: new Date().toISOString(),
    };
    const [first, replay] = await Promise.all([
      requests.ensureCertificateRequest(input),
      requests.ensureCertificateRequest(input),
    ]);
    expect([first.created, replay.created].filter(Boolean)).toHaveLength(1);
    expect((await requests.getCertificateRequestsByUser("u-cert"))).toHaveLength(1);
    expect((await sql.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM certificates"))[0].n).toBe(0);
  });
});
