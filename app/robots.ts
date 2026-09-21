import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/instructor$", "/instructor/", "/account", "/auth", "/api", "/cart", "/checkout"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
