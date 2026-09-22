import "server-only";
import crypto from "node:crypto";
import { getSql } from "./db/client";
import { effectiveSmsSettings } from "./integrations";
import { getSettings } from "./store";
import { getSmsDriver } from "./sms";
import { isNotificationEventId, NOTIFICATION_EVENTS, type NotificationEventId, type NotificationPayload } from "./notification-events";

export interface SmsTemplate { id: string; name: string; provider: string; providerTemplateId: number; description?: string; enabled: boolean; variableOrder: string[]; createdAt: string; updatedAt: string }
export interface SmsCondition { field: string; operator: "equals" | "notEquals" | "exists"; value?: string }
export interface SmsRule { id: string; eventId: NotificationEventId; templateId: string; enabled: boolean; priority: number; conditions: SmsCondition[]; recipientStrategy: "event_recipient"; createdAt: string; updatedAt: string }
export interface SmsDeliveryLog { id: string; eventId: string; eventKey: string; ruleId: string; templateId: string; provider: string; recipientMasked: string; status: "queued" | "sent" | "failed" | "skipped"; providerCode?: string; providerMessage?: string; createdAt: string; sentAt?: string }

const legacyEvents: Record<string, NotificationEventId> = { otp: "auth.login.otp.requested", orderCreated: "order.created", paymentSuccess: "payment.success", courseEnrollment: "course.enrolled", classEnrollment: "class.enrolled", orderShipped: "order.shipped", certificateReady: "certificate.ready" };
const rowTemplate = (r: Record<string, unknown>): SmsTemplate => ({ id: String(r.id), name: String(r.name), provider: String(r.provider), providerTemplateId: Number(r.provider_template_id), description: r.description ? String(r.description) : undefined, enabled: Boolean(r.enabled), variableOrder: (r.variable_order ?? []) as string[], createdAt: new Date(String(r.created_at)).toISOString(), updatedAt: new Date(String(r.updated_at)).toISOString() });
const rowRule = (r: Record<string, unknown>): SmsRule => ({ id: String(r.id), eventId: String(r.event_id) as NotificationEventId, templateId: String(r.template_id), enabled: Boolean(r.enabled), priority: Number(r.priority), conditions: (r.conditions ?? []) as SmsCondition[], recipientStrategy: "event_recipient", createdAt: new Date(String(r.created_at)).toISOString(), updatedAt: new Date(String(r.updated_at)).toISOString() });

export function maskPhone(phone: string): string { return /^09\d{9}$/.test(phone) ? `${phone.slice(0, 4)}***${phone.slice(-4)}` : "***"; }
function cleanMessage(value: unknown): string | undefined { return typeof value === "string" ? value.replace(/\b\d{4,8}\b/g, "[redacted]").slice(0, 240) : undefined; }
function id(prefix: string): string { return `${prefix}-${crypto.randomBytes(10).toString("hex")}`; }

export async function migrateLegacySmsConfiguration(): Promise<void> {
  const sql = await getSql();
  const existing = await sql.query<{ n: number }>("SELECT count(*)::int AS n FROM sms_templates");
  if (Number(existing[0]?.n) > 0) return;
  const templates = (getSettings().sms.templates ?? {}) as Record<string, { enabled: boolean; templateId: string } | undefined>;
  for (const [legacyId, eventId] of Object.entries(legacyEvents)) {
    const legacy = templates[legacyId];
    if (!legacy?.templateId || !/^\d+$/.test(legacy.templateId)) continue;
    const templateId = `legacy-${legacyId}`;
    const variables = NOTIFICATION_EVENTS[eventId].variables as readonly string[];
    await sql.transaction(async (tx) => {
      await tx.query(`INSERT INTO sms_templates (id,name,provider,provider_template_id,enabled,variable_order) VALUES ($1,$2,'melipayamak',$3,$4,$5::text::jsonb) ON CONFLICT DO NOTHING`, [templateId, NOTIFICATION_EVENTS[eventId].label, Number(legacy.templateId), legacy.enabled, JSON.stringify(variables)]);
      await tx.query(`INSERT INTO sms_rules (id,event_id,template_id,enabled,priority) VALUES ($1,$2,$3,$4,100) ON CONFLICT DO NOTHING`, [`legacy-rule-${legacyId}`, eventId, templateId, legacy.enabled]);
      if (legacyId === "otp") {
        for (const extra of ["auth.password.reset.requested", "auth.phone.change.requested"]) await tx.query(`INSERT INTO sms_rules (id,event_id,template_id,enabled,priority) VALUES ($1,$2,$3,$4,100) ON CONFLICT DO NOTHING`, [`legacy-rule-${extra}`, extra, templateId, legacy.enabled]);
      }
    });
  }
}

