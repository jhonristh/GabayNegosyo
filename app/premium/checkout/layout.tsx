import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata("Upgrade to Premium", "Review Premium access. No payment is taken in this version.");

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
