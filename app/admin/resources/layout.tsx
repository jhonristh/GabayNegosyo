import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Manage resources",
  "Admin: create, edit, and archive resources."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
