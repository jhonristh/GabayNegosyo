import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Checklist preview",
  "A read-only preview of your personalized compliance checklist. Create a free account to save it."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
