"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "../../../components/AdminGuard";
import AdminHelp from "../../../components/AdminHelp";
import { useAuth } from "../../../lib/auth";
import { db } from "../../../lib/db";
import {
  buildManualReminder, loadManualReminderHistory, loadManualReminderQueue,
  manualReminderCandidates, manualReminderKey, recordManualReminder,
  type ReminderCandidate, type HistoryRow,
} from "../../../lib/manualReminders";

function ManualRemindersInner() {
  const { user } = useAuth();
  const previewOnly = Boolean(user?.isDemo);
  const requirements = useMemo(() => db.getRequirements(), []);
  const [items, setItems] = useState<ReminderCandidate[]>([]);
  const [recorded, setRecorded] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const reload = useCallback(async () => {
    if (previewOnly) { setItems([]); setRecorded([]); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [roster, history] = await Promise.all([loadManualReminderQueue(), loadManualReminderHistory()]);
      setItems(manualReminderCandidates(roster, requirements));
      setRecorded(history);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the reminder queue."); }
    finally { setLoading(false); }
  }, [previewOnly, requirements]);

  useEffect(() => { void reload(); }, [reload]);
  const prior = useMemo(() => new Set(recorded.map(r => `${r.user_id}|${r.requirement_id}|${r.due_date}|${r.days_before}`)), [recorded]);

  async function copy(item: ReminderCandidate) {
    setNotice(""); setError("");
    const message = buildManualReminder(item);
    try {
      await navigator.clipboard.writeText(`Subject: ${message.subject}\n\n${message.body}`);
      setNotice(`Copied reminder for ${item.userName || item.email}. Send it manually outside GabayNegosyo, then confirm below.`);
    } catch { setError("Clipboard access was refused. Copy the prepared message manually from its text box."); }
  }

  async function markSent(item: ReminderCandidate) {
    const id = manualReminderKey(item);
    if (confirmation !== id || prior.has(id) || busy) return;
    setBusy(id); setError(""); setNotice("");
    try {
      const inserted = await recordManualReminder(item);
      setNotice(inserted ? "Manual send recorded. No email was sent by GabayNegosyo." : "Already recorded for this deadline; no duplicate was created.");
      setConfirmation("");
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not record the reminder."); }
    finally { setBusy(""); }
  }

  return <main className="screen admin-screen">
    <header className="intro"><h1>Manual Premium reminders</h1>
      <p>Review opted-in Premium users and prepare deadline messages. Nothing here sends an email.</p></header>
    <p><Link href="/admin">Back to Admin dashboard</Link></p>
    <AdminHelp title="Manual reminder procedure" storageNote={false}
      steps={["Review each upcoming, source-backed due date and its saved reminder preference.", "Copy the message and send it outside GabayNegosyo using your team's approved manual process.", "Only after the external send succeeds, check the confirmation and record the manual send."]}
      warnings={["No automatic emails, cron jobs, or SMTP are enabled by this screen.", "Only opted-in, active, non-demo, non-admin Premium users appear. Entries without a verifiable calendar date are excluded.", "A duplicate for the same user, requirement, deadline and reminder offset cannot be recorded."]} />
    {previewOnly && <p role="status" className="hint">Demo preview: real users and reminder records are not displayed.</p>}
    {error && <p role="alert" className="hint" style={{color:"var(--red-text)"}}>{error}</p>}
    {notice && <p role="status" className="hint">{notice}</p>}
    <button type="button" className="option-btn small" onClick={() => void reload()} disabled={loading || previewOnly}>Refresh queue</button>
    {loading ? <p className="hint">Loading eligible reminders…</p> : items.length === 0 ? <p className="hint">No eligible upcoming reminders in the next 45 days. This may also mean nobody has opted in.</p> :
      <div className="kit-table-wrap"><table className="kit-table"><thead><tr><th>Recipient and business</th><th>Compliance deadline</th><th>Manual message</th><th>Record</th></tr></thead><tbody>
      {items.map(item => {
        const id = manualReminderKey(item);
        const sent = prior.has(id);
        const msg = buildManualReminder(item);
        return <tr key={id}>
          <td><strong>{item.userName || "Unnamed account"}</strong><div>{item.businessName}</div><small>{item.email}</small></td>
          <td><strong>{item.requirementName}</strong><div>Due: {item.dueKey}</div><small>Reminder date: {item.plannedReminderKey} ({item.daysBefore} days before)</small></td>
          <td><details><summary>Show prepared message</summary><p><strong>{msg.subject}</strong></p><textarea readOnly rows={9} value={msg.body} aria-label={`Prepared message for ${item.email}`} style={{width:"100%"}} /></details>
            <button type="button" className="option-btn small" onClick={() => void copy(item)}>Copy message</button></td>
          <td>{sent ? <span>Recorded as sent</span> : <>
            <label style={{display:"block"}}><input type="checkbox" checked={confirmation === id} onChange={e => setConfirmation(e.target.checked ? id : "")} /> I confirm this email was sent manually</label>
            <button type="button" className="option-btn small" disabled={confirmation !== id || Boolean(busy)} onClick={() => void markSent(item)}>{busy === id ? "Recording…" : "Record manual send"}</button>
          </>}</td>
        </tr>;
      })}</tbody></table></div>}
    <p className="hint">This queue is limited to the next 45 days, displays only source-backed calendar dates, and does not automatically send messages when a reminder date arrives. Eligibility is rechecked in Supabase when recording.</p>
  </main>;
}
export default function ManualRemindersPage() { return <AdminGuard><ManualRemindersInner /></AdminGuard>; }
