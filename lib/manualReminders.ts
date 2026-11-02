import { getSupabase } from "./supabase";
import { calendarOccurrences } from "./calendarOccurrences";
import { generateApplicableRequirements } from "./ruleEngine";
import type { BusinessProfile, Requirement } from "./types";

export type QueueRow = {
  user_id: string;
  email: string;
  display_name: string;
  business_name: string;
  profile_data: Partial<BusinessProfile>;
  requirement_id: string;
  days_before: 1 | 3 | 7;
  plan_expires_at: string | null;
};
export type HistoryRow = {
  user_id: string;
  requirement_id: string;
  due_date: string;
  days_before: number;
  recorded_at: string;
};
export type ReminderCandidate = {
  userId: string;
  email: string;
  userName: string;
  businessName: string;
  requirementId: string;
  requirementName: string;
  dueKey: string;
  daysBefore: 1 | 3 | 7;
  plannedReminderKey: string;
};

const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dayDifference = (from: Date, to: Date) =>
  Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000);

/** The queue is computed only for consented reminder configurations, eligible
 * Premium accounts and requirements from the official shipped catalog.
 * An unknown or event-based due date never becomes a fictional reminder. */
export function manualReminderCandidates(rows: QueueRow[], requirements: Requirement[], today = new Date(), lookaheadDays = 45): ReminderCandidate[] {
  const byId = new Map(requirements.filter(r => !r.archived).map(r => [r.id, r]));
  const result: ReminderCandidate[] = [];
  for (const row of rows) {
    if (!row.user_id || !row.email || ![1,3,7].includes(row.days_before)) continue;
    const req = byId.get(row.requirement_id);
    const profile = row.profile_data;
    if (!req || !profile || !profile.taxpayerType || !profile.taxType || !profile.status || !profile.businessType || !profile.businessStructure) continue;
    if (!generateApplicableRequirements(profile as BusinessProfile, [req]).length) continue;
    for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
      for (const due of calendarOccurrences(req, year)) {
        const days = dayDifference(today, due);
        if (days < 0 || days > lookaheadDays) continue;
        const reminderDate = new Date(due.getFullYear(), due.getMonth(), due.getDate() - row.days_before);
        result.push({
          userId: row.user_id,
          email: row.email,
          userName: row.display_name,
          businessName: row.business_name || "Business name not provided",
          requirementId: req.id,
          requirementName: req.name,
          dueKey: key(due),
          daysBefore: row.days_before,
          plannedReminderKey: key(reminderDate),
        });
      }
    }
  }
  return result.sort((a,b) => a.dueKey.localeCompare(b.dueKey) || a.email.localeCompare(b.email));
}

export const manualReminderKey = (item: Pick<ReminderCandidate, "userId" | "requirementId" | "dueKey" | "daysBefore">) =>
  `${item.userId}|${item.requirementId}|${item.dueKey}|${item.daysBefore}`;

export function buildManualReminder(item: ReminderCandidate): { subject: string; body: string } {
  return {
    subject: `GabayNegosyo reminder: ${item.requirementName} — ${item.dueKey}`,
    body: `Hello ${item.userName || "there"},\n\nThis is a manual GabayNegosyo reminder for ${item.businessName}.\n\nRequirement: ${item.requirementName}\nDue date: ${item.dueKey}\nReminder preference: ${item.daysBefore} day(s) before due date.\n\nPlease confirm requirements and any changes with the relevant government agency before filing. GabayNegosyo does not file forms or guarantee compliance.\n\n— GabayNegosyo Team`,
  };
}

export async function loadManualReminderQueue(): Promise<QueueRow[]> {
  const { data, error } = await getSupabase().rpc("admin_manual_reminder_queue");
  if (error) throw new Error(`Unable to load reminder queue: ${error.message}`);
  return (Array.isArray(data) ? data : []) as QueueRow[];
}
export async function loadManualReminderHistory(): Promise<HistoryRow[]> {
  const { data, error } = await getSupabase().rpc("admin_manual_reminder_history");
  if (error) throw new Error(`Unable to load reminder history: ${error.message}`);
  return (Array.isArray(data) ? data : []) as HistoryRow[];
}
export async function recordManualReminder(item: ReminderCandidate): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("admin_record_manual_reminder", {
    p_user: item.userId, p_requirement: item.requirementId,
    p_due: item.dueKey, p_days: item.daysBefore,
  });
  if (error) throw new Error(`Reminder not recorded: ${error.message}`);
  return data === true;
}
