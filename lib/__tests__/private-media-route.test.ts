import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/media/[...key]/route";

describe("public media route private-prefix fence", () => {
  it("does not expose custom certificate objects", async () => {
    const response = await GET(new Request("http://localhost/api/media/private/certificates/file.pdf"), {
      params: Promise.resolve({ key: ["private", "certificates", "file.pdf"] }),
    });
    expect(response.status).toBe(404);
  });
});
