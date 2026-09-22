import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSafeTestUrl, startTestDatabase, type TestDatabase } from "./helpers/pg";

let db: TestDatabase;
let client: typeof import("@/lib/db/client");
let sql: Awaited<ReturnType<typeof import("@/lib/db/client").getSql>>;
let accounts: typeof import("@/lib/admin-student-accounts");
let sms: typeof import("@/lib/sms-automation");

const user = (id: string, phone: string) => ({ id, name: id, phone, role: "student", passwordHash: "salt:00" });
async function seedUser(id: string, phone: string) {
  await sql.query("INSERT INTO users(id,phone,password_hash,role,payload) VALUES($1,$2,'salt:00','student',$3::jsonb)", [id, phone, JSON.stringify(user(id, phone))]);
}
async function seedSession(token: string, id: string) {
  await sql.query("INSERT INTO sessions(token,user_id,payload,expires_at) VALUES($1,$2,$3::jsonb,now()+interval '1 day')", [token, id, JSON.stringify({ token, userId: id })]);
}

beforeAll(async () => {
  Object.assign(process.env, { NODE_ENV: "test", APP_SECRET: "pg-integration-secret-012345678901234" });
  db = await startTestDatabase();
  assertSafeTestUrl(db.url);
  process.env.DATABASE_URL = db.url;
  client = await import("@/lib/db/client");
  await client.closeDb();
  sql = await client.getSql();
  await (await import("@/lib/db/migrate")).runMigrations();
  accounts = await import("@/lib/admin-student-accounts");
  sms = await import("@/lib/sms-automation");
}, 120_000);

beforeEach(async () => {
  for (const table of ["sms_delivery_logs", "sms_rules", "sms_templates", "lesson_progress", "certificate_requests", "enrollments", "payments", "orders", "certificates", "sessions", "users"]) await sql.execute(`DELETE FROM ${table}`);
});
afterAll(async () => { vi.unstubAllGlobals(); await client?.closeDb(); await db?.stop(); });

describe("registered-student lifecycle on PostgreSQL", () => {
  it("hard deletes only a student without retained history", async () => {
    await seedUser("delete-me", "09120000001"); await seedUser("keep-me", "09120000002"); await seedSession("s-delete", "delete-me"); await seedSession("s-keep", "keep-me");
    await sql.query("INSERT INTO enrollments(id,user_id,course_slug,payload) VALUES('e-delete','delete-me','course-x','{}')");
    await sql.query("INSERT INTO lesson_progress(user_id,lesson_id,course_slug,progress) VALUES('delete-me','l1','course-x',50)");
    expect(await accounts.deleteRegisteredStudent("delete-me")).toBe("hard_deleted");
    expect(await sql.query("SELECT id FROM users WHERE id='delete-me'")).toEqual([]);
    expect(await sql.query("SELECT token FROM sessions WHERE user_id='delete-me'")).toEqual([]);
    expect(await sql.query("SELECT id FROM enrollments WHERE user_id='delete-me'")).toEqual([]);
    expect(await sql.query("SELECT lesson_id FROM lesson_progress WHERE user_id='delete-me'")).toEqual([]);
    expect((await sql.query("SELECT id FROM users WHERE id='keep-me'")).length).toBe(1);
    expect((await sql.query("SELECT token FROM sessions WHERE user_id='keep-me'")).length).toBe(1);
    expect(await sql.query("SELECT id FROM users WHERE phone='09120000001'")).toEqual([]);
  });

  it("anonymizes retained identity while preserving financial and certificate history", async () => {
    await seedUser("history", "09120000003"); await seedUser("other", "09120000004"); await seedSession("s-history", "history");
    await sql.query("INSERT INTO orders(id,user_id,status,amount,authority,ref_id,payload) VALUES('o1','history','paid',100,'AUTH-1','REF-1','{}')");
    await sql.query("INSERT INTO payments(id,order_id,provider,status,amount,gateway_transaction_id,authority,payload) VALUES('p1','o1','zarinpal','verified',100,'GT-1','PA-1','{}')");
    await sql.query("INSERT INTO certificates(code,user_id,student_name,course_title,hours,payload) VALUES('CERT-1','history','Old','Course',1,'{}')");
    expect(await accounts.deleteRegisteredStudent("history")).toBe("anonymized");
    const [row] = await sql.query<{ phone: string; payload: { disabled: boolean } }>("SELECT phone,payload FROM users WHERE id='history'");
    expect(row.phone).toMatch(/^deleted-/); expect(accounts.normalizeIranianMobile(row.phone)).toBeNull(); expect(row.payload.disabled).toBe(true);
    expect(await sql.query("SELECT id FROM users WHERE phone='09120000003'")).toEqual([]); expect(await sql.query("SELECT token FROM sessions WHERE user_id='history'")).toEqual([]);
    expect((await sql.query("SELECT authority,ref_id FROM orders WHERE id='o1'"))[0]).toMatchObject({ authority: "AUTH-1", ref_id: "REF-1" });
    expect((await sql.query("SELECT gateway_transaction_id,authority FROM payments WHERE id='p1'"))[0]).toMatchObject({ gateway_transaction_id: "GT-1", authority: "PA-1" });
    expect((await sql.query("SELECT code FROM certificates WHERE code='CERT-1'")).length).toBe(1); expect((await sql.query("SELECT id FROM users WHERE id='other'")).length).toBe(1);
  });

  it("updates canonical and payload phone, revokes only target sessions, and rejects duplicates", async () => {
    await seedUser("target", "09120000005"); await seedUser("other", "09120000006"); await seedSession("target-session", "target"); await seedSession("other-session", "other");
    await accounts.updateStudentAccount({ id: "target", name: "Target", phone: "09120000007", enabled: true });
    const [row] = await sql.query<{ phone: string; payload: { phone: string } }>("SELECT phone,payload FROM users WHERE id='target'"); expect(row.phone).toBe("09120000007"); expect(row.payload.phone).toBe("09120000007");
    expect(await sql.query("SELECT token FROM sessions WHERE user_id='target'")).toEqual([]); expect((await sql.query("SELECT token FROM sessions WHERE user_id='other'")).length).toBe(1);
    await expect(accounts.updateStudentAccount({ id: "target", name: "Target", phone: "09120000006", enabled: true })).rejects.toThrow("duplicate-phone");
  });
});

