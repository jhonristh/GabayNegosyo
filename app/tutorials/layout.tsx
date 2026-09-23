import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Learning hub",
  "Tutorials and guides for each compliance requirement."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
