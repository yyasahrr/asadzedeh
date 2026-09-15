"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { regenerateRecovery } from "@/app/account/security/actions";
import { RecoveryList } from "./TotpSetup";

export function RegenerateRecovery() {
  const [state, action, pending] = useActionState(regenerateRecovery, null);
  return (
    <div>
      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="code"
          required
          inputMode="numeric"
          placeholder="کد فعلی Authenticator"
          dir="ltr"
          className="h-10 rounded-xl border border-ink-900/10 bg-white px-3 text-center text-sm font-bold focus:border-teal-600 focus:outline-none"
        />
        <button type="submit" disabled={pending} className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-sand-200 px-4 text-sm font-bold text-ink-800 hover:bg-sand-300 disabled:opacity-60">
          <RefreshCw className="h-4 w-4" />
          ساخت کدهای بازیابی جدید
        </button>
      </form>
      {state && (
        <div className={`mt-3 rounded-xl p-3 text-sm font-bold ${state.ok ? "bg-teal-50 text-teal-800" : "bg-madder-50 text-madder-700"}`}>
          {state.message}
          {state.recovery && <RecoveryList codes={state.recovery} />}
        </div>
      )}
    </div>
  );
}
