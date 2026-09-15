/** Node-only startup work, kept outside instrumentation.ts so Edge compilation
 * never traces PostgreSQL, fs, or path dependencies. */
export async function registerNode() {
  await import("./sentry.server.config");
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertProductionSecrets } = await import("./lib/env");
  assertProductionSecrets();
  const { initStore } = await import("./lib/store");
  await initStore();
  const { runLaunchChecks } = await import("./lib/launch-check");
  await runLaunchChecks();
  await startReservationSweeper();
}

async function startReservationSweeper() {
  const everyMinutes = Number(process.env.RESERVATION_SWEEP_MINUTES ?? 10);
  if (!Number.isFinite(everyMinutes) || everyMinutes <= 0) return;

  const ttlMinutes = Number(process.env.RESERVATION_TTL_MINUTES ?? 30);
  const { releaseExpiredReservations } = await import("./lib/db/commerce");
  const { syncCollections } = await import("./lib/store");
  const { logger } = await import("./lib/logger");

  const runOnce = async () => {
    try {
      const released = await releaseExpiredReservations({ ttlMinutes });
      if (released.length > 0) await syncCollections(["products", "classes", "orders"]);
    } catch (error) {
      logger.error({ event: "inventory.reservations.sweep.failed", err: String(error) });
    }

    // Abandoned video uploads. An interrupted multipart upload leaves parts in
    // the bucket that nobody references and everybody pays for; both sides of
    // this are idempotent, so a second replica or a restart is harmless.
    try {
      const { reapStaleUploads } = await import("./lib/video");
      const reaped = await reapStaleUploads();
      if (reaped > 0) await syncCollections(["videos"]);
    } catch (error) {
      logger.error({ event: "video.upload.reap.failed", err: String(error) });
    }
  };

  const timer = setInterval(() => void runOnce(), everyMinutes * 60_000);
  timer.unref?.();
  logger.info({ event: "inventory.reservations.sweeper.started", everyMinutes, ttlMinutes });
}
