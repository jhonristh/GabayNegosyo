import type { SentEmail } from "./types";
import { db } from "./db";
import { getSupabase } from "./supabase";

/**
 * Email service layer (reminders).
 *
 * The browser never talks to the email provider directly — that would expose
 * the provider's API key. Instead it calls our own server route
 * (app/api/send-email/route.ts), which:
 *   1. verifies the caller's Supabase login,
 *   2. checks they are Premium/Admin,
 *   3. sends to the caller's OWN email address only,
 *   4. falls back to "mock" (nothing actually sent) if no provider key is set.
 *
 * The `to` argument is kept so existing callers don't change, but the server
 * ignores it and always uses the signed-in user's verified email.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<SentEmail> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You need to be logged in to send email.");

  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subject, body }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? `Email request failed (${res.status})`);
  }

  const record: SentEmail = {
    id: `email-${Date.now()}`,
    to,
    subject,
    body,
    sentAt: new Date().toISOString(),
  };
  db.appendSentEmail(record); // logged to Supabase so the admin dashboard can show it
  return record;
}

export function buildReminderEmail(requirementName: string, dueDateLabel: string, daysBefore: number) {
  return {
    subject: `Reminder: ${requirementName} due ${dueDateLabel}`,
    body: `This is a reminder that "${requirementName}" is due on ${dueDateLabel} (${daysBefore} day(s) from now). Log in to GabayNegosyo to review the requirement.`,
  };
}
