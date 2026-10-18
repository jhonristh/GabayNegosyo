import nodemailer from "nodemailer";

/**
 * Server-only mail sender for the reminder digest.
 *
 * EMAIL_PROVIDER=gmail   → Gmail SMTP with an App Password (GMAIL_USER, GMAIL_APP_PASSWORD).
 *                          Works without owning a domain; suited to a prototype (Gmail caps daily sends).
 * EMAIL_PROVIDER=resend  → Resend HTTP API (RESEND_API_KEY, EMAIL_FROM). Needs a verified domain to email other people.
 * anything else          → not configured: sending is refused (the cron route falls back to dry-run).
 */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}

export function mailerConfigured(): boolean {
  const p = process.env.EMAIL_PROVIDER;
  if (p === "gmail") return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  if (p === "resend") return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  return false;
}

export async function sendMail(msg: MailMessage): Promise<void> {
  const p = process.env.EMAIL_PROVIDER;
  if (p === "gmail") {
    const user = process.env.GMAIL_USER!;
    const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass: process.env.GMAIL_APP_PASSWORD! } });
    await transport.sendMail({ from: `GabayNegosyo <${user}>`, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html, headers: msg.headers });
    return;
  }
  if (p === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html, headers: msg.headers }),
    });
    if (!res.ok) throw new Error(`Resend rejected the message (${res.status})`);
    return;
  }
  throw new Error("No email provider configured.");
}
