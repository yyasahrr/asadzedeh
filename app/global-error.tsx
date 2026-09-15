"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The last-chance boundary: an unhandled error in the App Router. Sentry is a
  // no-op unless a DSN was supplied at build/runtime.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body style={{ fontFamily: "Tahoma, sans-serif", background: "#F3E9D6", color: "#191A19", padding: "4rem 1rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem" }}>خطای غیرمنتظره</h1>
        <p style={{ marginTop: "0.75rem" }}>لطفاً صفحه را تازه‌سازی کنید.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: "1.5rem", background: "#193B5C", color: "#fff", border: 0, borderRadius: 12, padding: "0.75rem 1.5rem", fontWeight: 700 }}
        >
          تلاش دوباره
        </button>
        {error.digest ? <p style={{ marginTop: "1rem", fontSize: 12, opacity: 0.6 }}>{error.digest}</p> : null}
      </body>
    </html>
  );
}
