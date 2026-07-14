import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

// SERVER-ONLY service-role client. It bypasses RLS, so it is used only for a
// single, narrowly-scoped admin operation: removing a user's lost MFA factor
// during account recovery (a locked-out AAL1 session cannot unenrol a verified
// factor itself). Never import this into client code, and never expose the key
// (SUPABASE_SERVICE_ROLE_KEY is a server secret, not NEXT_PUBLIC_*).

export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createSupabaseClient(publicEnv.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
