"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

// Browser-side Supabase client. The anon key is public by design; every table
// is protected by Row-Level Security (see supabase/migrations/0002_rls.sql).
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
