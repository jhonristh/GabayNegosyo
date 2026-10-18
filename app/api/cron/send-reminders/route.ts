import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import requirementsSeed from "../../../../data/requirements.json";
import agenciesSeed from "../../../../data/agencies.json";
import type { Agency, BusinessProfile, ChecklistItem, Requirement } from "../../../../lib/types";
import { generateApplicableRequirements, resolveObligation } from "../../../../lib/ruleEngine";
import { daysUntilKey, manilaDateKey, renderDigest, type DigestItem } from "../../../../lib/reminderDigest";
import { mailerConfigured, sendMail } from "../../../../lib/mailer";
import { parseSiteUrl } from "../../../../lib/authRedirect";
import { signUnsubscribe } from "../../../../lib/unsubscribeToken";

/**
 * GET /api/cron/send-reminders — runs once a day from Vercel Cron (vercel.json), 08:00 Asia/Manila.
 *
 * Sends ONE digest email per Premium/Admin person listing every requirement whose fixed due date is
 * exactly the number of days away they chose (7, 3 or 1). Items with "No fixed date" are never included.
 *
 * Safety:
 *  - Requires `Authorization: Bearer $CRON_SECRET` (Vercel adds it automatically when CRON_SECRET is set).
 *  - REMINDERS_MODE: "off" (default, does nothing) | "dry_run" (computes, sends nothing) | "live".
 *  - REMINDER_ALLOWLIST (comma-separated emails): when set, only these addresses receive anything.
 *  - Demo accounts and unsubscribed people are never emailed.
 *  - reminder_deliveries makes a re-run on the same day a no-op (no duplicate emails).
 *  - The JSON response only contains counts, never addresses.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_USERS = 500;
const MAX_SENDS_PER_RUN = 100;
const SCOPE = new Set(["bir", "sss", "philhealth", "pagibig", "lgu"]);

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function fetchByUsers<T>(admin: SupabaseClient, table: string, columns: string, ids: string[], extra?: (q: any) => any): Promise<T[]> {
  const rows: T[] = [];
  for (const part of chunk(ids, 100)) {
    let q = admin.from(table).select(columns).in("user_id", part);
    if (extra) q = extra(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
  }
  return rows;
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const configuredMode = process.env.REMINDERS_MODE ?? "off";
  if (configuredMode === "off") return NextResponse.json({ mode: "off", note: "Set REMINDERS_MODE to dry_run or live to enable." });

  const forceDry = new URL(req.url).searchParams.get("dry") === "1";
  let mode: "dry_run" | "live" = configuredMode === "live" && !forceDry ? "live" : "dry_run";
  let note: string | undefined;
  if (mode === "live" && !mailerConfigured()) {
    mode = "dry_run";
    note = "Email provider is not configured, so this ran as a dry run.";
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (!url || !serviceKey) return NextResponse.json({ error: "Supabase server configuration is missing." }, { status: 500 });
  if (!siteUrl) return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL must be set so emails can carry a working unsubscribe link." }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const allowlist = (process.env.REMINDER_ALLOWLIST ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  try {
    const { data: profileRows, error: pErr } = await admin
      .from("profiles")
      .select("id,email,name,role,is_demo,reminders_unsubscribed_at")
      .in("role", ["premium", "admin"])
      .eq("is_demo", false)
      .is("reminders_unsubscribed_at", null)
      .limit(MAX_USERS);
    if (pErr) return NextResponse.json({ error: `profiles: ${pErr.message}. Has migration 004_reminder_digest.sql been run?` }, { status: 500 });

    const people = (profileRows ?? []).filter((p) => p.email && (allowlist.length === 0 || allowlist.includes(String(p.email).toLowerCase())));
    const ids = people.map((p) => p.id as string);
    if (ids.length === 0) return NextResponse.json({ mode, note, users: 0, withItems: 0, sent: 0, skipped: 0, failed: 0 });

    const [configs, businessRows, progressRows] = await Promise.all([
      fetchByUsers<{ user_id: string; requirement_id: string; days_before: 7 | 3 | 1 }>(admin, "reminder_configs", "user_id,requirement_id,days_before", ids, (q) => q.eq("enabled", true)),
      fetchByUsers<{ user_id: string; data: BusinessProfile }>(admin, "business_profiles", "user_id,data", ids),
      fetchByUsers<{ user_id: string; requirement_id: string; business_id: string; status: string; due_date: string; completed_at: string | null }>(admin, "checklist_progress", "user_id,requirement_id,business_id,status,due_date,completed_at", ids),
    ]);

    const requirements = (requirementsSeed as unknown as Requirement[]).filter((r) => !r.archived && SCOPE.has(r.agencyId));
    const agencyName = new Map((agenciesSeed as Agency[]).map((a) => [a.id, a.name]));

    const todayKey = manilaDateKey(new Date());
    const [ty, tm, td] = todayKey.split("-").map(Number);
    const todayLocal = new Date(ty, tm - 1, td); // calendar date of Manila "today", read back by the rule engine as a local date

    let withItems = 0, sent = 0, skipped = 0, failed = 0;

    for (const person of people) {
      if (sent >= MAX_SENDS_PER_RUN) { skipped++; continue; }
      const profile = businessRows.find((b) => b.user_id === person.id)?.data;
      if (!profile) continue;
      const cfg = new Map(configs.filter((c) => c.user_id === person.id).map((c) => [c.requirement_id, c.days_before]));
      if (cfg.size === 0) continue;
      const progress = new Map<string, ChecklistItem>(
        progressRows.filter((r) => r.user_id === person.id).map((r) => [r.requirement_id, { requirementId: r.requirement_id, businessId: r.business_id, status: r.status as ChecklistItem["status"], dueDate: r.due_date, completedAt: r.completed_at ?? undefined }])
      );

      let items: DigestItem[] = [];
      for (const r of generateApplicableRequirements(profile, requirements)) {
        const daysBefore = cfg.get(r.id);
        if (!daysBefore) continue;
        const ob = resolveObligation(r, progress.get(r.id), todayLocal, profile.createdAt);
        if (!ob.dueKey || ob.status === "completed") continue;
        if (daysUntilKey(todayKey, ob.dueKey) !== daysBefore) continue;
        items.push({ requirementId: r.id, name: r.name, agency: agencyName.get(r.agencyId) ?? r.agencyId.toUpperCase(), dueKey: ob.dueKey, daysBefore });
      }
      if (items.length === 0) continue;

      // Already delivered for this cycle? (re-runs on the same day send nothing)
      const { data: existing } = await admin.from("reminder_deliveries").select("requirement_id,due_date,days_before").eq("user_id", person.id).in("requirement_id", items.map((i) => i.requirementId));
      const done = new Set((existing ?? []).map((e) => `${e.requirement_id}|${e.due_date}|${e.days_before}`));
      items = items.filter((i) => !done.has(`${i.requirementId}|${i.dueKey}|${i.daysBefore}`));
      if (items.length === 0) { skipped++; continue; }
      withItems++;
      if (mode === "dry_run") continue;

      // Claim the deliveries first so a concurrent run cannot send the same email twice.
      const rows = items.map((i) => ({ user_id: person.id, requirement_id: i.requirementId, due_date: i.dueKey, days_before: i.daysBefore }));
      const { data: claimed, error: cErr } = await admin.from("reminder_deliveries").upsert(rows, { onConflict: "user_id,requirement_id,due_date,days_before", ignoreDuplicates: true }).select("requirement_id,due_date,days_before");
      if (cErr) { failed++; continue; }
      const claimedKeys = new Set((claimed ?? []).map((c) => `${c.requirement_id}|${c.due_date}|${c.days_before}`));
      const toSend = items.filter((i) => claimedKeys.has(`${i.requirementId}|${i.dueKey}|${i.daysBefore}`));
      if (toSend.length === 0) { skipped++; continue; }

      const token = signUnsubscribe(person.id as string);
      if (!token) { failed++; continue; }
      const unsubscribeUrl = `${siteUrl}/api/unsubscribe?u=${encodeURIComponent(person.id as string)}&t=${token}`;
      const mail = renderDigest({ name: (person.name as string) || "", items: toSend, siteUrl, unsubscribeUrl });
      try {
        await sendMail({ to: person.email as string, subject: mail.subject, text: mail.text, html: mail.html, headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
        sent++;
        await admin.from("sent_emails").insert({ user_id: person.id, to_email: person.email, subject: mail.subject, body: mail.text });
      } catch {
        failed++;
        // Release the claim so tomorrow's run (or a retry) can try again.
        for (const r of toSend) await admin.from("reminder_deliveries").delete().eq("user_id", person.id).eq("requirement_id", r.requirementId).eq("due_date", r.dueKey).eq("days_before", r.daysBefore);
      }
    }

    return NextResponse.json({ mode, note, users: people.length, withItems, sent, skipped, failed });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Reminder run failed." }, { status: 500 });
  }
}
