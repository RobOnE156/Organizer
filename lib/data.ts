import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeLang, type Lang } from "@/lib/i18n";

// Data-access helpers for the authenticated app. Every query runs under the
// user's session, so RLS (0002_rls.sql) already scopes results to their
// household — these functions never need to filter for security, only for UX.

export type Child = { id: string; name: string; birth_date: string | null; cover_key: string | null };

export type LinkMeta = {
  url: string;
  title: string | null;
  description: string | null;
  provider: string | null;
  thumbnail_key: string | null;
};

export type Entry = {
  id: string;
  author_id: string;
  kind: string;
  title: string | null;
  body: string | null;
  event_date: string;
  is_private: boolean;
  place_name: string | null;
  link: LinkMeta | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export type MemberProfile = { name: string; color: string; avatarUrl?: string | null };

export type Comment = {
  id: string;
  entry_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type Reaction = { entry_id: string; author_id: string; emoji: string };

export async function getReactionsForEntries(supabase: SupabaseClient, entryIds: string[]): Promise<Reaction[]> {
  if (entryIds.length === 0) return [];
  const { data } = await supabase
    .from("reactions")
    .select("target_id, author_id, emoji")
    .eq("target_type", "entry")
    .in("target_id", entryIds);
  const rows = (data as { target_id: string; author_id: string; emoji: string }[] | null) ?? [];
  return rows.map((r) => ({ entry_id: r.target_id, author_id: r.author_id, emoji: r.emoji }));
}

// Own entries that still lack coordinates but have photos — the work list for
// backfilling GPS from already-uploaded images. Scoped to the caller's own
// entries because entries_update is author-only, so only those can be filled.
// Returns up to 3 image keys per entry (tried in order until GPS is found).
export type GeoBackfillEntry = { entry_id: string; keys: string[] };

export async function getEntriesNeedingGeo(
  supabase: SupabaseClient,
  householdId: string,
  authorId: string,
): Promise<GeoBackfillEntry[]> {
  const { data: ents } = await supabase
    .from("entries")
    .select("id")
    .eq("household_id", householdId)
    .eq("author_id", authorId)
    .is("deleted_at", null)
    .is("lat", null);
  const ids = ((ents as { id: string }[] | null) ?? []).map((e) => e.id);
  if (ids.length === 0) return [];

  const { data: media } = await supabase
    .from("media")
    .select("entry_id, storage_key, position")
    .in("entry_id", ids)
    .eq("kind", "image")
    .is("deleted_at", null)
    .order("position", { ascending: true });

  const byEntry = new Map<string, string[]>();
  for (const m of (media as { entry_id: string; storage_key: string }[] | null) ?? []) {
    const arr = byEntry.get(m.entry_id) ?? [];
    if (arr.length < 3) {
      arr.push(m.storage_key);
      byEntry.set(m.entry_id, arr);
    }
  }
  return Array.from(byEntry.entries()).map(([entry_id, keys]) => ({ entry_id, keys }));
}

// Entry ids the household has starred as highlights (shared "best-of" reel).
export async function getHighlightedEntryIds(supabase: SupabaseClient, entryIds: string[]): Promise<string[]> {
  if (entryIds.length === 0) return [];
  const { data } = await supabase.from("highlights").select("entry_id").in("entry_id", entryIds);
  const rows = (data as { entry_id: string }[] | null) ?? [];
  return rows.map((r) => r.entry_id);
}

export type CommentReaction = { comment_id: string; author_id: string; emoji: string };

export async function getReactionsForComments(supabase: SupabaseClient, commentIds: string[]): Promise<CommentReaction[]> {
  if (commentIds.length === 0) return [];
  const { data } = await supabase
    .from("reactions")
    .select("target_id, author_id, emoji")
    .eq("target_type", "comment")
    .in("target_id", commentIds);
  const rows = (data as { target_id: string; author_id: string; emoji: string }[] | null) ?? [];
  return rows.map((r) => ({ comment_id: r.target_id, author_id: r.author_id, emoji: r.emoji }));
}

export async function getCommentsForEntries(supabase: SupabaseClient, entryIds: string[]): Promise<Comment[]> {
  if (entryIds.length === 0) return [];
  const { data } = await supabase
    .from("comments")
    .select("id, entry_id, author_id, body, created_at")
    .in("entry_id", entryIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return (data as Comment[] | null) ?? [];
}

export type Media = {
  id: string;
  entry_id: string;
  storage_key: string;
  kind: string;
  mime: string;
  position: number;
};

export type SignedMedia = { kind: string; url: string; key: string };

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
    .select("id, name, birth_date, cover_key")
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
    .select("id, author_id, kind, title, body, event_date, is_private, place_name, link, lat, lng, created_at, entry_children!inner(child_id)")
    .eq("household_id", householdId)
    .eq("entry_children.child_id", childId)
    .is("deleted_at", null)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as unknown as Entry[] | null) ?? [];
}

export type BackupStatus = { lastBackupAt: string | null; intervalDays: number };

// Last completed backup + the household's reminder cadence (both RLS-scoped to
// the caller's household).
export async function getBackupStatus(
  supabase: SupabaseClient,
  householdId: string,
): Promise<BackupStatus> {
  const [{ data: last }, { data: settings }] = await Promise.all([
    supabase
      .from("backups")
      .select("created_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("backup_settings")
      .select("interval_days")
      .eq("household_id", householdId)
      .maybeSingle(),
  ]);
  return {
    lastBackupAt: (last as { created_at: string } | null)?.created_at ?? null,
    intervalDays: (settings as { interval_days: number } | null)?.interval_days ?? 30,
  };
}

// How many unused recovery codes the current user has left (RLS scopes the
// table to the caller's own codes).
export async function getRecoveryCodesRemaining(
  supabase: SupabaseClient,
  _userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("recovery_codes")
    .select("id", { count: "exact", head: true })
    .is("used_at", null);
  return count ?? 0;
}

// ---- Papierkorb (trash) + activity log ------------------------------
export type TrashedEntry = {
  id: string;
  title: string | null;
  body: string | null;
  event_date: string;
  deleted_at: string;
};

// Soft-deleted entries. RLS (0006) only lets an author see their OWN trashed
// entries, so this returns exactly the caller's recoverable entries.
export async function getTrashedEntries(
  supabase: SupabaseClient,
  householdId: string,
): Promise<TrashedEntry[]> {
  const { data } = await supabase
    .from("entries")
    .select("id, title, body, event_date, deleted_at")
    .eq("household_id", householdId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  return (data as TrashedEntry[] | null) ?? [];
}

export type AuditEntry = {
  id: number;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

// The household's activity log, newest first (members-only via audit_select).
export async function getActivityLog(
  supabase: SupabaseClient,
  householdId: string,
  limit = 60,
): Promise<AuditEntry[]> {
  const { data } = await supabase
    .from("audit_log")
    .select("id, actor_id, action, target_type, target_id, detail, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AuditEntry[] | null) ?? [];
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

// All entries in the household (across every child), enriched with their
// child links — the basis for a full export/backup. RLS still applies, so a
// parent exports exactly what they can see (shared entries + their own
// private ones).
export type ExportEntry = Entry & { child_ids: string[] };

export async function getEntriesForExport(
  supabase: SupabaseClient,
  householdId: string,
): Promise<ExportEntry[]> {
  const { data } = await supabase
    .from("entries")
    .select("id, author_id, kind, title, body, event_date, is_private, place_name, link, created_at, entry_children(child_id)")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: true });
  const rows = (data as (Entry & { entry_children: { child_id: string }[] | null })[] | null) ?? [];
  return rows.map((e) => {
    const { entry_children, ...rest } = e;
    return { ...rest, child_ids: (entry_children ?? []).map((c) => c.child_id) };
  });
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
    (byEntry[m.entry_id] ??= []).push({ kind: m.kind, url, key: m.storage_key });
  }
  return byEntry;
}

export type MetricKind = "weight" | "height" | "head";

export type Measurement = {
  id: string;
  child_id: string;
  measured_on: string;
  metric: MetricKind;
  value_num: number;
  unit: string;
  author_id: string;
};

export async function getMeasurements(supabase: SupabaseClient, childId: string): Promise<Measurement[]> {
  const { data } = await supabase
    .from("growth_measurements")
    .select("id, child_id, measured_on, metric, value_num, unit, author_id")
    .eq("child_id", childId)
    .is("deleted_at", null)
    .order("measured_on", { ascending: true });
  return (data as Measurement[] | null) ?? [];
}

export type Milestone = {
  id: string;
  child_id: string;
  key: string;
  title: string;
  achieved_on: string | null;
  entry_id: string | null;
  author_id: string;
};

export async function getMilestones(supabase: SupabaseClient, childId: string): Promise<Milestone[]> {
  const { data } = await supabase
    .from("milestones")
    .select("id, child_id, key, title, achieved_on, entry_id, author_id")
    .eq("child_id", childId)
    .is("deleted_at", null)
    .order("achieved_on", { ascending: true, nullsFirst: false });
  return (data as Milestone[] | null) ?? [];
}

export type UnlockMode = "date" | "age";

export type Letter = {
  id: string;
  child_id: string | null;
  author_id: string;
  title: string | null;
  body: string;
  unlock_mode: UnlockMode;
  unlock_date: string | null;
  unlock_age_years: number | null;
  created_at: string;
};

// All of the child's letters (household-shared per the letters RLS). The
// "seal" — hiding a not-yet-unlocked letter's contents from the co-parent —
// is applied in the page (server strips locked bodies before they reach the
// other parent's browser).
export async function getLetters(supabase: SupabaseClient, childId: string): Promise<Letter[]> {
  const { data } = await supabase
    .from("letters")
    .select("id, child_id, author_id, title, body, unlock_mode, unlock_date, unlock_age_years, created_at")
    .eq("child_id", childId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return (data as Letter[] | null) ?? [];
}

// The concrete date a letter unlocks: the chosen date, or the child's Nth
// birthday for age-based letters. Null when it can't be resolved yet (age
// mode with no birth date on file).
export function letterUnlockDate(l: Letter, birthDate: string | null): string | null {
  if (l.unlock_mode === "date") return l.unlock_date;
  if (l.unlock_age_years == null) return null;
  if (!birthDate) return null;
  return String(Number(birthDate.slice(0, 4)) + l.unlock_age_years) + birthDate.slice(4);
}

// ---- guest contributions (account-less, expiring links) -------------
export type GuestInviteStatus = "active" | "expired" | "revoked";
export type GuestInvite = {
  id: string;
  child_id: string | null;
  label: string | null;
  message: string | null;
  language: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  status: GuestInviteStatus;
};

type GuestInviteRow = Omit<GuestInvite, "status">;

// All of a household's guest links, newest first, with a derived status. The
// raw token only ever exists once (at creation) — we store just its hash — so
// this list shows metadata + a revoke control, never the link itself.
export async function getGuestInvites(supabase: SupabaseClient, householdId: string): Promise<GuestInvite[]> {
  const { data } = await supabase
    .from("guest_invites")
    .select("id, child_id, label, message, language, expires_at, used_at, revoked_at, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });
  const now = Date.now();
  return ((data as GuestInviteRow[] | null) ?? []).map((r) => ({
    ...r,
    status: r.revoked_at ? "revoked" : new Date(r.expires_at).getTime() < now ? "expired" : "active",
  }));
}

export type GuestContributionStatus = "pending" | "approved" | "rejected";
export type GuestContribution = {
  id: string;
  invite_id: string;
  guest_name: string;
  title: string | null;
  body: string | null;
  status: GuestContributionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

// All guest contributions in the household (pending / approved / rejected),
// newest first — the moderation queue and the approved wall both read this.
export async function getGuestContributions(
  supabase: SupabaseClient,
  householdId: string,
): Promise<GuestContribution[]> {
  const { data } = await supabase
    .from("guest_contributions")
    .select("id, invite_id, guest_name, title, body, status, reviewed_by, reviewed_at, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });
  return (data as GuestContribution[] | null) ?? [];
}

export type GuestInviteInfo = {
  valid: boolean;
  reason: string;
  label: string | null;
  message: string | null;
  language: string;
  child_name: string | null;
  expires_at: string | null;
};

// Validate a guest token from the public write page and get just enough to
// personalise it (child's name, host's note, language). Goes through the
// definer RPC, so an account-less visitor never touches the tables directly.
export async function getGuestInviteInfo(
  supabase: SupabaseClient,
  token: string,
): Promise<GuestInviteInfo | null> {
  const { data, error } = await supabase.rpc("guest_invite_info", { p_token: token });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as
    | Partial<GuestInviteInfo>
    | undefined
    | null;
  if (!row) return null;
  return {
    valid: row.valid === true,
    reason: typeof row.reason === "string" ? row.reason : "invalid",
    label: row.label ?? null,
    message: row.message ?? null,
    language: typeof row.language === "string" ? row.language : "en",
    child_name: row.child_name ?? null,
    expires_at: row.expires_at ?? null,
  };
}

// ---- notifications (in-app "Glocke") --------------------------------
export type NotificationKind = "entry" | "comment" | "reaction";
export type AppNotification = {
  id: string;
  kind: NotificationKind;
  actor_id: string;
  entry_id: string | null;
  comment_id: string | null;
  emoji: string | null;
  read_at: string | null;
  created_at: string;
  entryTitle: string | null;
};

type NotificationRow = {
  id: string;
  kind: NotificationKind;
  actor_id: string;
  entry_id: string | null;
  comment_id: string | null;
  emoji: string | null;
  read_at: string | null;
  created_at: string;
  entry: { title: string | null } | null;
};

// The recipient's recent notifications, newest first. RLS already scopes rows
// to recipient_id = the current user; the entry title is embedded via the FK
// (and comes back null if that entry has since been removed).
export async function getNotifications(
  supabase: SupabaseClient,
  _userId: string,
  limit = 20,
): Promise<AppNotification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, actor_id, entry_id, comment_id, emoji, read_at, created_at, entry:entries(title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as NotificationRow[] | null) ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    actor_id: r.actor_id,
    entry_id: r.entry_id,
    comment_id: r.comment_id,
    emoji: r.emoji,
    read_at: r.read_at,
    created_at: r.created_at,
    entryTitle: r.entry?.title ?? null,
  }));
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  _userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

export type NotificationPrefs = {
  entry_inapp: boolean;
  comment_inapp: boolean;
  reaction_inapp: boolean;
  entry_email: boolean;
  comment_email: boolean;
  reaction_email: boolean;
  muted: boolean;
};

// The user's opt-in matrix, falling back to the schema defaults when no row
// exists yet: in-app on, e-mail off (explicit opt-in), not muted.
export async function getNotificationPrefs(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationPrefs> {
  const { data } = await supabase
    .from("notification_prefs")
    .select("entry_inapp, comment_inapp, reaction_inapp, entry_email, comment_email, reaction_email, muted")
    .eq("user_id", userId)
    .maybeSingle();
  const r = data as Partial<NotificationPrefs> | null;
  return {
    entry_inapp: r?.entry_inapp ?? true,
    comment_inapp: r?.comment_inapp ?? true,
    reaction_inapp: r?.reaction_inapp ?? true,
    entry_email: r?.entry_email ?? false,
    comment_email: r?.comment_email ?? false,
    reaction_email: r?.reaction_email ?? false,
    muted: r?.muted ?? false,
  };
}

export type Snapshot = {
  id: string;
  child_id: string;
  taken_on: string;
  answers: Record<string, string>;
  author_id: string;
};

export async function getSnapshots(supabase: SupabaseClient, childId: string): Promise<Snapshot[]> {
  const { data } = await supabase
    .from("snapshots")
    .select("id, child_id, taken_on, answers, author_id")
    .eq("child_id", childId)
    .is("deleted_at", null)
    .order("taken_on", { ascending: false });
  return (data as Snapshot[] | null) ?? [];
}

// All snapshots in the household (across children) — for the export.
export async function getSnapshotsForExport(supabase: SupabaseClient, householdId: string): Promise<Snapshot[]> {
  const { data } = await supabase
    .from("snapshots")
    .select("id, child_id, taken_on, answers, author_id")
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .order("taken_on", { ascending: false });
  return (data as Snapshot[] | null) ?? [];
}

// user_id -> { display name, colour } for everyone in the household. Both name
// and colour come from the (self-editable) profile now.
export async function getMemberProfiles(
  supabase: SupabaseClient,
  householdId: string,
): Promise<Record<string, MemberProfile>> {
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("household_id", householdId);
  const list = (members as { user_id: string }[] | null) ?? [];
  const map: Record<string, MemberProfile> = {};
  if (list.length === 0) return map;

  const ids = list.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, color, avatar_url")
    .in("user_id", ids);
  const rows =
    (profiles as { user_id: string; display_name: string; color: string; avatar_url: string | null }[] | null) ?? [];
  const byId = new Map(rows.map((p) => [p.user_id, p]));

  // Sign the avatar photos (private bucket) in one call.
  const keys = rows.map((p) => p.avatar_url).filter((k): k is string => Boolean(k));
  const urlByKey = new Map<string, string>();
  if (keys.length > 0) {
    const { data: signed } = await supabase.storage.from("media").createSignedUrls(keys, 3600);
    for (const s of signed ?? []) if (s.signedUrl && s.path) urlByKey.set(s.path, s.signedUrl);
  }

  for (const m of list) {
    const p = byId.get(m.user_id);
    map[m.user_id] = {
      name: p?.display_name || "Elternteil",
      color: p?.color || "#c98fb0",
      avatarUrl: p?.avatar_url ? urlByKey.get(p.avatar_url) ?? null : null,
    };
  }
  return map;
}

// The signed-in user's own editable profile (name, colour, avatar, language,
// accessibility). Falls back to sane defaults if a column/migration is missing.
export type MyProfile = {
  display_name: string;
  color: string;
  avatar_key: string | null;
  ui_language: string;
  text_size: string;
  high_contrast: boolean;
  reduce_motion: boolean;
};

export async function getMyProfile(supabase: SupabaseClient, userId: string): Promise<MyProfile> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, color, avatar_url, ui_language, text_size, high_contrast, reduce_motion")
    .eq("user_id", userId)
    .maybeSingle();
  const p = data as Partial<{
    display_name: string;
    color: string;
    avatar_url: string | null;
    ui_language: string;
    text_size: string;
    high_contrast: boolean;
    reduce_motion: boolean;
  }> | null;
  return {
    display_name: p?.display_name ?? "",
    color: p?.color ?? "#c98fb0",
    avatar_key: p?.avatar_url ?? null,
    ui_language: p?.ui_language ?? "de",
    text_size: p?.text_size ?? "normal",
    high_contrast: p?.high_contrast ?? false,
    reduce_motion: p?.reduce_motion ?? false,
  };
}

// Accessibility classes for <html>, read from the signed-in user's profile.
// Never throws — returns "" when not configured, not logged in, or unset.
export async function getA11yClasses(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("text_size, high_contrast, reduce_motion")
    .eq("user_id", userId)
    .maybeSingle();
  const p = data as { text_size: string; high_contrast: boolean; reduce_motion: boolean } | null;
  if (!p) return "";
  const cls: string[] = [];
  if (p.text_size === "large") cls.push("a11y-large");
  if (p.high_contrast) cls.push("a11y-contrast");
  if (p.reduce_motion) cls.push("a11y-motion");
  return cls.join(" ");
}

// Shell personalisation for the root layout: accessibility classes + UI
// language, in one query. Never throws.
export async function getShellPrefs(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ a11y: string; lang: Lang }> {
  const { data } = await supabase
    .from("profiles")
    .select("text_size, high_contrast, reduce_motion, ui_language")
    .eq("user_id", userId)
    .maybeSingle();
  const p = data as {
    text_size: string;
    high_contrast: boolean;
    reduce_motion: boolean;
    ui_language: string;
  } | null;
  const cls: string[] = [];
  if (p?.text_size === "large") cls.push("a11y-large");
  if (p?.high_contrast) cls.push("a11y-contrast");
  if (p?.reduce_motion) cls.push("a11y-motion");
  return { a11y: cls.join(" "), lang: normalizeLang(p?.ui_language) };
}
