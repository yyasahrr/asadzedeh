"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Copy, KeyRound, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { beginTotpSetup, confirmTotpSetup, type TotpSetup as Setup } from "@/app/account/security/actions";
import { FieldLabel, Input } from "@/components/ui/Input";

export function TotpSetup() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [state, action, pending] = useActionState(confirmTotpSetup, null);

  async function start() {
    setBusy(true);
    setErr("");
    const r = await beginTotpSetup();
    setBusy(false);
    if ("error" in r) setErr(r.error);
    else setSetup(r);
  }

  if (state?.ok && state.recovery) {
    return (
      <div className="rounded-2xl bg-teal-50 p-6 ring-1 ring-teal-600/25">
        <p className="flex items-center gap-2 font-black text-teal-800">
          <ShieldCheck className="h-5 w-5" />
          {state.message}
        </p>
        <p className="mt-2 text-sm leading-7 text-ink-700">
          این <strong>کدهای بازیابی</strong> را همین حالا در جای امنی ذخیره کنید؛ فقط یک‌بار نمایش داده می‌شوند و هر کدام یک‌بار قابل استفاده است.
        </p>
        <RecoveryList codes={state.recovery} />
      </div>
    );
  }

  if (!setup) {
    return (
      <div>
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-navy-800 px-6 font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          فعال‌سازی با Google Authenticator
        </button>
        {err && <p className="mt-2 text-sm font-bold text-madder-700">{err}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-900/10">
        <Image src={setup.qrDataUrl} alt="QR فعال‌سازی" width={240} height={240} unoptimized className="h-auto w-full" />
      </div>
      <div className="space-y-4">
        <ol className="list-inside list-decimal space-y-1.5 text-sm leading-7 text-ink-700">
          <li>برنامه <strong>Google Authenticator</strong> (یا Authy / Microsoft Authenticator) را نصب کنید.</li>
          <li>روی «+» بزنید و این QR را اسکن کنید؛ یا کلید زیر را دستی وارد کنید.</li>
          <li>کد ۶ رقمی نمایش‌داده‌شده را در کادر زیر بنویسید.</li>
        </ol>
        <div className="flex items-center gap-2 rounded-xl bg-sand-100 px-3 py-2">
          <KeyRound className="h-4 w-4 text-ink-500" />
          <code dir="ltr" className="flex-1 select-all text-left text-xs font-bold tracking-widest text-navy-900">{setup.secret}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(setup.secret)}
            className="cursor-pointer rounded-lg p-1.5 text-ink-500 hover:bg-sand-200"
            aria-label="کپی کلید"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FieldLabel htmlFor="totp-first">کد ۶ رقمی</FieldLabel>
            <Input id="totp-first" name="code" required inputMode="numeric" autoComplete="one-time-code" dir="ltr" className="text-center text-xl font-black tracking-[0.35em]" placeholder="000000" />
          </div>
          <button type="submit" disabled={pending} className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            تأیید و فعال‌سازی
          </button>
        </form>
        {state && !state.ok && <p className="text-sm font-bold text-madder-700">{state.message}</p>}
      </div>
    </div>
  );
}

export function RecoveryList({ codes }: { codes: string[] }) {
  return (
    <div>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {codes.map((c) => (
          <li key={c} dir="ltr" className="rounded-lg bg-white px-2 py-1.5 text-center font-mono text-sm font-bold text-navy-900 ring-1 ring-ink-900/10">
            {c}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}
        className="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-navy-800 px-4 text-xs font-bold text-white"
      >
        <Copy className="h-3.5 w-3.5" />
        کپی همه کدها
      </button>
    </div>
  );
}
