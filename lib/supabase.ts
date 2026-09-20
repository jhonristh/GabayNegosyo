import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single Supabase browser client for the whole app.
 *
 * Created lazily (on first use, in the browser) instead of at import time,
 * so `next build` on Vercel can still prerender pages even before you have
 * added the environment variables — the error only appears if the app is
 * actually run without them.
 *
 * NEXT_PUBLIC_SUPABASE_ANON_KEY accepts either the legacy "anon" key or the
 * newer "publishable" key (sb_publishable_...). Both are safe to expose in
 * the browser; your data is protected by Row Level Security, not by hiding
 * this key.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "in .env.local (local) or in Vercel → Settings → Environment Variables (deployed), then restart/redeploy."
    );
  }

  client = createClient(url, key);
  return client;
}
