"use client";

import { useEffect, useState } from "react";
import AdminGuard from "../../../components/AdminGuard";
import { useAuth } from "../../../lib/auth";
import { fetchAuditLog, type AuditRow } from "../../../lib/adminUsers";

/** Read-only audit trail of admin actions. Real admins only (enforced by the database function and RLS). */
const PAGE_SIZE = 25;

const ACTION_LABEL: Record<string, string> = {
  grant_premium: "Granted Premium",
  revoke_premium: "Revoked Premium",
  deactivate_account: "Deactivated account",
  reactivate_account: "Reactivated account",
  sync_profiles: "Synchronized profiles",
};

function AuditInner() {
  const { user } = useAuth();
  const preview = Boolean(user?.isDemo);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (preview) {
        setRows([]);
        setState("success");
        return;
      }
      setState("loading");
      try {
        const data = await fetchAuditLog(PAGE_SIZE + 1, page * PAGE_SIZE);
        if (cancelled) return;
        setRows(data);
        setState("success");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load the audit log.");
        setState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, retry, preview]);

  const visible = rows.slice(0, PAGE_SIZE);
  return (
    <main className="screen admin-screen">
      <header className="intro">
        <h1>Audit log</h1>
        <p>{preview ? "The admin preview has no real audit data." : "Every Premium and account-status change made by an admin, newest first."}</p>
      </header>

      {state === "loading" && <p aria-live="polite">Loading…</p>}
      {state === "error" && (
        <div className="state-block state-block-error">
          <p>We couldn&apos;t load the audit log.</p>
          <p className="hint">{error}</p>
          <button type="button" className="secondary-btn" onClick={() => setRetry((n) => n + 1)}>Try again</button>
        </div>
      )}
      {state === "success" && visible.length === 0 && <p className="hint">No admin actions recorded yet.</p>}

      {visible.map((r) => (
        <article key={r.id} className="checklist-card">
          <h3>{ACTION_LABEL[r.action] ?? r.action}</h3>
          <p className="docs"><strong>By:</strong> {r.actorEmail ?? "removed account"}{r.targetEmail ? <> · <strong>For:</strong> {r.targetEmail}</> : null}</p>
          {typeof r.details.reason === "string" && <p className="docs"><strong>Reason:</strong> {r.details.reason}</p>}
          {typeof r.details.expires_at === "string" && <p className="docs"><strong>Expires:</strong> {new Date(r.details.expires_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>}
          <p className="verified">{new Date(r.createdAt).toLocaleString("en-PH")}</p>
        </article>
      ))}

      {state === "success" && (page > 0 || rows.length > PAGE_SIZE) && (
        <div className="wizard-actions">
          <button type="button" className="secondary-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
          <button type="button" className="secondary-btn" disabled={rows.length <= PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </main>
  );
}

export default function AdminAuditPage() {
  return (
    <AdminGuard>
      <AuditInner />
    </AdminGuard>
  );
}
