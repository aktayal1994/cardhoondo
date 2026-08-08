import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for API routes (uses the service-role key, so
 * it bypasses RLS -- see supabase/schema.sql's policies section for what
 * that means for reads/writes). Never import this into client components;
 * the service role key must never reach the browser.
 */
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY -- see .env.example.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
