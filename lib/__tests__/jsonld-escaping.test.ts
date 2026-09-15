import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { jsonLd } from "@/lib/seo";

/**
 * JSON-LD is the one place the app writes raw HTML, so it must escape.
 *
 * `JSON.stringify` does not escape `/`, so a value containing `</script>`
 * terminates the surrounding `<script>` element and the rest is parsed as
 * markup. Course and class titles and excerpts are instructor-supplied
 * (`app/instructor/course-requests/actions.ts` reads `title` straight from the
 * form and the admin approval copies it verbatim into the published record), so
 * the raw form was a stored XSS on the public course/class pages.
 *
 * `jsonLd()` in `lib/seo` already escaped `<` as `\u003c`; three pages simply
 * were not using it. This pins the helper's behaviour and the call sites.
 */
describe("jsonLd escapes markup", () => {
  it("cannot be broken out of with </script>", () => {
    const hostile = { name: 'x</script><script>alert(document.cookie)</script>' };
    const out = jsonLd(hostile);

    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
    // Only `<` needs escaping: without it no tag can open, so the remaining
    // `>` is inert data inside the script element.
    expect(out).toContain("\\u003c/script>");
    // Still valid JSON, and the payload survives as inert data.
    expect(JSON.parse(out).name).toBe(hostile.name);
  });

  it("leaves no raw opening angle bracket anywhere in the output", () => {
    const out = jsonLd([{ name: "<img src=x onerror=alert(1)>" }]);
    expect(out).not.toContain("<");
    expect(JSON.parse(out)[0].name).toBe("<img src=x onerror=alert(1)>");
  });

  it("is what every JSON-LD script tag in the app calls", () => {
    const app = path.join(process.cwd(), "app");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".tsx")) files.push(full);
      }
    };
    walk(app);

    const offenders: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, "utf-8");
      if (!source.includes("dangerouslySetInnerHTML")) continue;
      // A JSON-LD script body must go through the escaping helper.
      for (const line of source.split("\n")) {
        if (line.includes("application/ld+json") || line.includes("__html:")) {
          if (/__html:\s*JSON\.stringify\(/.test(line)) {
            offenders.push(`${path.relative(process.cwd(), file)}: ${line.trim()}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
