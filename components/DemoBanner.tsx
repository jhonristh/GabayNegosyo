"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

/** Always-visible notice while a browser-only demo is active. */
export default function DemoBanner() {
  const { user, resetDemo, logout } = useAuth();
  const router = useRouter();
  if (!user?.isDemo) return null;
  return (
    <div className="demo-banner" role="region" aria-label="Demo mode">
      <p>
        <strong>Demo mode</strong> · sample data stored only in this browser. No real account or database is used
        {user.role === "admin" ? ", and this admin preview has no real admin access." : "."}
      </p>
      <div className="demo-banner-actions">
        <button type="button" className="secondary-btn" onClick={resetDemo}>
          Reset demo data
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
        >
          Exit demo
        </button>
      </div>
    </div>
  );
}
