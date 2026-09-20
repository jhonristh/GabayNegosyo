"use client";

import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";

function AccountInner() {
  const { user, logout, upgradeToPremium } = useAuth();
  const router = useRouter();

  if (!user) return null;
  const profile = db.getBusinessProfile(user.id);

  return (
    <main className="screen">
      <header className="intro">
        <h1>Account</h1>
      </header>

      <section className="checklist-card">
        <h3>{user.name}</h3>
        <p className="docs">{user.email}</p>
        <p className="docs">
          Plan: <strong>{user.role === "premium" ? "Premium" : user.role === "admin" ? "Admin" : "Free"}</strong>
        </p>
      </section>

      {profile && (
        <section className="checklist-card">
          <h3>{profile.businessName}</h3>
          <p className="docs">
            {profile.businessType.replace(/_/g, " ")} · {profile.businessStructure.replace(/_/g, " ")} · {profile.location}
          </p>
        </section>
      )}

      {user.role === "free" && (
        <section className="premium-lock">
          <p className="premium-lock-title">Upgrade to Premium</p>
          <p className="premium-lock-body">
            Unlock full requirement details, tutorials, the penalty simulator, and email reminders.
            (Demo mode — no real payment is processed.)
          </p>
          <button type="button" className="primary-btn premium-lock-btn" onClick={upgradeToPremium}>
            Upgrade now (demo)
          </button>
        </section>
      )}

      <button
        type="button"
        className="secondary-btn"
        style={{ marginTop: 20 }}
        onClick={() => {
          logout();
          router.push("/");
        }}
      >
        Log out
      </button>
    </main>
  );
}

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountInner />
    </AuthGuard>
  );
}
