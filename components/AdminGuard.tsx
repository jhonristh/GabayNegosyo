"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import type { ReactNode } from "react";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || user?.role !== "admin") {
    return (
      <main className="screen">
        <p>Checking admin access…</p>
      </main>
    );
  }

  return <>{children}</>;
}
