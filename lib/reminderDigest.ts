/**
 * Pure helpers for the daily reminder digest (no framework imports, so they are unit-testable).
 *
 * Rules:
 *  - "Today" is the calendar date in Asia/Manila, not the server's UTC date.
 *  - An item is included only when its due date is exactly `daysBefore` days away.
 *  - Only items with a fixed due date ever reach here; "No fixed date" items never get reminders.
 *  - One email per person per day, listing every item that matches.
 */

export interface DigestItem {
  requirementId: string;
  name: string;
  agency: string;
  dueKey: string; // YYYY-MM-DD
  daysBefore: 7 | 3 | 1;
}

/** YYYY-MM-DD for the Asia/Manila calendar date of `now`. */
export function manilaDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Whole days from todayKey to dueKey (both YYYY-MM-DD). Negative when already past. */
export function daysUntilKey(todayKey: string, dueKey: string): number {
  const ms = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(dueKey) - ms(todayKey)) / 86_400_000);
}

export function dueLabel(dueKey: string): string {
  const [y, m, d] = dueKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export interface RenderInput {
  name: string;
  items: DigestItem[];
  siteUrl: string | null;
  unsubscribeUrl: string;
}

export interface RenderedDigest {
  subject: string;
  text: string;
  html: string;
}

const NOTICE =
  "This is an informational reminder from GabayNegosyo, not a government notice. Confirm the date and requirements with the agency before you file or pay.";

export function renderDigest({ name, items, siteUrl, unsubscribeUrl }: RenderInput): RenderedDigest {
  const sorted = [...items].sort((a, b) => a.dueKey.localeCompare(b.dueKey) || a.name.localeCompare(b.name));
  const first = name.trim().split(/\s+/)[0] || "there";
  const dayWord = (n: number) => (n === 1 ? "tomorrow" : `in ${n} days`);
  const subject =
    sorted.length === 1
      ? `GabayNegosyo: ${sorted[0].name} is due ${dayWord(sorted[0].daysBefore)}`
      : `GabayNegosyo: ${sorted.length} requirements coming up`;
  const link = (id: string) => (siteUrl ? `${siteUrl}/requirements/${encodeURIComponent(id)}` : "");

  const textLines = sorted.map((i) => `- ${i.name} (${i.agency}): due ${dueLabel(i.dueKey)}, ${dayWord(i.daysBefore)}${link(i.requirementId) ? `\n  ${link(i.requirementId)}` : ""}`);
  const text = [`Hi ${first},`, "", "These requirements are coming up:", "", ...textLines, "", NOTICE, "", `Stop these emails: ${unsubscribeUrl}`].join("\n");

  const rows = sorted
    .map((i) => {
      const href = link(i.requirementId);
      const title = href ? `<a href="${escapeHtml(href)}" style="color:#064E3B;font-weight:600">${escapeHtml(i.name)}</a>` : `<b>${escapeHtml(i.name)}</b>`;
      return `<tr><td style="padding:12px 0;border-top:1px solid #D3E2D8">${title}<br><span style="color:#52665C;font-size:14px">${escapeHtml(i.agency)} · due ${escapeHtml(dueLabel(i.dueKey))} (${dayWord(i.daysBefore)})</span></td></tr>`;
    })
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#F5F8F5;font-family:Arial,Helvetica,sans-serif;color:#17352B"><div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border:1px solid #D3E2D8;border-radius:16px;padding:24px"><p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;color:#064E3B;font-weight:700">GABAYNEGOSYO</p><h1 style="margin:0 0 12px;font-size:20px">Hi ${escapeHtml(first)}, here is what is coming up</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table><p style="margin:16px 0 0;font-size:13px;color:#52665C">${escapeHtml(NOTICE)}</p></div><p style="font-size:12px;color:#52665C;text-align:center">You asked for these reminders in GabayNegosyo. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#52665C">Stop these emails</a></p></div></body></html>`;
  return { subject, text, html };
}
