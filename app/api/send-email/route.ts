import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/send-email   body: { subject: string, body: string }
 * Header: Authorization: Bearer <Supabase access token>
 *
 * Server-side only. Uses RESEND_API_KEY / EMAIL_FROM (NOT prefixed with
 * NEXT_PUBLIC_, so they never reach the browser).
 *
 * Demo accounts (profiles.is_demo) always get mock mode: their addresses are fake,
 * and real sends to fake addresses would bounce and hurt your sender reputation.
 *
 * Safety rules baked in — do not remove them, or this becomes an open mail relay:
 *   - caller must be logged in (token verified with Supabase)
 *   - caller must be premium or admin
 *   - the recipient is ALWAYS the caller's own verified email
 */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Server is missing Supabase configuration." }, { status: 500 });
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user?.email) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  // Read the role through RLS, using the caller's own token.
  const { data: profile } = await supabase.from("profiles").select("role, is_demo").eq("id", auth.user.id).maybeSingle();
  if (!profile || (profile.role !== "premium" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Email reminders are a Premium feature." }, { status: 403 });
  }

  let payload: { subject?: unknown; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const { subject, body } = payload;
  if (typeof subject !== "string" || typeof body !== "string" || !subject.trim() || !body.trim()) {
    return NextResponse.json({ error: "subject and body are required." }, { status: 400 });
  }
  if (subject.length > 200 || body.length > 5000) {
    return NextResponse.json({ error: "subject or body too long." }, { status: 400 });
  }

  if (profile.is_demo) {
    return NextResponse.json({ ok: true, mode: "mock" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    // Mock mode: nothing is sent, the app still logs the email like before.
    return NextResponse.json({ ok: true, mode: "mock" });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [auth.user.email], subject, text: body }),
  });

  if (!res.ok) {
    console.error("[send-email] provider error", res.status, await res.text());
    return NextResponse.json({ error: "The email provider rejected the request." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, mode: "sent" });
}
