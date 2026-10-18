import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribe } from "../../../lib/unsubscribeToken";

/**
 * Unsubscribe from reminder digests.
 *  GET  → a confirmation page (so mail scanners that prefetch links cannot unsubscribe anyone).
 *  POST → performs it (the page's button, and mail apps' one-click List-Unsubscribe).
 * The link is signed (HMAC of the user id), so it cannot be forged for someone else.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function page(title: string, body: string, status = 200, form?: string) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="margin:0;background:#F5F8F5;font-family:Arial,Helvetica,sans-serif;color:#17352B"><main style="max-width:480px;margin:10vh auto;padding:24px"><div style="background:#fff;border:1px solid #D3E2D8;border-radius:16px;padding:24px"><p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;color:#064E3B;font-weight:700">GABAYNEGOSYO</p><h1 style="margin:0 0 12px;font-size:22px">${title}</h1><p style="margin:0 0 16px;line-height:1.6;color:#52665C">${body}</p>${form ?? ""}</div></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function parse(req: Request) {
  const u = new URL(req.url);
  return { id: u.searchParams.get("u") ?? "", token: u.searchParams.get("t") ?? "" };
}

export async function GET(req: Request) {
  const { id, token } = parse(req);
  if (!id || !verifyUnsubscribe(id, token)) return page("This link is not valid", "The unsubscribe link is incomplete or has been changed. Please use the link from your most recent reminder email.", 400);
  return page("Stop reminder emails?", "You will no longer receive GabayNegosyo reminder summaries. Your checklist and deadlines in the app are not affected.", 200, `<form method="POST" action="${new URL(req.url).pathname}${new URL(req.url).search}"><button type="submit" style="min-height:48px;padding:0 20px;border:0;border-radius:10px;background:#064E3B;color:#fff;font-size:16px;font-weight:700;cursor:pointer">Yes, stop the emails</button></form>`);
}

export async function POST(req: Request) {
  const { id, token } = parse(req);
  if (!id || !verifyUnsubscribe(id, token)) return page("This link is not valid", "The unsubscribe link is incomplete or has been changed.", 400);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return page("Something went wrong", "Please try again later.", 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from("profiles").update({ reminders_unsubscribed_at: new Date().toISOString() }).eq("id", id);
  if (error) return page("Something went wrong", "We could not save that change. Please try again later.", 500);
  return page("You are unsubscribed", "You will not receive reminder emails from GabayNegosyo anymore.");
}
