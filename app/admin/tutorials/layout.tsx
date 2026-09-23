import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Manage tutorials",
  "Admin: create, edit, and archive tutorials."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
