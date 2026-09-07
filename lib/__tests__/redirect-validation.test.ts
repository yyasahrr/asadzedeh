import { describe, expect, it } from "vitest";
import type { SeoRedirect } from "@/lib/types";

function wouldLoop(fromPath: string, toPath: string, existing: SeoRedirect[]): boolean {
  if (fromPath === toPath) return true;
  const map = new Map(existing.filter((r) => r.enabled).map((r) => [r.fromPath, r.toPath]));
  map.set(fromPath, toPath);
  let cur = toPath;
  const seen = new Set<string>([fromPath]);
  for (let i = 0; i < 20; i++) {
    const next = map.get(cur);
    if (!next) return false;
    if (seen.has(next)) return true;
    seen.add(next);
    cur = next;
  }
  return true;
}

describe("redirect loop detection", () => {
  it("detects self-loop", () => {
    expect(wouldLoop("/a", "/a", [])).toBe(true);
  });

  it("detects two-node loop", () => {
    expect(wouldLoop("/b", "/a", [{ id: "1", fromPath: "/a", toPath: "/b", statusCode: 301, enabled: true }])).toBe(true);
  });

  it("allows acyclic redirect", () => {
    expect(wouldLoop("/old", "/new", [])).toBe(false);
  });
});
