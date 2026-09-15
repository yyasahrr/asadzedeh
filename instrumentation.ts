export async function register() {
  // Sentry must be initialised before anything can throw into it. With no DSN
  // this is no-op — see lib/monitoring.ts for the honest status report.
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
    return;
  }
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}
