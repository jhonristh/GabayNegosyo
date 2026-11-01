"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import DeactivatedNotice from "./DeactivatedNotice";
import type { ReactNode } from "react";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="screen">
        <p>Loading…</p>
      </main>
    );
  }

  // A deactivated account may only reactivate, log out or delete: nothing else renders (the database also blocks its data).
  if (user.deactivatedAt && !user.isDemo) return <DeactivatedNotice />;

  return <>{children}</>;
}
