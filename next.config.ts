import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native SVG renderer must be required at runtime, not bundled.
  serverExternalPackages: ["@resvg/resvg-js", "satori", "harfbuzzjs"],
  experimental: {
    // Image/media uploads go through Server Actions; videos use the chunked route handler.
    serverActions: { bodySizeLimit: "25mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
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
