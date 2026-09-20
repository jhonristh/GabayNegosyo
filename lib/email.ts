import type { SentEmail } from "./types";
import { db } from "./db";

/**
 * Email service layer. In local/demo mode (no EMAIL_PROVIDER_API_KEY set),
 * "sending" an email logs it to the local sent-mail log instead of making
 * a network call. Swap the body of sendEmail() for a real provider
 * (Resend, SendGrid, AWS SES, etc.) using the env vars in .env.example —
 * no caller code needs to change.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<SentEmail> {
  const providerConfigured = Boolean(process.env.NEXT_PUBLIC_EMAIL_PROVIDER);

  const record: SentEmail = {
    id: `email-${Date.now()}`,
    to,
    subject,
    body,
    sentAt: new Date().toISOString(),
  };

  if (!providerConfigured) {
    // Mock mode: persist to local log so the UI can show "reminder sent".
    console.info("[mock email] to:", to, "| subject:", subject);
    db.appendSentEmail(record);
    return record;
  }

  // Real provider integration point (not implemented in the prototype):
  // await fetch(process.env.EMAIL_PROVIDER_ENDPOINT, { ... })
  db.appendSentEmail(record);
  return record;
}

export function buildReminderEmail(requirementName: string, dueDateLabel: string, daysBefore: number) {
  return {
    subject: `Reminder: ${requirementName} due ${dueDateLabel}`,
    body: `This is a reminder that "${requirementName}" is due on ${dueDateLabel} (${daysBefore} day(s) from now). Log in to GabayNegosyo to review the requirement.`,
  };
}
