import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not advertise the framework on every response.
  poweredByHeader: false,
  // Native SVG renderer must be required at runtime, not bundled.
  serverExternalPackages: ["@resvg/resvg-js", "satori", "harfbuzzjs", "postgres", "@electric-sql/pglite", "pino", "drizzle-orm"],
  experimental: {
    // Image/media uploads go through Server Actions; videos use the chunked route handler.
    serverActions: { bodySizeLimit: "25mb" },
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.instagram.com https://platform.instagram.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "media-src 'self' blob:",
      "connect-src 'self' https://www.instagram.com https://api.zarinpal.com https://sandbox.zarinpal.com https://panel.spotplayer.ir https://*.sentry.io https://*.neshan.org",
      "frame-src 'self' https://www.instagram.com https://www.youtube.com https://www.aparat.com https://*.spotplayer.ir https://www.google.com https://*.neshan.org",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ");
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Content-Security-Policy", value: csp },
      { key: "X-DNS-Prefetch-Control", value: "off" },
    ];
    if (process.env.NODE_ENV === "production") {
      security.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    }
    return [
      { source: "/:path*", headers: security },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/dashboard/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/account/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // Never let the video vault responses be cached by shared caches or embedded elsewhere.
        source: "/api/video/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
