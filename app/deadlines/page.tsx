"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import DeadlineCalendar from "../../components/DeadlineCalendar";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { generateApplicableRequirements, resolveObligation, compareByDue, formatDueLabel, describeUndatedRequirement } from "../../lib/ruleEngine";
import { hasPremiumAccess } from "../../lib/entitlements";

import { useToast } from "../../components/ToastProvider";
import type { ReminderConfig } from "../../lib/types";

// Build-time flag: set NEXT_PUBLIC_REMINDERS_LIVE=true only when the daily digest job is live (REMINDERS_MODE=live).
const REMINDERS_LIVE = process.env.NEXT_PUBLIC_REMINDERS_LIVE === "true";

function DeadlinesInner() {
  const { user } = useAuth();
  const requirements = useMemo(() => db.getRequirements(), []);
  const agencies = useMemo(() => db.getAgencies(), []);
  const [, rerender] = useState(0);
  const { notify } = useToast();


  if (!user) return null;
  const profile = db.getBusinessProfile(user.id);

  if (!profile) {
    return (
      <main className="screen">
        <div className="empty-state">
          <h2>No business profile yet</h2>
          <Link href="/wizard" className="primary-btn">
            Start the wizard
          </Link>
        </div>
      </main>
    );
  }

  const applicable = generateApplicableRequirements(profile, requirements);
  const progress = db.getProgress();
  const isPremium = hasPremiumAccess(user);

  const items = applicable
    .map((req) => {
      const { dueDate, status } = resolveObligation(req, progress[req.id], new Date(), profile.createdAt);
      return { req, dueDate, status };
    })
    .sort(compareByDue);

  // Plan §8 buckets. Undated items are listed separately, never given a made-up date.
  const dated = items.filter((i) => i.dueDate);
  const undated = items.filter((i) => !i.dueDate);

  function toggleReminder(requirementId: string, current: ReminderConfig) {
    if (!isPremium) return;
    db.setReminderConfig({ ...current, enabled: !current.enabled });
    rerender((n) => n + 1);
  }

  function setDays(requirementId: string, current: ReminderConfig, days: 7 | 3 | 1) {
    if (!isPremium) return;
    db.setReminderConfig({ ...current, daysBefore: days });
    rerender((n) => n + 1);
  }


  return (
    <main className="screen">
      <header className="intro">
        <h1>Deadlines</h1>
        <p>Browse all scheduled compliance dates. Reminder preferences are optional and separate.</p>
      </header>

      <p className="hint">The calendar shows scheduled due dates for each month, whether or not reminders are enabled. Use the arrows to browse other months. Deadlines without a confirmed calendar date are listed below instead of being invented.</p>
      <DeadlineCalendar schedule={applicable} entries={dated.map(i => ({ id: i.req.id, name: i.req.name, date: i.dueDate as Date, status: i.status }))} showStatus={isPremium} />

      {dated.length === 0 && <p className="hint">There are no confirmed calendar dates for your requirements. Review the timing guidance below.</p>}

      {[...dated, ...undated].map(({ req, dueDate, status }) => {
        const agency = agencies.find((a) => a.id === req.agencyId)?.name ?? req.agencyId;
        const dueLabel = formatDueLabel(dueDate);
        const canRemind = isPremium && Boolean(dueDate);
        const config = db.getReminderConfig(req.id);

        return (
          <article key={req.id} className="checklist-card">
            <div className="checklist-card-header">
              <div>
                <span className="req-agency-tag">{agency}</span>
                <h3>{req.name}</h3>
                <p className="deadline">{dueDate ? `Due: ${dueLabel}` : `${describeUndatedRequirement(req)}: ${req.deadlineDescription}`}</p>
              </div>
              {isPremium && <StatusBadge status={status} />}
            </div>

            <div className="reminder-config">
              <p className="question-label">Remind me before this deadline</p>
              {!isPremium && <p className="hint">Email reminders are a Premium feature. Upgrade in Account to enable.</p>}
              {isPremium && !dueDate && <p className="hint">Reminders need a fixed date, and this requirement does not have one in the current content source.</p>}
              {canRemind && (
                <p className="hint">
                  {REMINDERS_LIVE
                    ? "Premium reminders are prepared and sent manually by the GabayNegosyo team, subject to your preferences."
                    : "Your reminder preference is saved. Reminders are handled manually by the GabayNegosyo team; enabling this does not send an automatic email."}
                </p>
              )}
              <div className="option-row">
                {[7, 3, 1].map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={!canRemind}
                    aria-pressed={config.daysBefore === d}
                    className={`option-btn small ${config.daysBefore === d ? "selected" : ""}`}
                    onClick={() => setDays(req.id, config, d as 7 | 3 | 1)}
                  >
                    {d} day{d > 1 ? "s" : ""} before
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" disabled={!canRemind} className="secondary-btn" onClick={() => toggleReminder(req.id, config)}>
                  {config.enabled ? "Reminder: On" : "Reminder: Off"}
                </button>

              </div>
            </div>
          </article>
        );
      })}
    </main>
  );
}

export default function DeadlinesPage() {
  return (
    <AuthGuard requireData>
      <DeadlinesInner />
    </AuthGuard>
  );
}
