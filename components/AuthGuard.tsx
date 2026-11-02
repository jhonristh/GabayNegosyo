"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import DeactivatedNotice from "./DeactivatedNotice";
import { ErrorState, LoadingState } from "./StateBlocks";
import type { ReactNode } from "react";

/**
 * Keeps signed-out visitors off private pages and remembers where they were going, so logging in
 * returns them there (the login page only accepts paths inside this site: lib/validation.ts safeNextPath).
 *
 * `requireData`: pages that read the person's saved business profile and progress set this. If those
 * saved rows could not be loaded (for example a network failure), the page shows a retry message instead of
 * an empty checklist, which would look as if their progress had been lost.
 */
export default function AuthGuard({ children, requireData = false }: { children: ReactNode; requireData?: boolean }) {
  const { user, loading, reloadData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return (
      <main className="screen">
        <LoadingState message={loading ? "Loading…" : "Taking you to the log in page…"} />
      </main>
    );
  }

  // A deactivated account may only reactivate, log out or delete: nothing else renders (the database also blocks its data).
  if (user.deactivatedAt && !user.isDemo) return <DeactivatedNotice />;

  if (requireData && user.dataLoadFailed) {
    return (
      <main className="screen">
        <ErrorState
          message={
            retryFailed
              ? "We still could not load your saved information. Check your internet connection, then try again. Nothing has been lost or changed."
              : "We could not load your saved information, so we are not showing an empty checklist. Check your internet connection and try again. Nothing has been lost or changed."
          }
          onRetry={
            retrying
              ? undefined
              : async () => {
                  setRetrying(true);
                  setRetryFailed(false);
                  const ok = await reloadData();
                  setRetrying(false);
                  if (!ok) setRetryFailed(true);
                }
          }
        />
        {retrying && <LoadingState message="Trying again…" />}
      </main>
    );
  }

  return <>{children}</>;
}