describe("SMS persistence and dispatch on PostgreSQL", () => {
  it("migrates legacy Body IDs and enabled states into normalized bindings", async () => {
    const store = await import("@/lib/store");
    const current = store.getSettings();
    await store.writeDbAsync({ settings: { ...current, sms: { ...current.sms, templates: { ...current.sms.templates!, otp: { enabled: true, templateId: "7788" }, orderCreated: { enabled: false, templateId: "8899" } } } } });
    await sql.execute("DELETE FROM sms_rules"); await sql.execute("DELETE FROM sms_templates");
    await sms.migrateLegacySmsConfiguration();
    const templates = await sms.listSmsTemplates(); const rules = await sms.listSmsRules();
    expect(templates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "legacy-otp", providerTemplateId: 7788, enabled: true }), expect.objectContaining({ id: "legacy-orderCreated", providerTemplateId: 8899, enabled: false })]));
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventId: "auth.login.otp.requested", enabled: true }),
      expect.objectContaining({ eventId: "auth.password.reset.requested", enabled: true }),
      expect.objectContaining({ eventId: "auth.phone.change.requested", enabled: true }),
      expect.objectContaining({ eventId: "order.created", enabled: false }),
    ]));
  });

  it("persists template/rule CRUD, conditions and disabled dispatch", async () => {
    await sms.saveSmsTemplate({ id: "tpl", name: "First", provider: "melipayamak", providerTemplateId: 101, enabled: true, variableOrder: ["customerName"] });
    expect((await sms.listSmsTemplates())[0]).toMatchObject({ id: "tpl", name: "First", providerTemplateId: 101 });
    await sms.saveSmsTemplate({ id: "tpl", name: "Updated", provider: "melipayamak", providerTemplateId: 102, enabled: false, variableOrder: ["customerName"] });
    expect((await sms.listSmsTemplates())[0]).toMatchObject({ name: "Updated", enabled: false });
    await sms.saveSmsRule({ id: "rule", eventId: "course.enrolled", templateId: "tpl", enabled: false, priority: 7, conditions: [{ field: "customerName", operator: "equals", value: "Ali" }], recipientStrategy: "event_recipient" });
    expect((await sms.listSmsRules())[0]).toMatchObject({ id: "rule", priority: 7, enabled: false, conditions: [{ field: "customerName", operator: "equals", value: "Ali" }] });
    expect(await sms.emitNotificationEvent({ eventId: "course.enrolled", eventKey: "disabled", recipient: "09121111111", payload: { customerName: "Ali", courseTitle: "Course" } })).toMatchObject({ sent: 0, matched: 0 });
    await sms.deleteSmsRule("rule"); await sms.deleteSmsTemplate("tpl"); expect((await sms.listSmsTemplates()).some((template) => template.id === "tpl")).toBe(false);
  });

  it("claims one delivery for duplicate eventKey and ruleId", async () => {
    await sms.saveSmsTemplate({ id: "tpl-idem", name: "Idem", provider: "melipayamak", providerTemplateId: 123, enabled: true, variableOrder: ["customerName", "courseTitle"] });
    await sms.saveSmsRule({ id: "rule-idem", eventId: "course.enrolled", templateId: "tpl-idem", enabled: true, priority: 1, conditions: [], recipientStrategy: "event_recipient" });
    await sql.query("INSERT INTO site_settings(id,payload) VALUES('default',$1::jsonb) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload", [JSON.stringify({ sms: { provider: "melipayamak", apiKey: "x", secret: "y", sender: "", templateId: "123", templates: {} } })]);
    await Promise.all([1, 2].map(() => sms.emitNotificationEvent({ eventId: "course.enrolled", eventKey: "same-key", recipient: "09121111111", payload: { customerName: "Ali", courseTitle: "Course" } })));
    expect(Number((await sql.query<{ n: number }>("SELECT count(*)::int n FROM sms_delivery_logs WHERE event_key='same-key' AND rule_id='rule-idem'"))[0].n)).toBe(1);
  });
});
