import type { ReactNode } from "react";

export const metadata = {
  title: "Sign up",
  description: "Create a free GabayNegosyo account and build your personalized BIR compliance checklist.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
