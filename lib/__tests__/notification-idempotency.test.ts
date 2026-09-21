import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  Object.assign(process.env, { NODE_ENV: "test", PGLITE_DIR: "memory", APP_SECRET: "test-secret-not-for-production-123456" });
});

describe("transactional SMS event claiming", () => {
  it("allows exactly one durable claim for an event key", async () => {
    const store = await import("../store");
    await store.initStore();
    const { claimNotificationEvent } = await import("../db/notification-events");
    const key = `paymentSuccess:order-${Date.now()}`;
    const results = await Promise.all(Array.from({ length: 5 }, () => claimNotificationEvent(key, "paymentSuccess", "09120000000")));
    expect(results.filter((result) => result.claimed)).toHaveLength(1);
  });
});