export async function listSmsTemplates(): Promise<SmsTemplate[]> { await migrateLegacySmsConfiguration(); return (await (await getSql()).query<Record<string, unknown>>("SELECT * FROM sms_templates ORDER BY created_at DESC")).map(rowTemplate); }
export async function listSmsRules(): Promise<SmsRule[]> { await migrateLegacySmsConfiguration(); return (await (await getSql()).query<Record<string, unknown>>("SELECT * FROM sms_rules ORDER BY event_id, priority, created_at")).map(rowRule); }
export async function listSmsDeliveryLogs(filters: { status?: string; eventId?: string; templateId?: string } = {}): Promise<SmsDeliveryLog[]> {
  const sql = await getSql(); const where: string[] = []; const values: string[] = [];
  for (const [column, value] of [["status", filters.status], ["event_id", filters.eventId], ["template_id", filters.templateId]] as const) if (value) { values.push(value); where.push(`${column} = $${values.length}`); }
  const rows = await sql.query<Record<string, unknown>>(`SELECT * FROM sms_delivery_logs ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 200`, values);
  return rows.map((r) => ({ id: String(r.id), eventId: String(r.event_id), eventKey: String(r.event_key), ruleId: String(r.rule_id), templateId: String(r.template_id), provider: String(r.provider), recipientMasked: String(r.recipient_masked), status: r.status as SmsDeliveryLog["status"], providerCode: r.provider_code ? String(r.provider_code) : undefined, providerMessage: r.provider_message ? String(r.provider_message) : undefined, createdAt: new Date(String(r.created_at)).toISOString(), sentAt: r.sent_at ? new Date(String(r.sent_at)).toISOString() : undefined }));
}

export function validateTemplateVariables(eventId: NotificationEventId, variables: string[]): boolean { const allowed = new Set<string>(NOTIFICATION_EVENTS[eventId].variables as readonly string[]); return variables.length > 0 && new Set(variables).size === variables.length && variables.every((v) => allowed.has(v)); }
function matches(conditions: SmsCondition[], payload: NotificationPayload, allowed: readonly string[]): boolean { return conditions.every((c) => allowed.includes(c.field) && (c.operator === "exists" ? payload[c.field] !== undefined && payload[c.field] !== null : c.operator === "equals" ? String(payload[c.field]) === String(c.value ?? "") : String(payload[c.field]) !== String(c.value ?? ""))); }

