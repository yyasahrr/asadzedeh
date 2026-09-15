import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * No route may assume a session exists.
 *
 * Regression guard for a real production defect. Several instructor pages did:
 *
 *     const user = (await getSessionUser())!;
 *     const inst = getInstructorByUser(user.id)!;
 *
 * The `!` silences TypeScript but changes nothing at runtime, so an anonymous
 * request threw `TypeError: Cannot read properties of null (reading 'id')`.
 *
 * `app/instructor/layout.tsx` does guard correctly — but Next.js renders a page
 * and its layout concurrently, so the page crashed before the layout's
 * `redirect()` could take effect. The HTTP response was still a correct 307,
 * which is exactly why nothing caught it: the failure was invisible except as
 * three unattributable TypeErrors per anonymous sweep of the panel, drowning
 * real errors in production logs.
 *
 * Every route must therefore guard itself. This test encodes that invariant.
 */

const APP_DIR = path.join(process.cwd(), "app");

function routeFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
  };
  walk(APP_DIR);
  return out;
}

/** `(await getSessionUser())!` — an assertion that a session exists. */
const NON_NULL_SESSION = /\(\s*await\s+getSessionUser\(\)\s*\)\s*!/;

/**
 * A session variable dereferenced on a line that has no guard on it.
 * Deliberately narrow: `user.id` alone, with no `!user`, `user?.`, `user &&`
 * or `can(user` anywhere on the same line.
 */
/**
 * Find a session variable dereferenced *before* anything has checked it.
 *
 * Scoped to the window between the assignment and the first guard, not the whole
 * file: a guard early in a function makes every later use safe, and scanning the
 * whole file produces nothing but false positives.
 */
function unguardedDerefs(source: string): string[] {
  const lines = source.split("\n");
  const bad: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const decl = lines[i].match(/(?:const|let)\s+(\w+)\s*=\s*await\s+getSessionUser\(\)/);
    if (!decl) continue;
    const name = decl[1];
    const isGuarded = (line: string) => {
      const t = line.trim();
      // `const paid = user\n ? a : b` — the condition is a bare variable that
      // ends the line, with the branches on the following lines.
      if (new RegExp(`(?:^|\\s|\\()${name}\\s*\\??\\s*$`).test(t)) return true;
      return new RegExp(
        // Negated guard, positive guard, optional chain, short-circuit, or a
        // type predicate that narrows the value (`isStaff(user)`).
        `!\\s*${name}\\b|if\\s*\\(\\s*${name}\\b|\\b${name}\\s*\\?\\.|\\b${name}\\s*&&|\\b${name}\\s*\\?\\s|\\w+\\(\\s*!?\\s*${name}\\s*[,)]`,
      ).test(line);
    };

    // Walk forward only until the variable is guarded; past that point every
    // use is safe and out of scope for this check.
    for (let j = i + 1; j < lines.length; j++) {
      if (isGuarded(lines[j])) break;
      if (new RegExp(`\\b${name}!(\\.|\\[)|\\b${name}\\.\\w`).test(lines[j])) {
        bad.push(`line ${j + 1}: ${lines[j].trim()}`);
        break;
      }
    }
  }
  return bad;
}

describe("every route guards its own session", () => {
  it("never asserts that a session exists", () => {
    const offenders = routeFiles()
      .map((file) => ({ file, source: fs.readFileSync(file, "utf-8") }))
      .filter(({ source }) => NON_NULL_SESSION.test(source))
      .map(({ file }) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("never dereferences a session user without a guard on the same statement", () => {
    const offenders = routeFiles()
      .flatMap((file) => {
        const source = fs.readFileSync(file, "utf-8");
        return unguardedDerefs(source).map((line) => `${path.relative(process.cwd(), file)}: ${line}`);
      });

    expect(offenders).toEqual([]);
  });

  it("finds the defect when it is reintroduced", () => {
    // The scanner has to actually be able to fail, or the two tests above are
    // vacuous. This is the exact shape that shipped.
    const broken = `
      export default async function Page() {
        const user = await getSessionUser();
        const inst = getInstructorByUser(user.id);
        return null;
      }
    `;
    expect(unguardedDerefs(broken).length).toBeGreaterThan(0);

    const fixed = `
      export default async function Page() {
        const user = await getSessionUser();
        if (!user) redirect("/auth");
        const inst = getInstructorByUser(user.id);
        return null;
      }
    `;
    expect(unguardedDerefs(fixed)).toEqual([]);
  });
});
