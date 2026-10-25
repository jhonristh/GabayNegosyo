import type { ReactNode } from "react";

export const metadata = {
  title: "Reset password",
  robots: { index: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