export async function emitNotificationEvent(request: { eventId: NotificationEventId; eventKey: string; recipient: string; payload: NotificationPayload }): Promise<{ ok: boolean; sent: number; skipped: number; matched: number }> {
  if (!isNotificationEventId(request.eventId)) return { ok: false, sent: 0, skipped: 0, matched: 0 };
  if (!/^09\d{9}$/.test(request.recipient) || !request.eventKey.trim()) return { ok: false, sent: 0, skipped: 0, matched: 0 };
  await migrateLegacySmsConfiguration();
  const sql = await getSql();
  const rows = await sql.query<Record<string, unknown>>(`SELECT r.*, t.name, t.provider, t.provider_template_id, t.enabled AS template_enabled, t.variable_order FROM sms_rules r JOIN sms_templates t ON t.id=r.template_id WHERE r.event_id=$1 AND r.enabled=TRUE ORDER BY r.priority,r.created_at`, [request.eventId]);
  const settings = effectiveSmsSettings(); const driver = getSmsDriver(settings.provider); let sent = 0; let skipped = 0; let allOk = true;
  for (const row of rows) {
    const rule = rowRule(row); const variables = row.variable_order as string[]; const allowed = NOTIFICATION_EVENTS[request.eventId].variables as readonly string[];
    if (!row.template_enabled || !matches(rule.conditions, request.payload, allowed) || !validateTemplateVariables(request.eventId, variables)) { skipped++; continue; }
    const values = variables.map((name) => request.payload[name]);
    if (values.some((v) => v === undefined || v === null || String(v).trim() === "" || String(v).length > 160)) { allOk = false; skipped++; continue; }
    const logId = id("sms");
    const claimed = await sql.query<{ id: string }>(`INSERT INTO sms_delivery_logs (id,event_id,event_key,rule_id,template_id,provider,recipient_masked,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'queued') ON CONFLICT (event_key,rule_id) DO NOTHING RETURNING id`, [logId, request.eventId, request.eventKey, rule.id, rule.templateId, String(row.provider), maskPhone(request.recipient)]);
    if (!claimed.length) { skipped++; continue; }
    if (!driver?.sendTemplate || !settings.apiKey) { await sql.query("UPDATE sms_delivery_logs SET status='failed',provider_message=$2 WHERE id=$1", [logId, "پیکربندی ارائه‌دهنده ناقص است"]); allOk = false; continue; }
    try {
      const result = await driver.sendTemplate(request.recipient, String(row.provider_template_id), values.map(String), { apiKey: settings.apiKey, secret: settings.secret, sender: settings.sender, templateId: String(row.provider_template_id) });
      await sql.query("UPDATE sms_delivery_logs SET status=$2,provider_code=$3,provider_message=$4,sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END WHERE id=$1", [logId, result.ok ? "sent" : "failed", result.providerCode ? String(result.providerCode) : null, cleanMessage(result.error) ?? null]);
      if (result.ok) sent++; else allOk = false;
    } catch (error) { allOk = false; await sql.query("UPDATE sms_delivery_logs SET status='failed',provider_message=$2 WHERE id=$1", [logId, cleanMessage(error instanceof Error ? error.message : "خطای ارتباط")]); }
  }
  return { ok: allOk, sent, skipped, matched: rows.length };
}

export async function saveSmsTemplate(input: Omit<SmsTemplate, "createdAt" | "updatedAt">): Promise<void> {
  if (!Number.isSafeInteger(input.providerTemplateId) || input.providerTemplateId <= 0 || !input.name.trim()) throw new Error("invalid-template");
  await (await getSql()).query(`INSERT INTO sms_templates (id,name,provider,provider_template_id,description,enabled,variable_order) VALUES ($1,$2,$3,$4,$5,$6,$7::text::jsonb) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,provider=EXCLUDED.provider,provider_template_id=EXCLUDED.provider_template_id,description=EXCLUDED.description,enabled=EXCLUDED.enabled,variable_order=EXCLUDED.variable_order,updated_at=now()`, [input.id || id("tpl"), input.name.trim(), input.provider, input.providerTemplateId, input.description ?? null, input.enabled, JSON.stringify(input.variableOrder)]);
}
export async function deleteSmsTemplate(idValue: string): Promise<void> { const rules = await (await getSql()).query("SELECT id FROM sms_rules WHERE template_id=$1 LIMIT 1", [idValue]); if (rules.length) throw new Error("template-in-use"); await (await getSql()).query("DELETE FROM sms_templates WHERE id=$1", [idValue]); }
export async function saveSmsRule(input: Omit<SmsRule, "createdAt" | "updatedAt">): Promise<void> { if (!isNotificationEventId(input.eventId)) throw new Error("unknown-event"); const allowed = NOTIFICATION_EVENTS[input.eventId].variables as readonly string[]; if (input.conditions.some((c) => !allowed.includes(c.field) || !["equals", "notEquals", "exists"].includes(c.operator))) throw new Error("invalid-condition"); await (await getSql()).query(`INSERT INTO sms_rules (id,event_id,template_id,enabled,priority,conditions,recipient_strategy) VALUES ($1,$2,$3,$4,$5,$6::text::jsonb,'event_recipient') ON CONFLICT(id) DO UPDATE SET event_id=EXCLUDED.event_id,template_id=EXCLUDED.template_id,enabled=EXCLUDED.enabled,priority=EXCLUDED.priority,conditions=EXCLUDED.conditions,updated_at=now()`, [input.id || id("rule"), input.eventId, input.templateId, input.enabled, input.priority, JSON.stringify(input.conditions)]); }
export async function deleteSmsRule(idValue: string): Promise<void> { await (await getSql()).query("DELETE FROM sms_rules WHERE id=$1", [idValue]); }
