import type { MetadataRoute } from "next";
import { siteConfig } from "../lib/siteConfig";

// K4/K5/L6: no hardcoded placeholder domain, and a disallow list alone
// does not stop indexing (a robots.txt Disallow just asks crawlers not to
// fetch the page — it doesn't remove an already-indexed URL, and a page
// linked from elsewhere can still get indexed without ever being crawled).
// The real fix for authenticated pages is `robots: { index: false }` in
// their own metadata (K7) — this file is a second, defense-in-depth layer,
// not the primary mechanism.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/dashboard", "/checklist", "/wizard", "/deadlines", "/resources", "/tutorials", "/premium", "/requirements", "/api"],
    },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}
