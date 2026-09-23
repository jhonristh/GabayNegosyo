import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Requirement detail",
  "Requirement details, required documents, and how to complete them."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
