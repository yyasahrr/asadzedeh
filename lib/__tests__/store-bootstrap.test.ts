import { describe, expect, it } from "vitest";

// NODE_ENV is typed read-only in @types/node, so go through Object.assign.
Object.assign(process.env, {
  NODE_ENV: "test",
  PGLITE_DIR: "memory",
  APP_SECRET: "test-secret-for-ci-only-0123456789",
});

/**
 * Store bootstrap regression tests.
 *
 * Two distinct failures are guarded here:
 *
 * 1. A read before `initStore()` finished used to return an *empty* database,
 *    because the cache was initialised to `emptyDb()` and the "have we loaded
 *    yet?" test could never distinguish that from real data. The homepage and
 *    /instructors then crashed reading `instructors[0].image`.
 *
 * 2. The cache lived in module-level variables. Next bundles this module into
 *    several server chunks, so the chunk that ran `initStore()` at boot held the
 *    data while the chunk rendering a page held an empty shell. The state now
 *    hangs off `globalThis`, the same way the SQL client does.
 */

describe("the store is usable before the async load completes", () => {
  it("seeds synchronously instead of serving an empty database", async () => {
    const store = await import("@/lib/store");
    // Deliberately do NOT await initStore(): this is the boot-race window.
    expect(store.getInstructors().length).toBeGreaterThan(0);
    expect(store.getCourses().length).toBeGreaterThan(0);
    expect(store.getSettings().site.siteName).toBeTruthy();
  });

  it("exposes the first instructor the homepage renders", async () => {
    const store = await import("@/lib/store");
    const master = store.getInstructors()[0];
    expect(master).toBeDefined();
    expect(master.image).toBeTruthy();
    expect(master.slug).toBeTruthy();
  });

  it("does not re-seed on every read, which would discard unflushed writes", async () => {
    const store = await import("@/lib/store");
    store.writeDb({ courses: store.getCourses().map((c) => ({ ...c, title: "عنوان تست" })) });
    // Reads in between must not wipe the write.
    expect(store.getCourses().length).toBeGreaterThan(0);
    expect(store.getCourses()[0].title).toBe("عنوان تست");
    expect(store.getProducts().length).toBeGreaterThan(0);
  });
});

describe("store state is a per-process singleton", () => {
  it("shares one cache across repeated imports", async () => {
    const a = await import("@/lib/store");
    const b = await import("@/lib/store");
    expect(a).toBe(b);

    const shared = globalThis as unknown as { __asadzedehStore?: { cache: unknown } };
    expect(shared.__asadzedehStore, "store state must hang off globalThis").toBeDefined();
    expect(shared.__asadzedehStore?.cache).not.toBeNull();
  });
});
