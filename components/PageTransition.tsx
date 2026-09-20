"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Beautification pass §7. CSS-only animation (pageFadeUp, defined in
 * globals.css on `.page-content > *`) — no Framer Motion or other new
 * dependency. Keying by pathname forces React to remount this wrapper on
 * route change, which restarts the CSS animation reliably rather than
 * depending on incidental DOM diffing between routes.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname}>{children}</div>;
}
