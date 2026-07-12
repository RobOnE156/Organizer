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
  place_name: string | null;
  created_at: string;
};

export type MemberProfile = { name: string; color: string };

export type Media = {
  id: string;
  entry_id: string;
  storage_key: string;
  kind: string;
  mime: string;
  position: number;
};

export type SignedMedia = { kind: string; url: string };

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
    .select("id, author_id, kind, title, body, event_date, is_private, place_name, created_at, entry_children!inner(child_id)")
    .eq("household_id", householdId)
    .eq("entry_children.child_id", childId)
    .is("deleted_at", null)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as unknown as Entry[] | null) ?? [];
}

// Distinct places already used in the household, for the "Ort" autocomplete.
// RLS scopes the underlying entries to what the user may see, so private
// places of the other parent never leak into the suggestions.
export async function getPlaceSuggestions(supabase: SupabaseClient, householdId: string): Promise<string[]> {
  const { data } = await supabase
    .from("entries")
    .select("place_name")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .not("place_name", "is", null);
  const seen = new Set<string>();
  for (const row of (data as { place_name: string | null }[] | null) ?? []) {
    const p = row.place_name?.trim();
    if (p) seen.add(p);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b, "de"));
}

export async function getMediaForEntries(supabase: SupabaseClient, entryIds: string[]): Promise<Media[]> {
  if (entryIds.length === 0) return [];
  const { data } = await supabase
    .from("media")
    .select("id, entry_id, storage_key, kind, mime, position")
    .in("entry_id", entryIds)
    .is("deleted_at", null)
    .order("position", { ascending: true });
  return (data as Media[] | null) ?? [];
}

// Build entry_id -> signed media URLs (private bucket → short-lived signed URLs).
export async function signMediaByEntry(
  supabase: SupabaseClient,
  media: Media[],
  expiresIn = 300,
): Promise<Record<string, SignedMedia[]>> {
  const byEntry: Record<string, SignedMedia[]> = {};
  if (media.length === 0) return byEntry;

  const keys = media.map((m) => m.storage_key);
  const { data } = await supabase.storage.from("media").createSignedUrls(keys, expiresIn);
  const urlByKey = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) urlByKey.set(item.path, item.signedUrl);
  }
  for (const m of media) {
    const url = urlByKey.get(m.storage_key);
    if (!url) continue;
    (byEntry[m.entry_id] ??= []).push({ kind: m.kind, url });
  }
  return byEntry;
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
