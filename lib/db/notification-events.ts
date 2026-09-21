import crypto from "node:crypto";
import { getSql } from "./client";

function claimId(eventKey: string): string {
  return `sms-event-${crypto.createHash("sha256").update(eventKey).digest("hex")}`;
}

export async function claimNotificationEvent(eventKey: string, event: string, phone: string): Promise<{ claimed: boolean; id: string }> {
  const sql = await getSql();
  const id = claimId(eventKey);
  const payload = { id, date: new Date().toISOString(), channel: "sms", to: phone, message: `رویداد ${event}`, status: "در حال ارسال", eventKey };
  const rows = await sql.query<{ id: string }>(
    `INSERT INTO notify_logs (id, channel, payload) VALUES ($1, 'sms', $2::text::jsonb)
     ON CONFLICT (id) DO NOTHING RETURNING id`,
    [id, JSON.stringify(payload)],
  );
  return { claimed: rows.length === 1, id };
}

export async function finishNotificationEvent(id: string, status: string): Promise<void> {
  const sql = await getSql();
  await sql.query("UPDATE notify_logs SET payload = payload || $2::text::jsonb WHERE id = $1", [id, JSON.stringify({ status })]);
}
