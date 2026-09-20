"use client";

import { AuthProvider } from "../lib/auth";
import Navbar from "./Navbar";
import type { ReactNode } from "react";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <div className="page-content">{children}</div>
    </AuthProvider>
  );
}
