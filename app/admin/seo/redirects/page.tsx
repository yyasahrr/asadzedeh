import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser, can } from "@/lib/auth";
import { Denied } from "@/components/admin/Denied";
import { FieldLabel, Input } from "@/components/ui/Input";
import { TableShell, Td } from "@/components/admin/TableShell";
import { getSeoRedirects } from "@/lib/store";
import { deleteSeoRedirect, saveSeoRedirect } from "../actions";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = { ...noIndexMetadata("ریدایرکت سئو"), title: "ریدایرکت سئو" };

export default async function SeoRedirectsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await getSessionUser();
  if (!can(user, "seo")) return <Denied />;
  const { saved, error } = await searchParams;
  const redirects = getSeoRedirects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-navy-900">ریدایرکت‌ها</h1>
        <Link href="/admin/seo" className="text-sm font-bold text-teal-600">بازگشت به سئو</Link>
      </div>
      {saved && <p className="rounded-2xl bg-teal-50 px-5 py-3 text-sm font-bold text-teal-800">ذخیره شد.</p>}
      {error && <p className="rounded-2xl bg-madder-50 px-5 py-3 text-sm font-bold text-madder-700">{error}</p>}

      <form action={saveSeoRedirect} className="rounded-2xl bg-card p-6 shadow-card ring-1 ring-ink-900/5">
        <h2 className="font-extrabold text-navy-900">ریدایرکت جدید</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div>
            <FieldLabel htmlFor="fromPath">از مسیر</FieldLabel>
            <Input id="fromPath" name="fromPath" placeholder="/old-slug" dir="ltr" className="text-left" required />
          </div>
          <div>
            <FieldLabel htmlFor="toPath">به مسیر</FieldLabel>
            <Input id="toPath" name="toPath" placeholder="/new-slug" dir="ltr" className="text-left" required />
          </div>
          <div>
            <FieldLabel htmlFor="statusCode">کد</FieldLabel>
            <select id="statusCode" name="statusCode" className="h-11 w-full rounded-xl border border-ink-900/10 bg-card px-3 text-sm">
              <option value="301">301</option>
              <option value="308">308</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-3 text-sm font-bold">
            <input type="checkbox" name="enabled" defaultChecked /> فعال
          </label>
        </div>
        <button type="submit" className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-xl bg-navy-800 px-8 font-bold text-white">افزودن</button>
      </form>

      <TableShell head={["از", "به", "کد", "وضعیت", ""]}>
        {redirects.map((r) => (
          <tr key={r.id}>
            <Td dir="ltr">{r.fromPath}</Td>
            <Td dir="ltr">{r.toPath}</Td>
            <Td>{r.statusCode}</Td>
            <Td>{r.enabled ? "فعال" : "خاموش"}</Td>
            <Td>
              <form action={deleteSeoRedirect}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="text-sm font-bold text-madder-700">حذف</button>
              </form>
            </Td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}
