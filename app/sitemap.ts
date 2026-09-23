import type { MetadataRoute } from "next";
import { siteConfig } from "../lib/siteConfig";

// K5/L6: lists genuinely public routes only. /wizard, /resources and
// /tutorials were removed — all three are wrapped in <AuthGuard> (verified
// in their page.tsx files), so they are not actually public and should
// never have been in a public sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/login", "/signup", "/privacy", "/terms", "/disclaimer"];
  return routes.map((route) => ({
    url: `${siteConfig.siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.6,
  }));
}
