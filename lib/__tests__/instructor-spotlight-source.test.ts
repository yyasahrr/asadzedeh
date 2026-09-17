import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("homepage instructor spotlight", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components/home/MasterSpotlight.tsx"), "utf8");

  it("uses the instructor experience with an empty fallback", () => {
    expect(source).toContain("master.experience?.trim()");
    expect(source).not.toContain(">۳۲ سال<");
  });

  it("guards an empty instructor collection", () => {
    expect(source).toContain("if (!master) return null");
  });
});
