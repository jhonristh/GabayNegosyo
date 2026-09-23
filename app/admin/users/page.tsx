"use client";

import { useEffect, useState } from "react";
import AdminGuard from "../../../components/AdminGuard";
import { getSupabase } from "../../../lib/supabase";

/**
 * USER MANAGEMENT (WP2, WP14)
 *
 * Real, Supabase-backed, read-only, paginated, admin-only (enforced twice:
 * client-side by AdminGuard, and server-side by the "profiles: read own
 * row, admins read all" RLS policy — see database/supabase_setup.sql. The
 * shared demo admin does NOT count as a real admin for this policy, so it
 * cannot see this data even if it reaches this route.
 *
 * B1: paginated with a bounded range query, never `select *` unbounded; a
 * separate exact-count query drives the "N total" figure instead of
 * loading every row into the browser to count them.
 */

const PAGE_SIZE = 20;

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: "free" | "premium" | "admin";
  is_demo: boolean;
  created_at: string;
}

type LoadState = "loading" | "success" | "error";

function UsersInner() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"all" | "free" | "premium" | "admin">("all");
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState("loading");
      try {
        const supabase = getSupabase();
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const [{ data, error }, { count, error: countError }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, name, role, is_demo, created_at")
            .order("created_at", { ascending: false })
            .range(from, to),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
        ]);
        if (cancelled) return;
        if (error || countError) {
          setErrorMessage(error?.message ?? countError?.message ?? "Could not load users.");
          setState("error");
          return;
        }
        setRows((data ?? []) as ProfileRow[]);
        setTotal(count ?? 0);
        setState("success");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "Could not load users.");
        setState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, retry]);

  const hasNextPage = total !== null && (page + 1) * PAGE_SIZE < total;

  return (
    <main className="screen admin-screen">
      <header className="intro">
        <h1>Users</h1>
        <p>Registered accounts, read-only. Role changes are not made from this screen.</p>
      </header>

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
          <p>We couldn't load the user list.</p>
          <p className="hint">{errorMessage}</p>
          <button type="button" className="secondary-btn" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      <div className="filter-row" role="group" aria-label="Filter account roles on this page">{(["all","free","premium","admin"] as const).map(role=><button type="button" key={role} className={`filter-chip ${filter===role?"selected":""}`} onClick={()=>setFilter(role)}>{role === "all" ? "All roles" : role}</button>)}</div>
      <p className="hint">Role filters apply to this page of {PAGE_SIZE} accounts. Total account counts are unfiltered.</p>
      {rows.length > 0 && (
        <>
          <section className="dashboard-section">
            <div className="metric-grid">
              <div className="metric-card">
                <p className="metric-label">Total accounts</p>
                <p className="metric-value">{total ?? "…"}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Demo accounts (this page)</p>
                <p className="metric-value">{rows.filter((r) => r.is_demo).length}</p>
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            {rows.filter(u => filter === "all" || u.role === filter).length === 0 && <p className="hint">No {filter} accounts on this page.</p>}
            {rows.filter(u => filter === "all" || u.role === filter).map((u) => (
              <article key={u.id} className="checklist-card">
                <div className="checklist-card-header">
                  <div>
                    <h3>{u.name || u.email}</h3>
                    <p className="docs">{u.email}</p>
                  </div>
                  <span className={`content-badge content-badge-${u.role === "admin" ? "workbook_verified" : u.role === "premium" ? "needs_review" : "placeholder"}`}>
                    {u.role}
                    {u.is_demo ? " · demo" : ""}
                  </span>
                </div>
                <p className="verified">Joined {new Date(u.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
              </article>
            ))}
          </section>

          <div className="wizard-actions">
            <button type="button" className="secondary-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Previous
            </button>
            <button type="button" className="secondary-btn" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}

      {state === "success" && rows.length === 0 && <p className="hint">No accounts yet.</p>}
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
