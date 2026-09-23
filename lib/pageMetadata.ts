import type { Metadata } from "next";

/**
 * K7/L3: standard metadata shape for an authenticated route. Pages under
 * this app are almost all "use client" components (interactive dashboards,
 * forms), and a `metadata` export in a "use client" file is invalid Next.js
 * — so each authenticated route gets a co-located server `layout.tsx` that
 * calls this and wraps the client page.tsx (Next.js supports a layout and
 * page in the same segment; the layout can be a server component even when
 * the page it wraps is a client component).
 */
export function authenticatedPageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false },
  };
}
