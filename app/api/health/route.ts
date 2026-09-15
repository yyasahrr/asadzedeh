import { NextResponse } from "next/server";
import { dbHealth } from "@/lib/db/client";
import { storageStatus } from "@/lib/storage";
import { monitoringStatus } from "@/lib/monitoring";
import { demoPaymentAllowed } from "@/lib/env";
import { integrationStatus } from "@/lib/integrations";

export const dynamic = "force-dynamic";

/**
 * Liveness + configuration probe.
 *
 * Used by the deploy pipeline (`scripts/smoke.ts`), by uptime monitoring and by
 * an operator checking a fresh box. It reports *whether* integrations are
 * configured, never their credentials, so it is safe to expose unauthenticated.
 */
export async function GET() {
  const db = await dbHealth();
  const ok = db.ok;
  const integrations = integrationStatus();
  // Demo payment is only ever permitted outside production; once it is off, a
  // shop with no gateway configured cannot take money at all.
  const commerceReady = demoPaymentAllowed() || integrations.payment.configured;
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      db: db.ok ? db.kind : "error",
      storage: storageStatus().kind,
      storageConfigured: storageStatus().configured,
      monitoring: monitoringStatus(),
      demoPayment: demoPaymentAllowed(),
      integrations,
      commerceReady,
      commerceNote: commerceReady ? undefined : "درگاه پرداخت پیکربندی نشده است",
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
