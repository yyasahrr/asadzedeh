export async function register() {
  // Sentry must be initialised before anything can throw into it. With no DSN
  // this is a no-op — see lib/monitoring.ts for the honest status report.
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
    return;
  }
  await import("./sentry.server.config");
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertProductionSecrets } = await import("./lib/env");
  assertProductionSecrets();
  const { initStore } = await import("./lib/store");
  await initStore();
}
