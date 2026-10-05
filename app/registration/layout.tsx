import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata("Business Registration", "Step-by-step registration guidelines for a sole proprietor, with or without employees.");

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
