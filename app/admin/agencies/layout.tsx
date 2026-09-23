import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Manage agencies",
  "Admin: create, edit, and archive agencies."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
