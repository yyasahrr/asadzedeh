"use client";
import { useState } from "react";
import { Input } from "@/components/ui/Input";

export function AccountDeleteForm({ action, id }: { action: (fd: FormData) => void; id: string }) {
  const [value, setValue] = useState("");
  return <form action={action} className="space-y-3 rounded-xl border border-madder-700/20 bg-madder-50 p-4">
    <input type="hidden" name="id" value={id} />
    <label htmlFor="delete-confirmation" className="block text-sm font-bold text-madder-900">برای تأیید عبارت «حذف حساب» را وارد کنید</label>
    <div className="flex flex-col gap-2 sm:flex-row"><Input id="delete-confirmation" name="confirmation" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" /><button type="submit" disabled={value !== "حذف حساب"} className="h-10 rounded-xl bg-madder-700 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">حذف حساب</button></div>
  </form>;
}
