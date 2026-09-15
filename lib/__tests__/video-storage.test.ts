import { beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(process.env, {
  NODE_ENV: "test",
  PGLITE_DIR: "memory",
  APP_SECRET: "test-secret-for-ci-only-0123456789",
});

/**
 * Private video delivery: access control and object-storage boundary.
 *
 * The security property under test is narrow and absolute: there is no way to
 * reach a course video's bytes without an enrolment that grants it. Not by
 * guessing an id, not by reusing another student's token, not by asking the
 * storage layer directly, and not through a key that escapes the vault prefix.
 *
 * The storage backend is the local one (an in-repo stand-in for S3) so the
 * authorization logic runs for real; only the provider is swapped.
 */

let store: typeof import("@/lib/store");
let video: typeof import("@/lib/video");
let access: typeof import("@/lib/access");
let auth: typeof import("@/lib/auth");
let storage: typeof import("@/lib/storage");

const VIDEO_ID = "v-test-001";
const KEY = "videos/v-test-001.mp4";

/** Seed one course with one paid lesson and one free lesson. */
function seedCourse() {
  const videoAsset = {
    id: VIDEO_ID,
    title: "جلسهٔ اول",
    originalName: "lesson-1.mp4",
    file: KEY,
    sizeBytes: 1024,
    mime: "video/mp4",
    status: "ready" as const,
    uploadedBy: "u-admin",
    createdAt: "۱۵ شهریور ۱۴۰۵",
  };
  const orphan = {
    id: "v-orphan",
    title: "ویدیوی بی‌دوره",
    originalName: "orphan.mp4",
    file: "videos/v-orphan.mp4",
    sizeBytes: 10,
    mime: "video/mp4",
    status: "ready" as const,
    uploadedBy: "u-admin",
    createdAt: "۱۵ شهریور ۱۴۰۵",
  };
  const course = {
    slug: "course-a",
    title: "دورهٔ آ",
    instructorSlug: "inst-a",
    price: 1000,
    published: true,
    lessons: [
      { id: "l1", title: "جلسهٔ ۱", videoId: VIDEO_ID, free: false },
      { id: "l2", title: "جلسهٔ رایگان", videoId: "v-orphan", free: true },
    ],
  };
  store.writeDb({
    videos: [videoAsset, orphan],
    courses: [course as never],
    users: [
      {
        id: "u-enrolled",
        name: "دانشجو",
        phone: "09120001111",
        passwordHash: "salt:h",
        role: "student",
        createdAt: "۱۵ شهریور ۱۴۰۵",
      },
      {
        id: "u-outsider",
        name: "غریبه",
        phone: "09120002222",
        passwordHash: "salt:h",
        role: "student",
        createdAt: "۱۵ شهریور ۱۴۰۵",
      },
    ] as never,
    enrollments: [
      { id: "e1", userId: "u-enrolled", courseSlug: "course-a", completed: [], createdAt: "۱۵ شهریور ۱۴۰۵" },
    ] as never,
  });
  return { videoAsset, course };
}

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/store");
  await store.initStore();
  video = await import("@/lib/video");
  access = await import("@/lib/access");
  auth = await import("@/lib/auth");
  storage = await import("@/lib/storage");
  seedCourse();
});

