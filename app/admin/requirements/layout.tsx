import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Manage requirements",
  "Admin: create, edit, and archive requirements."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
