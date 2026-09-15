import { getSessionUser, can } from "@/lib/auth";
import { audit, auditActionLabels } from "@/lib/audit";
import { getAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? "" : typeof v === "string" ? v : JSON.stringify(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!can(user, "audit")) return new Response("forbidden", { status: 403 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const level = url.searchParams.get("level") ?? "";
  const action = url.searchParams.get("action") ?? "";
  const actor = url.searchParams.get("actor") ?? "";

  const rows = getAudit().filter((e) => {
    if (level && e.level !== level) return false;
    if (action && !e.action.startsWith(action)) return false;
    if (actor && e.actorId !== actor) return false;
    if (!q) return true;
    return `${e.action} ${e.actorName ?? ""} ${e.target ?? ""} ${e.ip ?? ""} ${JSON.stringify(e.detail ?? {})}`.toLowerCase().includes(q);
  });

  await audit({ action: "audit.export", level: "security", actor: { id: user!.id, name: user!.name, role: user!.role }, detail: { rows: rows.length } });

  const head = ["id", "timestamp", "level", "action", "action_label", "actor_id", "actor_name", "actor_role", "target", "ip", "user_agent", "detail", "prev", "hash"];
  const lines = [head.join(",")];
  for (const e of rows) {
    lines.push(
      [e.id, e.ts, e.level, e.action, auditActionLabels[e.action] ?? "", e.actorId, e.actorName, e.actorRole, e.target, e.ip, e.userAgent, e.detail, e.prev, e.hash]
        .map(csvCell)
        .join(",")
    );
  }
  const body = `\uFEFF${lines.join("\r\n")}`;
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
