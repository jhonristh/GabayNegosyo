"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import AdminGuard from "../../../components/AdminGuard";
import AdminHelp from "../../../components/AdminHelp";
import { getSupabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import {
  AdminActionError,
  fetchUserDirectory,
  grantPremium,
  revokePremium,
  setAccountStatus,
  type DirectoryRow,
} from "../../../lib/adminUsers";

/**
 * USER MANAGEMENT (v0.17)
 *
 * Admin-only. Enforced twice: client-side by AdminGuard (presentation) and server-side by the
 * SECURITY DEFINER functions in database/migrations/005 and 006, which re-check public.is_admin() and
 * write an audit row for every change (Admin → Audit log). The shared demo admin preview is not a real admin,
 * so in preview mode this page shows sample rows and never calls Supabase.
 *
 * If migrations 005/006 are not applied yet, the page falls back to the original read-only list.
 */

const PAGE_SIZE = 20;
type RoleFilter = "all" | "free" | "premium" | "admin";
type LoadState = "loading" | "success" | "error";
type Panel = { id: string; kind: "grant" | "revoke" | "deactivate" | "reactivate" } | null;

const DEMO_ROWS: DirectoryRow[] = [
  { id: "demo-1", email: "sample.one@demo.invalid", name: "Sample User One", role: "free", isDemo: true, createdAt: "2026-01-05T00:00:00Z", deactivatedAt: null, planStatus: "free", planSource: "none", planExpiresAt: null },
  { id: "demo-2", email: "sample.two@demo.invalid", name: "Sample User Two", role: "premium", isDemo: true, createdAt: "2026-02-10T00:00:00Z", deactivatedAt: null, planStatus: "premium", planSource: "demo", planExpiresAt: null },
  { id: "demo-3", email: "sample.admin@demo.invalid", name: "Sample Admin", role: "admin", isDemo: true, createdAt: "2026-03-15T00:00:00Z", deactivatedAt: null, planStatus: "premium", planSource: "admin_role", planExpiresAt: null },
];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

function planText(r: DirectoryRow): string {
  if (r.role === "admin") return "Admin (full access)";
  if (r.planStatus === "premium") return r.planExpiresAt ? `Premium until ${fmtDate(r.planExpiresAt)}` : "Premium (no expiry)";
  if (r.planStatus === "expired") return "Free (Premium expired)";
  if (r.planStatus === "cancelled") return "Free (Premium revoked)";
  return "Free";
}

function UsersInner() {
  const { user } = useAuth();
  const previewOnly = Boolean(user?.isDemo);
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [legacy, setLegacy] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (previewOnly) {
        // Admin PREVIEW: synthetic rows only. No Supabase call, no real user data.
        setRows(DEMO_ROWS);
        setTotal(DEMO_ROWS.length);
        setState("success");
        return;
      }
      setState("loading");
      try {
        const result = await fetchUserDirectory({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, role: filter, search: query });
        if (cancelled) return;
        setLegacy(false);
        setRows(result.rows);
        setTotal(result.total);
        setState("success");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AdminActionError && err.missingMigration) {
          // Migrations 005/006 not applied: keep the original read-only list working.
          try {
            const supabase = getSupabase();
            const from = page * PAGE_SIZE;
            let listQuery = supabase.from("profiles").select("id, email, name, role, is_demo, created_at").order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
            let countQuery = supabase.from("profiles").select("id", { count: "exact", head: true });
            if (filter !== "all") {
              listQuery = listQuery.eq("role", filter);
              countQuery = countQuery.eq("role", filter);
            }
            const [{ data, error }, { count, error: countError }] = await Promise.all([listQuery, countQuery]);
            if (cancelled) return;
            if (error || countError) throw new Error(error?.message ?? countError?.message ?? "Could not load users.");
            setRows(
              ((data ?? []) as { id: string; email: string; name: string; role: DirectoryRow["role"]; is_demo: boolean; created_at: string }[]).map((p) => ({
                id: p.id, email: p.email, name: p.name, role: p.role, isDemo: p.is_demo, createdAt: p.created_at, deactivatedAt: null,
                planStatus: p.role === "free" ? "free" : "premium", planSource: "legacy_role", planExpiresAt: null,
              }))
            );
            setTotal(count ?? 0);
            setLegacy(true);
            setState("success");
            return;
          } catch (fallbackErr) {
            setErrorMessage(fallbackErr instanceof Error ? fallbackErr.message : "Could not load users.");
            setState("error");
            return;
          }
        }
        setErrorMessage(err instanceof Error ? err.message : "Could not load users.");
        setState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, retry, previewOnly, filter, query]);

  const openPanel = useCallback((id: string, kind: NonNullable<Panel>["kind"]) => {
    setPanel({ id, kind });
    setReason("");
    setExpiresOn("");
    setNotice(null);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!panel || busy || previewOnly) return;
    setBusy(true);
    setNotice(null);
    try {
      let warning: string | undefined;
      if (panel.kind === "grant") await grantPremium(panel.id, expiresOn, reason);
      else if (panel.kind === "revoke") await revokePremium(panel.id, reason);
      else warning = (await setAccountStatus(panel.id, panel.kind === "deactivate", reason)).warning;
      setNotice(warning ? { kind: "error", text: `Saved and added to the audit log. Note: ${warning}` } : { kind: "ok", text: "Saved and added to the audit log." });
      setPanel(null);
      setRetry((n) => n + 1); // reload from the server so the list shows what was actually stored
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "The change was not saved." });
    } finally {
      setBusy(false);
    }
  }

  const hasNextPage = total !== null && (page + 1) * PAGE_SIZE < total;
  const labels: Record<NonNullable<Panel>["kind"], string> = {
    grant: "Grant Premium", revoke: "Revoke Premium", deactivate: "Deactivate account", reactivate: "Reactivate account",
  };

  return (
    <main className="screen admin-screen">
      <header className="intro">
        <h1>Users</h1>
        <p>{previewOnly ? "Sample data for the admin preview. No real accounts are shown and nothing can be changed." : "Registered accounts, their plan and status. Every change is recorded in the audit log."}</p>
      </header>

      <AdminHelp
        steps={[
          "Search by name or email, and use the role filter to narrow the list.",
          "Choose Manage on an account to grant or revoke Premium, or to deactivate or reactivate it. A reason is required.",
          "Open the Audit log to see who changed what and when.",
        ]}
        warnings={[
          "Admin accounts cannot be changed from this screen, and you cannot change your own status.",
          "Premium is granted manually while payments are not connected. Nothing is charged.",
        ]}
        title="User management"
        storageNote={false}
      >
        Look up accounts, manage Premium access and account status. <Link href="/admin/audit" className="tutorial-link">Open the audit log</Link>
      </AdminHelp>

      {legacy && (
        <p className="hint" role="status">
          Read-only list: run database/migrations/005_account_lifecycle.sql and 006_entitlements.sql in the Supabase SQL editor to turn on Premium and account management.
        </p>
      )}
      {notice && <p role={notice.kind === "error" ? "alert" : "status"} className="hint" style={notice.kind === "error" ? { color: "var(--red-text)" } : undefined}>{notice.text}</p>}

      {state === "loading" && rows.length === 0 && (
        <div className="skeleton-list" aria-live="polite" aria-busy="true">
          <span className="visually-hidden">Loading users…</span>
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {state === "error" && (
        <div className="state-block state-block-error">
          <p>We couldn&apos;t load the user list.</p>
          <p className="hint">{errorMessage}</p>
          <button type="button" className="secondary-btn" onClick={() => setRetry((n) => n + 1)}>Try again</button>
        </div>
      )}

      <form className="question" role="search" onSubmit={(e) => { e.preventDefault(); setPage(0); setQuery(search); }}>
        <label className="question-label" htmlFor="user-search">Search accounts</label>
        <input id="user-search" type="search" className="text-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" disabled={previewOnly || legacy} />
      </form>

      <div className="filter-row" role="group" aria-label="Filter accounts by role">
        {(["all", "free", "premium", "admin"] as const).map((role) => (
          <button type="button" key={role} className={`filter-chip ${filter === role ? "selected" : ""}`} aria-pressed={filter === role} onClick={() => { setFilter(role); setPage(0); }}>
            {role === "all" ? "All" : role}
          </button>
        ))}
      </div>
      <p className="hint">Filters search all accounts, {PAGE_SIZE} per page.</p>

      {rows.length > 0 && (
        <>
          <section className="dashboard-section" aria-label="Account totals">
            <div className="metric-grid">
              <div className="metric-card">
                <p className="metric-label">{filter === "all" ? "Total accounts" : `${filter} accounts`}</p>
                <p className="metric-value">{total ?? "…"}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Demo accounts (this page)</p>
                <p className="metric-value">{rows.filter((r) => r.isDemo).length}</p>
              </div>
            </div>
          </section>

          <section className="dashboard-section" aria-label="Accounts">
            {rows.map((u) => {
              const isAdmin = u.role === "admin";
              const open = panel?.id === u.id ? panel : null;
              return (
                <article key={u.id} className="checklist-card">
                  <div className="checklist-card-header">
                    <div>
                      <h3>{u.name || u.email}</h3>
                      <p className="docs">{u.email}</p>
                    </div>
                    <span className={`content-badge content-badge-${isAdmin ? "workbook_verified" : u.planStatus === "premium" ? "needs_review" : "placeholder"}`}>
                      {u.role}{u.isDemo ? " · demo" : ""}
                    </span>
                  </div>
                  <p className="docs"><strong>Plan:</strong> {planText(u)}</p>
                  <p className="docs"><strong>Status:</strong> {u.deactivatedAt ? `Deactivated ${fmtDate(u.deactivatedAt)}` : "Active"}</p>
                  <p className="verified">Joined {fmtDate(u.createdAt)}</p>

                  {!previewOnly && !legacy && !isAdmin && u.id !== user?.id && (
                    <div className="filter-row" role="group" aria-label={`Manage ${u.email}`}>
                      {!u.isDemo && <button type="button" className="secondary-btn" onClick={() => openPanel(u.id, "grant")}>Grant Premium</button>}
                      {(u.planStatus === "premium") && !u.isDemo && <button type="button" className="secondary-btn" onClick={() => openPanel(u.id, "revoke")}>Revoke Premium</button>}
                      {u.deactivatedAt
                        ? <button type="button" className="secondary-btn" onClick={() => openPanel(u.id, "reactivate")}>Reactivate</button>
                        : <button type="button" className="secondary-btn" onClick={() => openPanel(u.id, "deactivate")}>Deactivate</button>}
                    </div>
                  )}

                  {open && (
                    <form onSubmit={submit} className="admin-add-form" aria-label={`${labels[open.kind]} for ${u.email}`}>
                      <h4>{labels[open.kind]}: {u.email}</h4>
                      {open.kind === "grant" && (
                        <>
                          <label className="question-label" htmlFor={`exp-${u.id}`}>Expires on (optional)</label>
                          <input id={`exp-${u.id}`} type="date" className="text-input" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
                          <p className="hint">Leave empty for no expiry. When it passes, the account returns to Free automatically.</p>
                        </>
                      )}
                      <label className="question-label" htmlFor={`why-${u.id}`}>Reason (required, 3 to 300 characters)</label>
                      <input id={`why-${u.id}`} className="text-input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required minLength={3} />
                      <div className="wizard-actions">
                        <button type="button" className="secondary-btn" onClick={() => setPanel(null)} disabled={busy}>Cancel</button>
                        <button type="submit" className="primary-btn" disabled={busy || reason.trim().length < 3} aria-busy={busy}>{busy ? "Saving…" : "Confirm"}</button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </section>

          <div className="wizard-actions">
            <button type="button" className="secondary-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
            <button type="button" className="secondary-btn" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}

      {state === "success" && rows.length === 0 && <p className="hint">No accounts match.</p>}
    </main>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <UsersInner />
    </AdminGuard>
  );
}
