import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native SVG renderer must be required at runtime, not bundled.
  serverExternalPackages: ["@resvg/resvg-js", "satori", "harfbuzzjs"],
};

export default nextConfig;
