export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertProductionSecrets } = await import("./lib/env");
  assertProductionSecrets();
  const { initStore } = await import("./lib/store");
  await initStore();
}
