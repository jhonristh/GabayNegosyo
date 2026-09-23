import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Checklist",
  "Your full compliance checklist, grouped by stage and filterable by status and agency."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
