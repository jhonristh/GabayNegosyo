import type { MetadataRoute } from "next";

// NOTE: base URL is a placeholder — swap for the real production domain
// once this is deployed (see PROGRESS.md / DESIGN.md production checklist).
const BASE_URL = "https://gabaynegosyo.example";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/login", "/signup", "/wizard", "/resources", "/tutorials"];
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.6,
  }));
}
