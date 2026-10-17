"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAccountOverview, syncMissingProfiles, type AccountOverview } from "../lib/adminAccounts";
import { useAuth } from "../lib/auth";

const REFRESH_MS = 60_000;

const SAMPLE: AccountOverview = {
  total: 3, free: 1, premium: 1, admins: 1, demo: 3, new7d: 0, authUsers: 3, missingProfiles: 0, orphanProfiles: 0,
};

/**
 * Live account numbers straight from Supabase (profiles + auth.users), with a visible
 * "in sync" check and a one-click re-sync. Refreshes every minute and when the tab regains focus.
 */
export default function AccountSyncPanel() {
  const { user } = useAuth();
  const preview = Boolean(user?.isDemo);
  const [data, setData] = useState<AccountOverview | null>(preview ? SAMPLE : null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [at, setAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (preview) return;
    setBusy(true);
    try {
      setData(await fetchAccountOverview());
      setError(null);
      setAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load accounts.");
    } finally {
      setBusy(false);
    }
  }, [preview]);

  useEffect(() => {
    load();
    if (preview) return;
    const timer = setInterval(load, REFRESH_MS);
    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onFocus); };
  }, [load, preview]);

  async function syncNow() {
    setBusy(true);
    setNotice(null);
    try {
      const created = await syncMissingProfiles();
      setNotice(created === 0 ? "Nothing to sync. Every account already has a profile." : `Created ${created} missing profile${created === 1 ? "" : "s"}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
      setBusy(false);
    }
  }

  const inSync = data ? data.missingProfiles === 0 && data.orphanProfiles === 0 : false;
  const stats: [string, number | string][] = data
    ? [["Accounts", data.total], ["Free", data.free], ["Premium", data.premium], ["Admins", data.admins], ["New in 7 days", data.new7d]]
    : [];

  return (
    <section className="kit-panel acct-panel" aria-labelledby="acct-title">
      <header className="acct-head">
        <div>
          <p className="v06-eyebrow">ACCOUNTS · LIVE FROM SUPABASE</p>
          <h2 id="acct-title">Users and sync</h2>
        </div>
        {!preview && (
          <button type="button" className="secondary-btn acct-refresh" onClick={load} disabled={busy} aria-busy={busy}>
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </header>

      {preview && <p className="hint">Sample numbers for the admin preview. Real counts appear for a real admin account.</p>}

      {error && (
        <div className="state-block state-block-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!data && !error && <div className="skeleton-list" aria-busy="true"><div className="skeleton-row" /></div>}

      {data && (
        <>
          <dl className="acct-stats">
            {stats.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>

          <p className={`acct-sync ${inSync ? "acct-sync--ok" : "acct-sync--warn"}`} role="status">
            <span aria-hidden="true">{inSync ? "✓" : "!"}</span>
            {inSync
              ? `In sync. ${data.authUsers} sign-in account${data.authUsers === 1 ? "" : "s"}, ${data.total} profile${data.total === 1 ? "" : "s"}.`
              : `${data.missingProfiles} sign-in account${data.missingProfiles === 1 ? " has" : "s have"} no profile yet${data.orphanProfiles ? ` · ${data.orphanProfiles} profile(s) have no matching sign-in` : ""}.`}
            {!inSync && !preview && data.missingProfiles > 0 && (
              <button type="button" className="primary-btn acct-sync-btn" onClick={syncNow} disabled={busy}>Sync now</button>
            )}
          </p>
          {notice && <p className="hint" role="status">{notice}</p>}
          {at && <p className="hint">Updated {at.toLocaleTimeString()} · refreshes every minute</p>}
        </>
      )}
    </section>
  );
}
