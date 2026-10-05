import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata("Penalties", "Estimate late-filing penalties and see the rates used.");

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