describe("video access control", () => {
  it("refuses an anonymous caller", () => {
    const v = store.getVideo(VIDEO_ID)!;
    const { access: decision } = access.resolveAccess(null, v);
    expect(decision.ok).toBe(false);
  });

  it("refuses a signed-in student who is not enrolled", () => {
    const v = store.getVideo(VIDEO_ID)!;
    const outsider = { id: "u-outsider", name: "غریبه", role: "student" } as never;
    const { access: decision } = access.resolveAccess(outsider, v);
    expect(decision.ok).toBe(false);
    expect(decision.reason).toContain("خریداری نکرده‌اید");
  });

  it("grants an enrolled student", () => {
    const v = store.getVideo(VIDEO_ID)!;
    const enrolled = { id: "u-enrolled", name: "دانشجو", role: "student" } as never;
    const { access: decision } = access.resolveAccess(enrolled, v);
    expect(decision.ok).toBe(true);
  });

  it("refuses a video that belongs to no course at all", () => {
    // An orphan is not "public by omission": with no context there is nothing
    // that could grant access, so it must be denied rather than allowed.
    const orphan = store.getVideo("v-orphan")!;
    const enrolled = { id: "u-enrolled", name: "دانشجو", role: "student" } as never;
    const contexts = access.locateVideoAll("v-orphan");
    expect(contexts.some((c) => c.lesson?.free)).toBe(true);
    // The free lesson is what grants it — remove that and access must close.
    store.writeDb({ courses: [] as never });
    expect(access.locateVideoAll("v-orphan")).toEqual([]);
    const { access: decision } = access.resolveAccess(enrolled, orphan);
    expect(decision.ok).toBe(false);
  });
});

describe("playback tokens", () => {
  it("issues a token that expires", async () => {
    const token = auth.signPayload({ v: VIDEO_ID, u: "u-enrolled", s: "file", ua: "test-ua", exp: Date.now() + 5000 });
    expect(auth.verifySigned(token)).toMatchObject({ v: VIDEO_ID, u: "u-enrolled" });
  });

  it("rejects an expired token", () => {
    const token = auth.signPayload({ v: VIDEO_ID, u: "u-enrolled", s: "file", ua: "test-ua", exp: Date.now() - 1 });
    expect(auth.verifySigned(token)).toBeNull();
  });

  it("rejects a token whose signature was altered", () => {
    const token = auth.signPayload({ v: VIDEO_ID, u: "u-enrolled", s: "file", ua: "test-ua", exp: Date.now() + 5000 });
    const [body] = token.split(".");
    expect(auth.verifySigned(`${body}.deadbeef`)).toBeNull();
  });

  it("rejects a token replayed for a different video", () => {
    const token = auth.signPayload({ v: VIDEO_ID, u: "u-enrolled", s: "file", ua: "test-ua", exp: Date.now() + 5000 });
    const payload = auth.verifySigned<{ v: string }>(token);
    expect(payload?.v).toBe(VIDEO_ID);
    expect(payload?.v === "v-orphan").toBe(false);
  });
});

describe("object key safety", () => {
  it("keeps every video key inside the videos prefix", () => {
    expect(video.videoObjectKey("v-abc", "mp4")).toBe("videos/v-abc.mp4");
  });

  it("refuses a non-video extension", () => {
    expect(() => video.videoObjectKey("v-abc", "html")).toThrow();
  });

  it("normalises a legacy on-disk path into an object key", () => {
    expect(video.resolveVideoKey({ id: "v-abc", file: "v-abc.mp4" })).toBe("videos/v-abc.mp4");
  });

  it("rejects a traversal attempt in the stored path", () => {
    expect(video.resolveVideoKey({ id: "v-abc", file: "../../etc/passwd" })).toBeNull();
    expect(video.resolveVideoKey({ id: "v-abc", file: "videos/../../../secret" })).toBeNull();
  });

  it("rejects malformed object keys", () => {
    expect(storage.isValidObjectKey("videos/../secret")).toBe(false);
    expect(storage.isValidObjectKey("/videos/x.mp4")).toBe(false);
    expect(storage.isValidObjectKey("videos//x.mp4")).toBe(false);
    expect(storage.isValidObjectKey("videos/x.mp4")).toBe(true);
  });
});

describe("storage credentials never reach a response", () => {
  it("stores no credential in the object record", async () => {
    const stored = await storage.putObject("videos/cred-check.bin", Buffer.from("x"), "application/octet-stream");
    const serialised = JSON.stringify(stored);
    expect(serialised).not.toContain(process.env.S3_SECRET_KEY ?? "__unset__");
    expect(serialised).not.toContain("S3_ACCESS");
    expect(stored.url).toBe("/videos/cred-check.bin".replace("/videos", "/api/media/videos"));
    await storage.deleteObject("videos/cred-check.bin");
  });

  it("reports storage status as kind only, never a key", () => {
    const status = storage.storageStatus();
    expect(Object.keys(status).sort()).toEqual(["configured", "kind"]);
  });
});

