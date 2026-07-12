import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

// Server-only helpers for reading the current user and their household.

export async function getUser() {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export type Membership = { household_id: string; role: string };

export async function getMembership(): Promise<Membership | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("household_id, role")
    .limit(1)
    .maybeSingle();
  return (data as Membership | null) ?? null;
}

// Is a second factor required but not yet satisfied for this session?
export async function needsSecondFactor(): Promise<boolean> {
  if (!hasSupabaseEnv()) return false;
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!data) return false;
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}
