import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Account",
  "Your account, business profile, and plan."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
