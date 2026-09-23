"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import DeadlineCalendar from "../../components/DeadlineCalendar";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { generateApplicableRequirements, computeNextDueDate, computeStatus } from "../../lib/ruleEngine";
import { isPremiumRole } from "../../lib/authorization";
import { sendEmail, buildReminderEmail } from "../../lib/email";
import type { ReminderConfig } from "../../lib/types";

function DeadlinesInner() {
  const { user } = useAuth();
  const requirements = useMemo(() => db.getRequirements(), []);
  const agencies = useMemo(() => db.getAgencies(), []);
  const [, rerender] = useState(0);

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
  const isPremium = isPremiumRole(user.role);

  const items = applicable
    .map((req) => {
      const dueDate = computeNextDueDate(req);
      const completedAt = progress[req.id]?.completedAt;
      return { req, dueDate, status: computeStatus(dueDate, completedAt) };
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

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

  async function sendTestReminder(requirementName: string, dueLabel: string, days: number) {
    if (!isPremium || !user) return;
    const { subject, body } = buildReminderEmail(requirementName, dueLabel, days);
    await sendEmail(user.email, subject, body);
    rerender((n) => n + 1);
  }

  return (
    <main className="screen">
      <header className="intro">
        <h1>Deadlines</h1>
        <p>Track every upcoming requirement and configure reminders.</p>
      </header>

      <DeadlineCalendar entries={items.filter(i => i.status !== "completed").map(i => ({ id: i.req.id, name: i.req.name, date: i.dueDate, status: i.status }))} />

      {items.map(({ req, dueDate, status }) => {
        const agency = agencies.find((a) => a.id === req.agencyId)?.name ?? req.agencyId;
        const dueLabel = dueDate.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
        const config = db.getReminderConfig(req.id);

        return (
          <article key={req.id} className="checklist-card">
            <div className="checklist-card-header">
              <div>
                <span className="req-agency-tag">{agency}</span>
                <h3>{req.name}</h3>
                <p className="deadline">Due: {dueLabel}</p>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="reminder-config">
              <p className="question-label">Remind me before this deadline</p>
              {!isPremium && <p className="hint">Email reminders are a Premium feature. Upgrade in Account to enable.</p>}
              <div className="option-row">
                {[7, 3, 1].map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={!isPremium}
                    className={`option-btn small ${config.daysBefore === d ? "selected" : ""}`}
                    onClick={() => setDays(req.id, config, d as 7 | 3 | 1)}
                  >
                    {d} day{d > 1 ? "s" : ""} before
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" disabled={!isPremium} className="secondary-btn" onClick={() => toggleReminder(req.id, config)}>
                  {config.enabled ? "Reminder: On" : "Reminder: Off"}
                </button>
                <button
                  type="button"
                  disabled={!isPremium}
                  className="secondary-btn"
                  onClick={() => sendTestReminder(req.name, dueLabel, config.daysBefore)}
                >
                  Send test reminder
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
    <AuthGuard>
      <DeadlinesInner />
    </AuthGuard>
  );
}
