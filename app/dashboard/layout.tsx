import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Dashboard",
  "Your personalized BIR compliance checklist and progress."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
