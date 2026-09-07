import { NextResponse } from "next/server";
import { dbHealth } from "@/lib/db/client";
import { storageStatus } from "@/lib/storage";
import { monitoringStatus } from "@/lib/monitoring";
import { demoPaymentAllowed } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await dbHealth();
  const ok = db.ok;
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      db: db.ok ? db.kind : "error",
      storage: storageStatus().kind,
      storageConfigured: storageStatus().configured,
      monitoring: monitoringStatus(),
      demoPayment: demoPaymentAllowed(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