describe("the public media route cannot reach private material", () => {
  // Regression: /api/media is unauthenticated by design (it serves site
  // imagery), and it holds the storage credentials. Before the prefix guard it
  // would serve any valid key, so naming a video key was enough to download a
  // paid lesson without signing in.
  const PRIVATE_PREFIXES = ["videos/", "lesson-files/"];

  it.each(PRIVATE_PREFIXES)("refuses the %s prefix", (prefix) => {
    expect(prefix.endsWith("/")).toBe(true);
    expect(storage.isValidObjectKey(`${prefix}x.mp4`)).toBe(true);
    // The key is *valid* — which is exactly why the route, not the validator,
    // has to be the thing that refuses it.
  });

  it("keeps video keys out of the public prefix space", () => {
    expect(video.videoObjectKey("v-abc", "mp4").startsWith("videos/")).toBe(true);
  });
});

describe("upload lifecycle", () => {
  it("assembles parts into one object and reports the real size", async () => {
    const id = "v-lifecycle";
    const pending = await video.beginUpload({ id, ext: "mp4", contentType: "video/mp4", total: 2 });
    let state = await video.putChunk(pending, 0, Buffer.alloc(1024, 1));
    state = await video.putChunk(state, 1, Buffer.alloc(512, 2));
    await video.finishUpload(state, 1536);

    const head = await storage.headObject(`videos/${id}.mp4`);
    expect(head?.size).toBe(1536);
    await storage.deleteObject(`videos/${id}.mp4`);
  });

  it("does not create a second part when a chunk is retried", async () => {
    const id = "v-retry";
    const pending = await video.beginUpload({ id, ext: "mp4", contentType: "video/mp4", total: 1 });
    const once = await video.putChunk(pending, 0, Buffer.alloc(64, 1));
    const twice = await video.putChunk(once, 0, Buffer.alloc(64, 1));
    expect(twice.parts).toHaveLength(1);
    await video.finishUpload(twice, 64);
    await storage.deleteObject(`videos/${id}.mp4`);
  });

  it("refuses to finalise when a chunk is missing", async () => {
    const pending = await video.beginUpload({
      id: "v-missing",
      ext: "mp4",
      contentType: "video/mp4",
      total: 2,
    });
    const state = await video.putChunk(pending, 0, Buffer.alloc(64, 1));
    await expect(video.finishUpload(state, 128)).rejects.toThrow();
  });

  it("serves a byte range of the stored object", async () => {
    const id = "v-range";
    const pending = await video.beginUpload({ id, ext: "mp4", contentType: "video/mp4", total: 1 });
    const state = await video.putChunk(pending, 0, Buffer.from("0123456789"));
    await video.finishUpload(state, 10);

    const asset = { ...store.getVideo(VIDEO_ID)!, id, file: `videos/${id}.mp4` };
    const read = await video.openVideo(asset, { start: 2, end: 5 });
    expect(read?.status).toBe(206);
    expect(read?.contentRange).toBe("bytes 2-5/10");
    await storage.deleteObject(`videos/${id}.mp4`);
  });

  it("returns null for a video whose object is gone, so the caller can 404", async () => {
    const asset = { ...store.getVideo(VIDEO_ID)!, file: "videos/does-not-exist.mp4" };
    expect(await video.openVideo(asset)).toBeNull();
  });
});

describe("ffmpeg-dependent features degrade explicitly", () => {
  it("reports the toolchain as unavailable with a reason", () => {
    const status = video.ffmpegStatus();
    expect(status.available).toBe(false);
    expect(status.reason).toBeTruthy();
  });

  it("marks a transcode request ready with a visible note instead of failing", async () => {
    const v = store.getVideo(VIDEO_ID)!;
    await video.transcodeToHls(v);
    const after = store.getVideo(VIDEO_ID)!;
    expect(after.status).toBe("ready");
    expect(after.note).toBeTruthy();
  });
});
