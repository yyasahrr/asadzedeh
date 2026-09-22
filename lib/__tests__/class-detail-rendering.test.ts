import { describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn(async () => null);

vi.mock("@/lib/auth", () => ({ getSessionUser }));

describe("class detail route rendering", () => {
  it("is request-rendered and can resolve session-aware ownership", async () => {
    const route = await import("@/app/classes/[slug]/page");
    const { getClasses } = await import("@/lib/store");
    const cls = getClasses()[0];

    expect(route.dynamic).toBe("force-dynamic");
    expect("generateStaticParams" in route).toBe(false);

    const result = await route.default({
      params: Promise.resolve({ slug: cls.slug }),
      searchParams: Promise.resolve({}),
    });

    expect(result).toBeTruthy();
    expect(getSessionUser).toHaveBeenCalledOnce();
  });
});
