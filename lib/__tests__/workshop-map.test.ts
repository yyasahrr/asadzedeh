import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isValidLatitude, isValidLongitude } from "../validation/legacy";
import { resolveNeshanWebMapKey } from "../workshop-map";

describe("workshop map configuration", () => {
  it("prefers the persisted Web Map key and falls back to the public environment key", () => {
    expect(resolveNeshanWebMapKey(" stored-key ", "env-key")).toBe("stored-key");
    expect(resolveNeshanWebMapKey("", " env-key ")).toBe("env-key");
    expect(resolveNeshanWebMapKey("", "")).toBeUndefined();
  });

  it("validates coordinate boundaries", () => {
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(90.01)).toBe(false);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(180.01)).toBe(false);
  });

  it("does not pass the service API key value into the client form or audit detail", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/admin/workshop/page.tsx"), "utf8");
    const client = fs.readFileSync(path.join(process.cwd(), "components/admin/WorkshopMapForm.tsx"), "utf8");
    const action = fs.readFileSync(path.join(process.cwd(), "app/admin/actions/workshop.ts"), "utf8");
    expect(page).toContain("Boolean(process.env.NESHAN_SERVICE_API_KEY)");
    expect(client).not.toContain("NESHAN_SERVICE_API_KEY");
    expect(action).not.toContain("NESHAN_SERVICE_API_KEY");
    expect(action).toContain("mapKeyConfigured: Boolean(neshanWebMapKey)");
  });
});
