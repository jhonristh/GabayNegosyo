import type { ReactNode } from "react";
import { authenticatedPageMetadata } from "../../../lib/pageMetadata";

export const metadata = authenticatedPageMetadata(
  "Penalty Simulator",
  "Estimate the potential penalty for a specific requirement."
);

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
