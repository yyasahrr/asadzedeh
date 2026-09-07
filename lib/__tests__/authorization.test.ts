import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { call, loginAs, logOut, runtime } from "./helpers/next-runtime";

// NODE_ENV is typed read-only in @types/node, so go through Object.assign.
Object.assign(process.env, {
  NODE_ENV: "test",
  PGLITE_DIR: "memory",
  APP_SECRET: "test-secret-for-ci-only-0123456789",
});

/**
 * Authorization regression tests.
 *
 * These exist because page-level guards are not access control: an attacker
 * posts straight to the Server Action with someone else's id. Every case below
 * is a request that a *validly logged-in* user makes for a resource that is not
 * theirs, and each must be refused by the action itself.
 */

const SESSION_COOKIE = "az_session";

let store: typeof import("@/lib/store");
let seedData: typeof import("@/lib/data");
let instructor: typeof import("@/app/instructor/actions");
let dashboard: typeof import("@/app/dashboard/actions");
let admin: typeof import("@/app/admin/actions");
let auth: typeof import("@/lib/auth");

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

beforeAll(async () => {
  store = await import("@/lib/store");
  seedData = await import("@/lib/data");
  instructor = await import("@/app/instructor/actions");
  dashboard = await import("@/app/dashboard/actions");
  admin = await import("@/app/admin/actions");
  auth = await import("@/lib/auth");
});

beforeEach(() => {
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 36 * 60 * 60_000).toISOString();

  const users = [
    { id: "u-sara", name: "سارا", phone: "09120000001", passwordHash: "x", role: "instructor" as const, createdAt: now },
    { id: "u-reza", name: "رضا", phone: "09120000002", passwordHash: "x", role: "instructor" as const, createdAt: now },
    { id: "u-learner", name: "هنرجو", phone: "09120000003", passwordHash: "x", role: "student" as const, createdAt: now },
    { id: "u-intruder", name: "مزاحم", phone: "09120000004", passwordHash: "x", role: "student" as const, createdAt: now },
    { id: "u-super", name: "مدیر", phone: "09120000005", passwordHash: "x", role: "super_admin" as const, createdAt: now },
  ];

  const instructors = [
    { ...seedData.instructors[0], slug: "sara", userId: "u-sara" },
    { ...seedData.instructors[1], slug: "reza", userId: "u-reza" },
  ];

  // Sara owns the first seeded course; Reza owns the second. The seed data only
  // carries a syllabus of titles, so lessons are attached explicitly — they are
  // what the instructor panel creates and what progress tracking checks.
  const lessonsFor = (owner: string) => [
    { id: `${owner}-l1`, title: "درس یک", durationMin: 30, free: true },
    { id: `${owner}-l2`, title: "درس دو", durationMin: 45, free: false },
    { id: `${owner}-l3`, title: "درس سه", durationMin: 45, free: false },
  ];

  const courses = seedData.onlineCourses.map((c, i) => {
    const owner = i === 0 ? "sara" : "reza";
    return {
      ...c,
      instructorSlug: owner,
      instructor: i === 0 ? "سارا" : "رضا",
      lessons: lessonsFor(owner),
    };
  });

  const sessions = users.map((u) => ({
    token: `tok-${u.id}`,
    userId: u.id,
    createdAt: now,
    lastSeen: now,
    expiresAt: later,
    mfaVerified: true,
  }));

  store.writeDb({
    users,
    instructors,
    courses,
    sessions,
    enrollments: [{ id: "en-1", userId: "u-learner", courseSlug: courses[0].slug, completed: [] }],
    certificates: [
      {
        code: "AZ-C-TEST",
        student: "هنرجو",
        course: courses[0].title,
        date: now,
        hours: 12,
        userId: "u-learner",
        issuedAt: now,
      },
    ],
    orders: [
      { id: "AZ-OWN", userId: "u-learner", status: "پرداخت شده", amount: 1000, lines: [], student: "هنرجو" },
      { id: "AZ-OTHER", userId: "u-intruder", status: "پرداخت شده", amount: 1000, lines: [], student: "مزاحم" },
    ],
    tickets: [
      {
        id: "t-1",
        subject: "تیکت هنرجو",
        student: "هنرجو",
        userId: "u-learner",
        phone: "09120000003",
        status: "باز",
        messages: [],
        createdAt: now,
      },
    ],
  } as never);

  logOut();
});

const ownCourse = () => store.getCourses()[0];
const foreignCourse = () => store.getCourses()[1];

type WithLessons = { slug: string; lessons?: { id: string; title: string; free?: boolean }[] };

