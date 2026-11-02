"use client";

import { AuthProvider, useAuth } from "../lib/auth";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";
import { ToastProvider } from "./ToastProvider";
import DbErrorToasts from "./DbErrorToasts";
import DemoBanner from "./DemoBanner";
import OfflineBanner from "./OfflineBanner";
import type { ReactNode } from "react";

/**
 * Picks the design-kit shell from the signed-in role. Presentation only:
 * "public" = Regulatory Atlas, "ledger" = Growth Ledger (Free/Premium),
 * "command" = Command Desk (admin). Access control still lives in the
 * AuthGuard / AdminGuard components and in Supabase, never in this switch.
 */
function Frame({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const shell = !user ? "public" : user.role === "admin" ? "command" : "ledger";
  return (
    <div className={`kit-shell kit-shell--${shell}`} data-shell={shell}>
      <DemoBanner />
      <OfflineBanner />
      <a className="gn-skip-link" href="#main-content">Skip to main content</a>
      <Navbar />
      <div className="kit-shell-body">
        <main id="main-content" className="page-content" tabIndex={-1}>{children}</main>
        <Footer />
      </div>
    </div>
  );
}

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ServiceWorkerRegistration />
        <DbErrorToasts />
        <Frame>{children}</Frame>
      </ToastProvider>
    </AuthProvider>
  );
}
