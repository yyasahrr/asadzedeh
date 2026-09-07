import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/store";

export default function robots(): MetadataRoute.Robots {
  const base = getSettings().site.siteUrl.replace(/\/$/, "") || "https://asadzedeh.ir";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/instructor", "/account", "/auth", "/api", "/cart", "/checkout"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
