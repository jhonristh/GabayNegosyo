"use client";

import { AuthProvider } from "../lib/auth";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";
import { ToastProvider } from "./ToastProvider";
import DbErrorToasts from "./DbErrorToasts";
import type { ReactNode } from "react";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ServiceWorkerRegistration />
        <DbErrorToasts />
        <Navbar />
        <div className="page-content">{children}</div>
        <Footer />
      </ToastProvider>
    </AuthProvider>
  );
}
