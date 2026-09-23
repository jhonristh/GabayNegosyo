import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Deadlines",
  "Upcoming and overdue compliance deadlines with reminder settings."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
