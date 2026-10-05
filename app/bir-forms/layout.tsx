import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata("BIR Forms", "Find the BIR forms that apply to your situation.");

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
