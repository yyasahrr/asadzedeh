import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Download, Link2, ShieldAlert, ShieldCheck } from "lucide-react";
import { getAudit } from "@/lib/store";
import { getSessionUser, can, roleLabels } from "@/lib/auth";
import { auditActionLabels, auditLevelLabels, verifyChain } from "@/lib/audit";
import { toFa } from "@/lib/format";
import { Denied } from "@/components/admin/Denied";
import { TableShell, Td } from "@/components/admin/TableShell";
import { cn } from "@/lib/utils";
import type { AuditLevel } from "@/lib/types";

export const metadata: Metadata = { title: "لاگ سیستم" };

const levelTone: Record<AuditLevel, string> = {
  info: "bg-navy-50 text-navy-800 ring-navy-800/15",
  warn: "bg-ochre-100/70 text-ochre-700 ring-ochre-600/30",
  error: "bg-madder-50 text-madder-700 ring-madder-700/25",
  security: "bg-teal-50 text-teal-800 ring-teal-600/25",
};

const PAGE = 50;

function countSince(entries: { ts: string }[], ms: number) {
  const threshold = Date.now() - ms;
  return entries.filter((e) => Date.parse(e.ts) > threshold).length;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; action?: string; page?: string; actor?: string }>;
}) {
  const user = await getSessionUser();
  if (!can(user, "audit")) return <Denied />;
  const { q = "", level = "", action = "", page = "1", actor = "" } = await searchParams;
  const all = getAudit();
  const chain = verifyChain(all);

  const needle = q.trim().toLowerCase();
  const filtered = all.filter((e) => {
    if (level && e.level !== level) return false;
    if (action && !e.action.startsWith(action)) return false;
    if (actor && e.actorId !== actor) return false;
    if (!needle) return true;
    const hay = `${e.action} ${auditActionLabels[e.action] ?? ""} ${e.actorName ?? ""} ${e.target ?? ""} ${e.ip ?? ""} ${JSON.stringify(e.detail ?? {})}`.toLowerCase();
    return hay.includes(needle);
  });

  const pageNum = Math.max(1, Number(page) || 1);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice((pageNum - 1) * PAGE, pageNum * PAGE);

  const groups = Array.from(new Set(all.map((e) => e.action.split(".")[0]))).sort();
  const counts = {
    total: all.length,
    security: all.filter((e) => e.level === "security").length,
    errors: all.filter((e) => e.level === "error").length,
    today: countSince(all, 864e5),
  };

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ q, level, action, actor, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/audit?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-navy-900">لاگ سیستم</h1>
        <a
          href={`/api/admin/audit/export?${new URLSearchParams({ q, level, action, actor }).toString()}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-bold text-white transition-colors hover:bg-navy-700"
        >
          <Download className="h-4 w-4" />
          خروجی CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "کل رویدادها", value: toFa(counts.total), icon: Activity },
          { label: "رویداد امنیتی", value: toFa(counts.security), icon: ShieldCheck },
          { label: "خطاها", value: toFa(counts.errors), icon: ShieldAlert },
          { label: "۲۴ ساعت اخیر", value: toFa(counts.today), icon: Activity },
        ].map((k) => (
          <div key={k.label} className="bento-surface flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-white"><k.icon className="h-5 w-5" /></span>
            <span>
              <span className="block text-xs font-bold text-ink-500">{k.label}</span>
              <span className="block text-xl font-black text-navy-900">{k.value}</span>
            </span>
          </div>
        ))}
      </div>

      <p className={cn("flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold ring-1 ring-inset", chain.ok ? "bg-teal-50 text-teal-800 ring-teal-600/25" : "bg-madder-50 text-madder-700 ring-madder-700/25")}>
        <Link2 className="h-4 w-4" />
        {chain.ok
          ? `زنجیره هش سالم است (${toFa(chain.checked)} رویداد بررسی شد) — لاگ دست‌کاری نشده.`
          : `هشدار: زنجیره هش از رویداد ${chain.brokenAt} شکسته است؛ احتمال دست‌کاری فایل لاگ.`}
      </p>

      <form className="grid gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-ink-900/5 sm:grid-cols-[1fr_160px_180px_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="جست‌وجو (کاربر، IP، هدف، جزئیات…)" className="h-10 rounded-xl border border-ink-900/10 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none" />
        <select name="level" defaultValue={level} className="h-10 cursor-pointer rounded-xl border border-ink-900/10 bg-white px-3 text-sm">
          <option value="">همه سطوح</option>
          {(Object.keys(auditLevelLabels) as AuditLevel[]).map((l) => <option key={l} value={l}>{auditLevelLabels[l]}</option>)}
        </select>
        <select name="action" defaultValue={action} className="h-10 cursor-pointer rounded-xl border border-ink-900/10 bg-white px-3 text-sm">
          <option value="">همه بخش‌ها</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button type="submit" className="h-10 cursor-pointer rounded-xl bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700">فیلتر</button>
        {actor && <input type="hidden" name="actor" value={actor} />}
      </form>

      {actor && (
        <p className="text-sm text-ink-600">
          فیلتر روی کاربر <strong>{filtered[0]?.actorName ?? actor}</strong> — <Link href={link({ actor: "" })} className="font-bold text-teal-700">حذف فیلتر</Link>
        </p>
      )}

      <TableShell head={["زمان", "سطح", "رویداد", "کاربر", "هدف", "IP", "جزئیات"]}>
        {slice.map((e) => (
          <tr key={e.id} className="align-top transition-colors hover:bg-sand-50">
            <Td className="whitespace-nowrap text-xs text-ink-600">
              <span dir="ltr">{new Date(e.ts).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "medium" })}</span>
            </Td>
            <Td><span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset", levelTone[e.level])}>{auditLevelLabels[e.level]}</span></Td>
            <Td>
              <span className="block text-sm font-bold text-navy-900">{auditActionLabels[e.action] ?? e.action}</span>
              <span className="block text-[11px] text-ink-400" dir="ltr">{e.action}</span>
            </Td>
            <Td className="text-sm">
              {e.actorId ? (
                <Link href={link({ actor: e.actorId })} className="font-semibold text-navy-800 hover:underline">{e.actorName ?? e.actorId}</Link>
              ) : (
                <span className="text-ink-400">مهمان</span>
              )}
              {e.actorRole && e.actorRole !== "anonymous" && <span className="block text-[11px] text-ink-500">{roleLabels[e.actorRole]}</span>}
            </Td>
            <Td className="max-w-40 truncate text-xs text-ink-600" dir="ltr">{e.target ?? "—"}</Td>
            <Td className="text-xs text-ink-600" dir="ltr">{e.ip ?? "—"}</Td>
            <Td className="max-w-72">
              {e.detail ? (
                <details>
                  <summary className="cursor-pointer text-xs font-bold text-teal-700">نمایش</summary>
                  <pre dir="ltr" className="mt-1 max-h-40 overflow-auto rounded-lg bg-sand-50 p-2 text-[11px] leading-5 text-ink-700">{JSON.stringify(e.detail, null, 1)}</pre>
                </details>
              ) : (
                <span className="text-xs text-ink-400">—</span>
              )}
              <span className="mt-1 block truncate text-[10px] text-ink-300" dir="ltr" title={e.hash}>#{e.hash.slice(0, 12)}</span>
            </Td>
          </tr>
        ))}
      </TableShell>
      {slice.length === 0 && <p className="rounded-2xl bg-card p-8 text-center text-sm text-ink-500 shadow-card">رویدادی با این فیلتر ثبت نشده است.</p>}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2 text-sm" aria-label="صفحه‌بندی">
          {pageNum > 1 && <Link href={link({ page: String(pageNum - 1) })} className="rounded-lg bg-card px-3 py-1.5 font-bold ring-1 ring-ink-900/10">قبلی</Link>}
          <span className="text-ink-600">صفحه {toFa(pageNum)} از {toFa(pages)}</span>
          {pageNum < pages && <Link href={link({ page: String(pageNum + 1) })} className="rounded-lg bg-card px-3 py-1.5 font-bold ring-1 ring-ink-900/10">بعدی</Link>}
        </nav>
      )}

      <p className="text-[13px] leading-6 text-ink-500">
        هر رویداد با هش SHA-256 به رویداد قبلی زنجیر شده است؛ نسخه‌ای خط‌به‌خط (JSONL) هم در <span dir="ltr">data/audit.log</span> نگهداری می‌شود که می‌توانید به سامانه‌های لاگ خارجی (ELK/Loki) بفرستید. مقادیر حساس (رمز، کلید، توکن) پیش از ثبت حذف می‌شوند.
      </p>
    </div>
  );
}
