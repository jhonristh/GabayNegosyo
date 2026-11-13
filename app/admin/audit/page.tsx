"use client";

import { useEffect, useState } from "react";
import AdminGuard from "../../../components/AdminGuard";
import { useAuth } from "../../../lib/auth";
import { fetchAuditLog, type AuditRow } from "../../../lib/adminUsers";

/**
 * Read-only audit trail of admin actions. Real admins only (enforced by the database function and RLS).
 * Migration 008 makes the table append-only and records the status before/after each change (details.before / details.after).
 */
const PAGE_SIZE = 25;

const ACTION_LABEL: Record<string, string> = {
  grant_premium: "Granted Premium",
  revoke_premium: "Revoked Premium",
  deactivate_account: "Deactivated account",
  reactivate_account: "Reactivated account",
  sync_profiles: "Synchronized profiles",
};

const PLAN_WORD: Record<string, string> = { free: "Free", premium: "Premium", expired: "Free (Premium expired)", cancelled: "Free (Premium revoked)" };

/** Turns a recorded before/after object into one readable phrase, or null when this row has none (rows from before migration 008). */
function describeState(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.plan_status === "string") {
    const until = typeof o.plan_expires_at === "string" ? ` until ${new Date(o.plan_expires_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}` : "";
    return `${PLAN_WORD[o.plan_status] ?? o.plan_status}${o.plan_status === "premium" ? until : ""}`;
  }
  if (typeof o.deactivated === "boolean") return o.deactivated ? (o.deactivated_by_admin ? "Deactivated by an admin" : "Deactivated") : "Active";
  return null;
}

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
        <p>{preview ? "The admin preview has no real audit data." : "Every Premium and account-status change made by an admin, newest first. Entries cannot be edited or deleted."}</p>
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

      {state === "success" && visible.map((r) => (
        <article key={r.id} className="checklist-card">
          <h3>{ACTION_LABEL[r.action] ?? r.action}</h3>
          <p className="docs"><strong>By:</strong> {r.actorEmail ?? "removed account"}{r.targetEmail ? <> · <strong>For:</strong> {r.targetEmail}</> : null}</p>
          {typeof r.details.reason === "string" && <p className="docs"><strong>Reason:</strong> {r.details.reason}</p>}
          {typeof r.details.expires_at === "string" && <p className="docs"><strong>Expires:</strong> {new Date(r.details.expires_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>}
          {describeState(r.details.before) && describeState(r.details.after) && (
            <p className="docs"><strong>Change:</strong> {describeState(r.details.before)} → {describeState(r.details.after)}</p>
          )}
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
