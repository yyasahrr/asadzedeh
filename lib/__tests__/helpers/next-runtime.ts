import { vi } from "vitest";

/**
 * Test double for the Next.js runtime pieces Server Actions touch.
 *
 * Server Actions cannot be imported in a plain Node process: they call
 * `cookies()`, `revalidatePath()` and `redirect()`, all of which require a
 * request scope. Mocking these three lets the authorization tests exercise the
 * real action code rather than a copy of it.
 *
 * `vi.hoisted` is required because `vi.mock` factories are hoisted above the
 * module body, so the shared state has to be created in the hoisted block too.
 */

const runtimeState = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  revalidated: [] as string[],
}));

/** Vitest will not let a hoisted variable be exported directly. */
export function runtime() {
  return runtimeState;
}

export class RedirectError extends Error {
  constructor(readonly destination: string) {
    super(`NEXT_REDIRECT ${destination}`);
    this.name = "NEXT_REDIRECT";
  }
}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (runtimeState.cookies.has(name) ? { name, value: runtimeState.cookies.get(name) } : undefined),
    set: (name: string, value: string) => runtimeState.cookies.set(name, value),
    delete: (name: string) => runtimeState.cookies.delete(name),
  }),
  headers: async () => ({ get: () => null }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => runtimeState.revalidated.push(path),
  revalidateTag: () => undefined,
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("next/navigation", () => {
  class Redirect extends Error {
    constructor(readonly destination: string) {
      super(`NEXT_REDIRECT ${destination}`);
      this.name = "NEXT_REDIRECT";
      (this as { __isRedirect?: boolean }).__isRedirect = true;
    }
  }
  return {
    redirect: (destination: string) => {
      throw new Redirect(destination);
    },
    permanentRedirect: (destination: string) => {
      throw new Redirect(destination);
    },
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  };
});

export function loginAs(userId: string, cookie = "az_session") {
  runtimeState.cookies.set(cookie, `tok-${userId}`);
}

export function logOut(cookie = "az_session") {
  runtimeState.cookies.delete(cookie);
}

/** Run an action, converting a thrown redirect into a plain return value. */
export async function call<T>(action: () => Promise<T>): Promise<{ redirected?: string; result?: T }> {
  try {
    return { result: await action() };
  } catch (error) {
    if (error instanceof Error && error.name === "NEXT_REDIRECT") {
      return { redirected: (error as { destination?: string }).destination };
    }
    throw error;
  }
}
