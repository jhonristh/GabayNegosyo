import type { ReactNode } from "react";

export const metadata = {
  title: "Log in",
  description: "Log in to your GabayNegosyo account to view your compliance checklist.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