/** The fixtures always attach lessons; fail loudly if that ever stops. */
function lessonsOf(course: WithLessons | undefined) {
  const lessons = course?.lessons;
  if (!lessons || lessons.length === 0) throw new Error("test fixture has no lessons");
  return lessons;
}

function firstLesson(course: WithLessons | undefined): string {
  return lessonsOf(course)[0].id;
}

describe("IDOR — instructor course ownership", () => {
  it("lets an instructor edit their own course", async () => {
    loginAs("u-sara");
    const outcome = await call(() =>
      instructor.instructorAddLesson(
        form({ slug: ownCourse().slug, title: "درس جدید", durationMin: "30", free: "" }),
      ),
    );
    // On success the action redirects back to the course editor.
    expect(outcome.redirected).toContain(`/instructor/courses/${ownCourse().slug}`);
    const lessons = store.getCourse(ownCourse().slug)?.lessons ?? [];
    expect(lessons.some((l) => l.title === "درس جدید")).toBe(true);
  });

  it("refuses to add a lesson to another instructor's course", async () => {
    loginAs("u-reza");
    const before = lessonsOf(store.getCourse(ownCourse().slug)).length;
    await call(() =>
      instructor.instructorAddLesson(
        form({ slug: ownCourse().slug, title: "درس تزریق شده", durationMin: "30", free: "" }),
      ),
    );
    expect(lessonsOf(store.getCourse(ownCourse().slug))).toHaveLength(before);
  });

  it("refuses to delete another instructor's lesson", async () => {
    loginAs("u-reza");
    const target = ownCourse();
    const victim = lessonsOf(target)[0];
    const before = lessonsOf(target).length;
    await call(() => instructor.instructorDeleteLesson(form({ slug: target.slug, id: victim.id })));
    expect(lessonsOf(store.getCourse(target.slug))).toHaveLength(before);
  });

  it("refuses to rewrite another instructor's course text", async () => {
    loginAs("u-reza");
    const target = ownCourse();
    const before = target.excerpt;
    await call(() =>
      instructor.instructorUpdateCourseText(
        form({ slug: target.slug, excerpt: "متن جعلی", outcomes: "الف\nب" }),
      ),
    );
    expect(store.getCourse(target.slug)?.excerpt).toBe(before);
  });

  it("refuses a student who posts to an instructor action", async () => {
    loginAs("u-learner");
    const target = ownCourse();
    const before = lessonsOf(target).length;
    const outcome = await call(() =>
      instructor.instructorAddLesson(form({ slug: target.slug, title: "x", durationMin: "10" })),
    );
    expect(outcome.redirected).toBe("/auth?next=/instructor");
    expect(lessonsOf(store.getCourse(target.slug))).toHaveLength(before);
  });

  it("refuses an anonymous request", async () => {
    const target = ownCourse();
    const before = lessonsOf(target).length;
    await call(() => instructor.instructorAddLesson(form({ slug: target.slug, title: "x", durationMin: "10" })));
    expect(lessonsOf(store.getCourse(target.slug))).toHaveLength(before);
  });

  it("refuses to review a submission for a course the instructor does not own", async () => {
    const now = new Date().toISOString();
    store.writeDb({
      submissions: [
        {
          id: "sub-1",
          course: foreignCourse().title,
          student: "هنرجو",
          status: "در انتظار بررسی",
          createdAt: now,
          payload: {},
        } as never,
      ],
    });

    loginAs("u-sara");
    await call(() => instructor.instructorReviewSubmission(form({ id: "sub-1", status: "تایید شد" })));
    expect(store.getSubmissions().find((s) => s.id === "sub-1")?.status).toBe("در انتظار بررسی");
  });
});

describe("IDOR — learner course progress and certificates", () => {
  it("lets an enrolled learner mark a real lesson complete", async () => {
    loginAs("u-learner");
    const target = ownCourse();
    const lesson = lessonsOf(target).find((l) => !l.free) ?? lessonsOf(target)[0];
    const outcome = await call(() => dashboard.setLessonProgress(target.slug, lesson.id, true));
    expect(outcome.result?.ok).toBe(true);
    expect(store.getEnrollments().find((e) => e.userId === "u-learner")?.completed).toContain(lesson.id);
  });

  it("refuses progress on a course the learner is not enrolled in", async () => {
    loginAs("u-learner");
    const target = foreignCourse();
    const outcome = await call(() => dashboard.setLessonProgress(target.slug, firstLesson(target), true));
    expect(outcome.result?.ok).toBe(false);
    expect(outcome.result?.error).toBe("not-enrolled");
  });

  it("refuses a lessonId that does not belong to the enrolled course", async () => {
    loginAs("u-learner");
    const target = ownCourse();
    const foreignLesson = firstLesson(foreignCourse());
    const outcome = await call(() => dashboard.setLessonProgress(target.slug, foreignLesson, true));
    expect(outcome.result?.ok).toBe(false);
    expect(outcome.result?.error).toBe("unknown-lesson");
    expect(store.getEnrollments().find((e) => e.userId === "u-learner")?.completed ?? []).not.toContain(foreignLesson);
  });

  it("refuses a fabricated lessonId", async () => {
    loginAs("u-learner");
    const target = ownCourse();
    const outcome = await call(() => dashboard.setLessonProgress(target.slug, "../../../etc/passwd", true));
    expect(outcome.result?.ok).toBe(false);
    expect(outcome.result?.error).toBe("unknown-lesson");
  });

  it("refuses an anonymous progress write", async () => {
    const target = ownCourse();
    const outcome = await call(() => dashboard.setLessonProgress(target.slug, firstLesson(target), true));
    expect(outcome.result?.ok).toBe(false);
    expect(outcome.result?.error).toBe("unauthorized");
  });
});

