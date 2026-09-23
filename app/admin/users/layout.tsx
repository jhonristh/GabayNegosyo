import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Users",
  "Admin: read-only, paginated list of registered accounts."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
