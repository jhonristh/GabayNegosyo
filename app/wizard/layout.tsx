import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Registration wizard",
  "Answer a few questions to build your personalized compliance checklist."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