describe("IDOR — admin actions require the permission, not just a session", () => {
  it("redirects a learner who posts to an admin action", async () => {
    loginAs("u-learner");
    const outcome = await call(() =>
      admin.updateUserRole(form({ id: "u-learner", role: "super_admin" })),
    );
    expect(outcome.redirected).toBe("/admin");
    expect(store.getUserById("u-learner")?.role).toBe("student");
  });

  it("redirects an instructor who posts to an admin action", async () => {
    loginAs("u-sara");
    const outcome = await call(() => admin.updateUserRole(form({ id: "u-learner", role: "manager" })));
    expect(outcome.redirected).toBe("/admin");
    expect(store.getUserById("u-learner")?.role).toBe("student");
  });

  it("refuses an anonymous admin request", async () => {
    const outcome = await call(() => admin.updateUserRole(form({ id: "u-learner", role: "manager" })));
    expect(outcome.redirected).toBe("/admin");
    expect(store.getUserById("u-learner")?.role).toBe("student");
  });

  it("never lets a super admin grant super_admin through the form", async () => {
    loginAs("u-super");
    const outcome = await call(() =>
      admin.updateUserRole(form({ id: "u-learner", role: "super_admin" })),
    );
    expect(outcome.redirected).toBe("/admin/users?error=role");
    expect(store.getUserById("u-learner")?.role).toBe("student");
  });

  it("never lets a super admin grant plain admin through the form", async () => {
    loginAs("u-super");
    const outcome = await call(() => admin.updateUserRole(form({ id: "u-learner", role: "admin" })));
    expect(outcome.redirected).toBe("/admin/users?error=role");
    expect(store.getUserById("u-learner")?.role).toBe("student");
  });

  it("does allow an assignable role change", async () => {
    loginAs("u-super");
    const outcome = await call(() => admin.updateUserRole(form({ id: "u-learner", role: "support" })));
    expect(outcome.redirected).toBeUndefined();
    expect(store.getUserById("u-learner")?.role).toBe("support");
  });

  it("refuses a role change against a user id that does not exist", async () => {
    loginAs("u-super");
    const outcome = await call(() => admin.updateUserRole(form({ id: "u-ghost", role: "support" })));
    expect(outcome.redirected).toBe("/admin/users?error=notfound");
  });
});

describe("sessions — a forged or expired cookie grants nothing", () => {
  it("rejects an unknown token", async () => {
    runtime().cookies.set(SESSION_COOKIE, "forged-token");
    expect(await auth.getSessionUser()).toBeNull();
  });

  it("rejects an expired session", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    store.writeDb({
      sessions: [
        { token: "tok-expired", userId: "u-super", createdAt: past, expiresAt: past, lastSeen: past } as never,
      ],
    });
    runtime().cookies.set(SESSION_COOKIE, "tok-expired");
    expect(await auth.getSessionUser()).toBeNull();
  });

  it("rejects a session with no expiry recorded", async () => {
    store.writeDb({
      sessions: [{ token: "tok-null", userId: "u-super", createdAt: new Date().toISOString() } as never],
    });
    runtime().cookies.set(SESSION_COOKIE, "tok-null");
    expect(await auth.getSessionUser()).toBeNull();
  });

  it("rejects a revoked session", async () => {
    const now = new Date().toISOString();
    store.writeDb({
      sessions: [
        {
          token: "tok-revoked",
          userId: "u-super",
          createdAt: now,
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          revokedAt: now,
        } as never,
      ],
    });
    runtime().cookies.set(SESSION_COOKIE, "tok-revoked");
    expect(await auth.getSessionUser()).toBeNull();
  });
});
