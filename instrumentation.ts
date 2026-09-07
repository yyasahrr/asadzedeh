export async function register() {
  // Sentry must be initialised before anything can throw into it. With no DSN
  // this is no-op — see lib/monitoring.ts for the honest status report.
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

  await startReservationSweeper();
}

/**
 * Periodically release stock and seats held by orders nobody paid for.
 *
 * Reservations are taken at checkout, before the gateway confirms anything. A
 * shopper who closes the tab never triggers the callback that would release
 * them, so without a sweep those units stay unsellable forever — the mirror
 * image of overselling.
 *
 * The sweep itself is a single atomic SQL statement set guarded by
 * `FOR UPDATE SKIP LOCKED` (see `releaseExpiredReservations`), so running it on
 * a timer and running it from two processes are both safe. The timer is only a
 * trigger; correctness lives in the database.
 */
async function startReservationSweeper() {
  // Set RESERVATION_SWEEP_MINUTES=0 to disable (e.g. in tests, or when a cron
  // job calls the same code path instead).
  const everyMinutes = Number(process.env.RESERVATION_SWEEP_MINUTES ?? 10);
  if (!Number.isFinite(everyMinutes) || everyMinutes <= 0) return;

  const ttlMinutes = Number(process.env.RESERVATION_TTL_MINUTES ?? 30);
  const { releaseExpiredReservations } = await import("./lib/db/commerce");
  const { syncCollections } = await import("./lib/store");
  const { logger } = await import("./lib/logger");

  const runOnce = async () => {
    try {
      const released = await releaseExpiredReservations({ ttlMinutes });
      if (released.length > 0) {
        // Pull the released counters back into the in-memory cache so the
        // storefront reflects the reclaimed stock immediately.
        await syncCollections(["products", "classes", "orders"]);
      }
    } catch (error) {
      // Never let a background sweep take the server down.
      logger.error({ event: "inventory.reservations.sweep.failed", err: String(error) });
    }
  };

  // Unref so the timer never holds the process open on shutdown.
  const timer = setInterval(() => {
    void runOnce();
  }, everyMinutes * 60_000);
  timer.unref?.();

  logger.info({
    event: "inventory.reservations.sweeper.started",
    everyMinutes,
    ttlMinutes,
  });
}
