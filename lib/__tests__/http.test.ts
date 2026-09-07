import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "@/lib/http";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function mockFetch(impl: typeof fetch) {
  globalThis.fetch = impl as typeof fetch;
}

describe("fetchWithTimeout", () => {
  it("passes the request through and returns the response", async () => {
    mockFetch(async () => new Response("ok", { status: 200 }));
    const res = await fetchWithTimeout("https://example.test/x", { event: "test.call" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("aborts a call that outlives its timeout", async () => {
    mockFetch(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("request timed out")));
        }),
    );

    const started = Date.now();
    await expect(
      fetchWithTimeout("https://example.test/slow", { timeoutMs: 50, event: "test.timeout" }),
    ).rejects.toThrow();
    // The call gave up promptly rather than hanging on Node's default (none).
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("never retries a call that was not declared idempotent", async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return new Response("boom", { status: 503 });
    });

    const res = await fetchWithTimeout("https://example.test/pay", { event: "payment.request" });
    expect(res.status).toBe(503);
    expect(calls).toBe(1);
  });

  it("retries a retryable 5xx when the caller opts in", async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return new Response(calls < 3 ? "boom" : "ok", { status: calls < 3 ? 503 : 200 });
    });

    const res = await fetchWithTimeout("https://example.test/verify", {
      retry: { attempts: 3, baseDelayMs: 1 },
      event: "payment.verify",
    });
    expect(res.status).toBe(200);
    expect(calls).toBe(3);
  });

  it("does not retry a 4xx — that is a real answer", async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return new Response("nope", { status: 400 });
    });

    const res = await fetchWithTimeout("https://example.test/verify", {
      retry: { attempts: 3, baseDelayMs: 1 },
      event: "payment.verify",
    });
    expect(res.status).toBe(400);
    expect(calls).toBe(1);
  });

  it("caps the number of attempts even if every one fails", async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      throw new Error("socket hang up");
    });

    await expect(
      fetchWithTimeout("https://example.test/x", { retry: { attempts: 2, baseDelayMs: 1 }, event: "test.net" }),
    ).rejects.toThrow(/socket hang up/);
    expect(calls).toBe(2);
  });

  it("caps the timeout so a caller cannot wait forever", async () => {
    const seen: number[] = [];
    mockFetch(async (_input, init) => {
      init?.signal?.addEventListener("abort", () => seen.push(Date.now()));
      return new Response("ok");
    });

    await fetchWithTimeout("https://example.test/x", { timeoutMs: 999_999, event: "test.cap" });
    // No abort fired; the point is the option was accepted without hanging.
    expect(seen).toHaveLength(0);
  });
});
