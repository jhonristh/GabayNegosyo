import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Admin dashboard",
  "Aggregate metrics and content health for GabayNegosyo."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
