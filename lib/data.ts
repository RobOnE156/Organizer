import type { SupabaseClient } from "@supabase/supabase-js";

// Data-access helpers for the authenticated app. Every query runs under the
// user's session, so RLS (0002_rls.sql) already scopes results to their
// household — these functions never need to filter for security, only for UX.

export type Child = { id: string; name: string; birth_date: string | null };

export type Entry = {
  id: string;
  author_id: string;
  kind: string;
  title: string | null;
  body: string | null;
  event_date: string;
  is_private: boolean;
  created_at: string;
};

export type MemberProfile = { name: string; color: string };

// Make sure the signed-in user has a profile row (for author display names),
// without ever clobbering a name they set themselves.
export async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined,
): Promise<void> {
  const fallback = (email?.split("@")[0] ?? "Ich").slice(0, 40);
  await supabase
    .from("profiles")
    .upsert({ user_id: userId, display_name: fallback }, { onConflict: "user_id", ignoreDuplicates: true });
}

export async function getChildren(supabase: SupabaseClient, householdId: string): Promise<Child[]> {
  const { data } = await supabase
    .from("children")
    .select("id, name, birth_date")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return (data as Child[] | null) ?? [];
}

export async function getEntriesForChild(
  supabase: SupabaseClient,
  householdId: string,
  childId: string,
): Promise<Entry[]> {
  const { data } = await supabase
    .from("entries")
    .select("id, author_id, kind, title, body, event_date, is_private, created_at, entry_children!inner(child_id)")
    .eq("household_id", householdId)
    .eq("entry_children.child_id", childId)
    .is("deleted_at", null)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as unknown as Entry[] | null) ?? [];
}

// user_id -> { display name, colour } for everyone in the household.
export async function getMemberProfiles(
  supabase: SupabaseClient,
  householdId: string,
): Promise<Record<string, MemberProfile>> {
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, color")
    .eq("household_id", householdId);
  const list = (members as { user_id: string; color: string }[] | null) ?? [];
  const map: Record<string, MemberProfile> = {};
  if (list.length === 0) return map;

  const ids = list.map((m) => m.user_id);
  const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
  const names = new Map(
    ((profiles as { user_id: string; display_name: string }[] | null) ?? []).map((p) => [p.user_id, p.display_name]),
  );
  for (const m of list) {
    map[m.user_id] = { name: names.get(m.user_id) || "Elternteil", color: m.color };
  }
  return map;
}
