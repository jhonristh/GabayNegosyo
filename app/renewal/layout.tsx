import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata("Renewal and Post-Registration", "Renew permits, keep filing, and stay compliant after registration.");

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
