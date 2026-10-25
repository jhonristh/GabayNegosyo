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
/**
 * mode says what really happened:
 *  - "sent": the email provider accepted the message.
 *  - "mock": nothing was sent (demo account, or no email provider configured on the server).
 *  - "demo": browser-only demo mode; nothing was sent and nothing left the browser.
 */
export interface SendResult extends SentEmail {
  mode: "sent" | "mock" | "demo";
}

export async function sendEmail(to: string, subject: string, body: string): Promise<SendResult> {
  // Demo mode: never call the server route or Supabase. Log a mock reminder locally.
  if (db.isDemo()) {
    const mock: SentEmail = { id: `demo-email-${Date.now()}`, to, subject, body, sentAt: new Date().toISOString() };
    db.addDemoSentEmail(mock);
    return { ...mock, mode: "demo" };
  }
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
  const result = (await res.json().catch(() => ({}))) as { mode?: string };

  // B2: the route itself writes the sent_emails log row server-side (using
  // the caller's own token) as part of enforcing the per-user rate limit —
  // logging it again here would double-count against that limit and could
  // let a modified client dodge it by skipping this call. Refresh the local
  // cache from Supabase instead of appending a locally-built record.
  await db.refreshSentEmails();
  const [latest] = db.getSentEmails();
  const record: SentEmail = latest ?? {
    id: `email-${Date.now()}`,
    to,
    subject,
    body,
    sentAt: new Date().toISOString(),
  };
  return { ...record, mode: result.mode === "sent" ? "sent" : "mock" };
}

export function buildReminderEmail(requirementName: string, dueDateLabel: string, daysBefore: number) {
  return {
    subject: `Reminder: ${requirementName} due ${dueDateLabel}`,
    body: `This is a reminder that "${requirementName}" is due on ${dueDateLabel} (${daysBefore} day(s) from now). Log in to GabayNegosyo to review the requirement.`,
  };
}
