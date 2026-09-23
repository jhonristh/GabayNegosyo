import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Resource library",
  "Search official BIR forms, guides, and resources."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
