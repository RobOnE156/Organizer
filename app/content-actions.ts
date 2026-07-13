"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { fetchLinkPreview, fetchImageBytes } from "@/lib/link-preview";
import { escapeLike } from "@/lib/search-format";
import type { FormState } from "@/app/auth-types";
import {
  AUTHOR_COLORS,
  REACTION_EMOJIS,
  type CreateEntryResult,
  type MediaInput,
  type ReactTarget,
  type SearchCommentHit,
  type SearchEntryHit,
  type SearchResult,
} from "@/app/content-types";

const NOT_CONFIGURED = "Supabase ist noch nicht konfiguriert.";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createChild(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const name = str(formData, "name");
  const birth = str(formData, "birth");
  if (!name) return { error: "Bitte einen Namen angeben." };

  const membership = await getMembership();
  if (!membership) return { error: "Kein Haushalt gefunden." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("children").insert({
    household_id: membership.household_id,
    name,
    birth_date: birth || null,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  redirect("/");
}

export async function createEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const title = str(formData, "title");
  const body = str(formData, "body");
  const eventDate = str(formData, "event_date") || todayISO();
  const isPrivate = formData.get("is_private") === "on";
  const place = str(formData, "place");
  const childId = str(formData, "child_id");
  if (!body && !title) return { error: "Bitte einen Titel oder Text eingeben." };

  const membership = await getMembership();
  if (!membership) return { error: "Kein Haushalt gefunden." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: entry, error } = await supabase
    .from("entries")
    .insert({
      household_id: membership.household_id,
      author_id: user.id,
      created_by: user.id,
      kind: "text",
      title: title || null,
      body: body || null,
      event_date: eventDate,
      is_private: isPrivate,
      place_name: place || null,
    })
    .select("id")
    .single();
  if (error || !entry) return { error: error?.message ?? "Speichern fehlgeschlagen." };

  if (childId) {
    const { error: linkErr } = await supabase
      .from("entry_children")
      .insert({ entry_id: (entry as { id: string }).id, child_id: childId });
    if (linkErr) return { error: linkErr.message };
  }
  redirect("/");
}

// Like createEntry, but returns the ids so the client can upload media next
// (browser → Storage) and then record the media rows. No redirect.
export async function createEntryGetId(input: {
  title: string;
  body: string;
  eventDate: string;
  isPrivate: boolean;
  place: string;
  childId: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<CreateEntryResult> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (!input.title.trim() && !input.body.trim()) return { error: "Bitte einen Titel oder Text eingeben." };

  const membership = await getMembership();
  if (!membership) return { error: "Kein Haushalt gefunden." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const row: Record<string, unknown> = {
    household_id: membership.household_id,
    author_id: user.id,
    created_by: user.id,
    kind: "text",
    title: input.title.trim() || null,
    body: input.body.trim() || null,
    event_date: input.eventDate || todayISO(),
    is_private: input.isPrivate,
    place_name: input.place.trim() || null,
  };
  // Only reference the geo columns when we actually captured GPS, so a
  // no-GPS entry never depends on migration 0015 having run.
  if (Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
    row.lat = input.lat;
    row.lng = input.lng;
  }
  const { data: entry, error } = await supabase.from("entries").insert(row).select("id").single();
  if (error || !entry) return { error: error?.message ?? "Speichern fehlgeschlagen." };

  const entryId = (entry as { id: string }).id;
  if (input.childId) {
    const { error: linkErr } = await supabase
      .from("entry_children")
      .insert({ entry_id: entryId, child_id: input.childId });
    if (linkErr) return { error: linkErr.message };
  }
  return { entryId, householdId: membership.household_id };
}

// Record uploaded media (already in Storage) against an entry.
export async function recordMedia(
  entryId: string,
  householdId: string,
  items: MediaInput[],
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (items.length === 0) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const rows = items.map((it) => ({
    household_id: householdId,
    entry_id: entryId,
    author_id: user.id,
    store: "supabase",
    storage_key: it.storage_key,
    kind: it.kind,
    mime: it.mime,
    bytes: it.bytes,
    position: it.position,
  }));
  const { error } = await supabase.from("media").insert(rows);
  if (error) return { error: error.message };
  return {};
}

// Remove a single media item from an entry (author-only via RLS). Deletes
// both the storage object and the database row, so a removed photo is
// actually gone (not just hidden).
export async function deleteMedia(mediaId: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  // RLS (media_select) only reveals rows the user may see; author-only
  // delete is then enforced by the media_delete policy.
  const { data: row } = await supabase
    .from("media")
    .select("id, storage_key")
    .eq("id", mediaId)
    .maybeSingle();
  if (!row) return { error: "Medium nicht gefunden." };

  const storageKey = (row as { storage_key: string | null }).storage_key;
  if (storageKey) {
    const { error: rmErr } = await supabase.storage.from("media").remove([storageKey]);
    if (rmErr) return { error: rmErr.message };
  }

  const { error } = await supabase.from("media").delete().eq("id", mediaId);
  if (error) return { error: error.message };
  return {};
}

// Edit an entry's text (author-only via RLS). The revision trigger records the
// previous version automatically, so edits are never silently lost.
export async function updateEntry(
  entryId: string,
  input: {
    title: string;
    body: string;
    eventDate: string;
    isPrivate: boolean;
    place: string;
    lat?: number | null;
    lng?: number | null;
  },
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (!input.title.trim() && !input.body.trim()) return { error: "Bitte einen Titel oder Text eingeben." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const patch: Record<string, unknown> = {
    title: input.title.trim() || null,
    body: input.body.trim() || null,
    is_private: input.isPrivate,
    place_name: input.place.trim() || null,
    updated_by: user.id,
  };
  if (input.eventDate) patch.event_date = input.eventDate;
  // Only stamp GPS when we actually found some (from a newly added photo);
  // never clear an existing location on a plain text edit.
  if (Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
    patch.lat = input.lat;
    patch.lng = input.lng;
  }

  const { error } = await supabase.from("entries").update(patch).eq("id", entryId);
  if (error) return { error: error.message };
  return {};
}

// ---- profile -------------------------------------------------------
// Edit your own profile: display name + author colour. Own-row only (RLS
// profiles_insert/update both check user_id = auth.uid()).
export async function updateProfile(input: {
  displayName: string;
  color: string;
}): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const name = input.displayName.trim();
  if (!name) return { error: "Bitte einen Namen eingeben." };
  if (name.length > 40) return { error: "Name ist zu lang (max. 40 Zeichen)." };
  if (!(AUTHOR_COLORS as readonly string[]).includes(input.color)) return { error: "Ungültige Farbe." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, display_name: name, color: input.color }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  return {};
}

// Set (or remove) your own avatar photo. The image is already uploaded to
// storage by the browser; here we just record its key (or null) on the profile.
export async function setAvatar(key: string | null): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, avatar_url: key }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  return {};
}

// Save the UI language preference (own profile row).
export async function updateLanguage(lang: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const value = lang === "en" || lang === "es" || lang === "de" ? lang : "de";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, ui_language: value }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  return {};
}

// Save accessibility preferences (own profile row).
export async function updateA11y(input: {
  textSize: string;
  highContrast: boolean;
  reduceMotion: boolean;
}): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      text_size: input.textSize === "large" ? "large" : "normal",
      high_contrast: Boolean(input.highContrast),
      reduce_motion: Boolean(input.reduceMotion),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };
  return {};
}

// Backfill: stamp coordinates onto one of the user's own entries that has
// none yet. Author-only via RLS; the `is('lat', null)` guard makes it
// idempotent (never overwrites an existing location).
export async function setEntryGeo(
  entryId: string,
  lat: number,
  lng: number,
): Promise<{ error?: string; updated?: boolean }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "Ungültige Koordinaten." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { data, error } = await supabase
    .from("entries")
    .update({ lat, lng, updated_by: user.id })
    .eq("id", entryId)
    .is("lat", null)
    .select("id");
  if (error) return { error: error.message };
  return { updated: (data?.length ?? 0) > 0 };
}

// Set (or clear) a child's cover photo. The image is already uploaded to
// storage by the browser; here we just record its key on the child row.
export async function setChildCover(childId: string, coverKey: string | null): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase.from("children").update({ cover_key: coverKey }).eq("id", childId);
  if (error) return { error: error.message };
  return {};
}

// ---- growth measurements -------------------------------------------
export async function addMeasurement(input: {
  childId: string;
  metric: "weight" | "height" | "head";
  value: number;
  unit: string;
  measuredOn: string;
}): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (!input.childId) return { error: "Kein Kind ausgewählt." };
  if (!Number.isFinite(input.value) || input.value <= 0) return { error: "Bitte einen gültigen Wert eingeben." };

  const membership = await getMembership();
  if (!membership) return { error: "Kein Haushalt gefunden." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("growth_measurements").insert({
    household_id: membership.household_id,
    child_id: input.childId,
    metric: input.metric,
    value_num: input.value,
    unit: input.unit,
    measured_on: input.measuredOn || todayISO(),
    author_id: user.id,
  });
  if (error) return { error: error.message };
  return {};
}

export async function deleteMeasurement(id: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase.from("growth_measurements").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

// ---- milestones ("erste Male") -------------------------------------
export async function addMilestone(input: {
  childId: string;
  title: string;
  achievedOn: string;
  key?: string;
}): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (!input.childId) return { error: "Kein Kind ausgewählt." };
  if (!input.title.trim()) return { error: "Bitte einen Titel eingeben." };

  const membership = await getMembership();
  if (!membership) return { error: "Kein Haushalt gefunden." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("milestones").insert({
    household_id: membership.household_id,
    child_id: input.childId,
    key: input.key?.trim() || "custom",
    title: input.title.trim(),
    achieved_on: input.achievedOn || null,
    author_id: user.id,
  });
  if (error) return { error: error.message };
  return {};
}

export async function deleteMilestone(id: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase.from("milestones").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

// ---- link preview cards --------------------------------------------
// Resolve a pasted URL into a preview (author-only via entries RLS), self-host
// its thumbnail, and store it on the entry. An empty URL clears the link.
export async function attachLink(entryId: string, householdId: string, rawUrl: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    const { error } = await supabase.from("entries").update({ link: null }).eq("id", entryId);
    return error ? { error: error.message } : {};
  }

  const preview = await fetchLinkPreview(trimmed);
  if (!preview) return { error: "Das ist keine gültige Web-Adresse." };

  let thumbnail_key: string | null = null;
  if (preview.thumbnailUrl) {
    const img = await fetchImageBytes(preview.thumbnailUrl);
    if (img) {
      const ext = img.contentType.includes("png") ? "png" : img.contentType.includes("webp") ? "webp" : "jpg";
      const key = `${householdId}/link/${entryId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(key, img.bytes, { contentType: img.contentType, upsert: false });
      if (!upErr) thumbnail_key = key;
    }
  }

  const link = {
    url: preview.url,
    title: preview.title,
    description: preview.description,
    provider: preview.provider,
    thumbnail_key,
  };
  const { error } = await supabase.from("entries").update({ link }).eq("id", entryId);
  if (error) return { error: error.message };
  return {};
}

// ---- reactions -----------------------------------------------------
// Reactions work identically for entries and comments — the reactions table
// carries a target_type, and its RLS policies (member + author=self) don't
// care which kind of target it is.
export async function addReaction(
  targetType: ReactTarget,
  targetId: string,
  householdId: string,
  emoji: string,
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (targetType !== "entry" && targetType !== "comment") return { error: "Ungültiges Ziel." };
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) return { error: "Ungültige Reaktion." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase.from("reactions").upsert(
    { household_id: householdId, target_type: targetType, target_id: targetId, author_id: user.id, emoji },
    { onConflict: "target_type,target_id,author_id,emoji", ignoreDuplicates: true },
  );
  if (error) return { error: error.message };
  return {};
}

export async function removeReaction(
  targetType: ReactTarget,
  targetId: string,
  emoji: string,
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase
    .from("reactions")
    .delete()
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("author_id", user.id)
    .eq("emoji", emoji);
  if (error) return { error: error.message };
  return {};
}

// ---- highlights ----------------------------------------------------
// A highlight is a shared per-entry mark (unique entry_id). Toggling on
// upserts a row; toggling off deletes it. Either parent may curate an
// entry they can see (RLS enforces visibility).
export async function setHighlight(
  entryId: string,
  householdId: string,
  on: boolean,
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (on) {
    const { error } = await supabase.from("highlights").upsert(
      { household_id: householdId, entry_id: entryId, created_by: user.id },
      { onConflict: "entry_id", ignoreDuplicates: true },
    );
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("highlights").delete().eq("entry_id", entryId);
    if (error) return { error: error.message };
  }
  return {};
}

// ---- search --------------------------------------------------------
// Full-text-ish search over the household's entries (title, body, place)
// and comments. Every query runs under the caller's session, so RLS scopes
// results to what they may see — a co-parent's private entry never surfaces.
export async function searchDiary(rawQuery: string): Promise<SearchResult> {
  if (!hasSupabaseEnv()) return { entries: [], comments: [], error: NOT_CONFIGURED };
  const q = rawQuery.trim();
  if (q.length < 2) return { entries: [], comments: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { entries: [], comments: [], error: "Nicht angemeldet." };

  const pat = "%" + escapeLike(q) + "%";
  const cols = "id, title, body, place_name, event_date, author_id";
  const [t, b, p] = await Promise.all([
    supabase.from("entries").select(cols).is("deleted_at", null).ilike("title", pat).limit(50),
    supabase.from("entries").select(cols).is("deleted_at", null).ilike("body", pat).limit(50),
    supabase.from("entries").select(cols).is("deleted_at", null).ilike("place_name", pat).limit(50),
  ]);
  const byId = new Map<string, SearchEntryHit>();
  for (const row of [...(t.data ?? []), ...(b.data ?? []), ...(p.data ?? [])] as SearchEntryHit[]) {
    byId.set(row.id, row);
  }
  const entries = Array.from(byId.values())
    .sort((a, b2) => (a.event_date < b2.event_date ? 1 : a.event_date > b2.event_date ? -1 : 0))
    .slice(0, 40);

  const { data: cData } = await supabase
    .from("comments")
    .select("id, entry_id, body, author_id, created_at")
    .is("deleted_at", null)
    .ilike("body", pat)
    .order("created_at", { ascending: false })
    .limit(40);
  const commentRows = (cData as Omit<SearchCommentHit, "entry_title" | "entry_date">[] | null) ?? [];

  // Fetch parent-entry context (title/date) for the matched comments. This
  // read is RLS-scoped too, so a comment whose entry we can't see is dropped.
  const parentIds = Array.from(new Set(commentRows.map((c) => c.entry_id)));
  const parentById = new Map<string, { title: string | null; event_date: string }>();
  if (parentIds.length > 0) {
    const { data: pData } = await supabase
      .from("entries")
      .select("id, title, event_date")
      .in("id", parentIds)
      .is("deleted_at", null);
    for (const e of (pData as { id: string; title: string | null; event_date: string }[] | null) ?? []) {
      parentById.set(e.id, { title: e.title, event_date: e.event_date });
    }
  }
  const comments: SearchCommentHit[] = commentRows
    .filter((c) => parentById.has(c.entry_id))
    .map((c) => ({
      ...c,
      entry_title: parentById.get(c.entry_id)?.title ?? null,
      entry_date: parentById.get(c.entry_id)?.event_date ?? null,
    }));

  return { entries, comments };
}

// ---- letters (time capsule) ----------------------------------------
export type LetterInput = {
  title: string;
  body: string;
  unlockMode: "date" | "age";
  unlockDate: string; // YYYY-MM-DD when mode === 'date'
  unlockAgeYears: number; // when mode === 'age'
};

function validDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00").getTime());
}

// Resolve an input into the { unlock_mode, unlock_date, unlock_age_years }
// columns, validating along the way.
function unlockFields(input: LetterInput): { ok: true; cols: Record<string, unknown> } | { ok: false; error: string } {
  if (input.unlockMode === "age") {
    const age = Math.round(input.unlockAgeYears);
    if (!Number.isFinite(age) || age < 0 || age > 120) return { ok: false, error: "Bitte ein gültiges Alter wählen." };
    return { ok: true, cols: { unlock_mode: "age", unlock_age_years: age, unlock_date: null } };
  }
  if (!validDate(input.unlockDate)) return { ok: false, error: "Bitte ein gültiges Datum wählen." };
  return { ok: true, cols: { unlock_mode: "date", unlock_date: input.unlockDate, unlock_age_years: null } };
}

export async function addLetter(input: LetterInput & { childId: string }): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (!input.childId) return { error: "Kein Kind ausgewählt." };
  if (!input.body.trim()) return { error: "Bitte einen Brief schreiben." };
  const unlock = unlockFields(input);
  if (!unlock.ok) return { error: unlock.error };

  const membership = await getMembership();
  if (!membership) return { error: "Kein Haushalt gefunden." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("letters").insert({
    household_id: membership.household_id,
    child_id: input.childId,
    author_id: user.id,
    title: input.title.trim() || null,
    body: input.body.trim(),
    ...unlock.cols,
  });
  if (error) return { error: error.message };
  return {};
}

export async function updateLetter(id: string, input: LetterInput): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (!input.body.trim()) return { error: "Bitte einen Brief schreiben." };
  const unlock = unlockFields(input);
  if (!unlock.ok) return { error: unlock.error };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase
    .from("letters")
    .update({ title: input.title.trim() || null, body: input.body.trim(), ...unlock.cols })
    .eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteLetter(id: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  // Real DELETE (author-only via RLS, 0018) — avoids the soft-delete trap.
  const { error } = await supabase.from("letters").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

// ---- comments ------------------------------------------------------
export async function addComment(
  entryId: string,
  householdId: string,
  body: string,
): Promise<{ error?: string; comment?: { id: string; author_id: string; body: string; created_at: string } }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const text = body.trim();
  if (!text) return { error: "Bitte einen Kommentar eingeben." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data, error } = await supabase
    .from("comments")
    .insert({ household_id: householdId, entry_id: entryId, author_id: user.id, body: text.slice(0, 4000) })
    .select("id, author_id, body, created_at")
    .single();
  if (error || !data) return { error: error?.message ?? "Speichern fehlgeschlagen." };
  return { comment: data as { id: string; author_id: string; body: string; created_at: string } };
}

export async function updateComment(id: string, body: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const text = body.trim();
  if (!text) return { error: "Bitte einen Kommentar eingeben." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  // RLS (comments_update) already limits this to the comment's author.
  const { error } = await supabase.from("comments").update({ body: text.slice(0, 4000) }).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteComment(id: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

// ---- "who is <child> right now" snapshots --------------------------
function cleanAnswers(answers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) {
    const t = (v ?? "").trim();
    if (t) out[k] = t.slice(0, 2000);
  }
  return out;
}

export async function addSnapshot(input: {
  childId: string;
  takenOn: string;
  answers: Record<string, string>;
}): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  if (!input.childId) return { error: "Kein Kind ausgewählt." };
  const answers = cleanAnswers(input.answers);
  if (Object.keys(answers).length === 0) return { error: "Bitte mindestens ein Feld ausfüllen." };

  const membership = await getMembership();
  if (!membership) return { error: "Kein Haushalt gefunden." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("snapshots").insert({
    household_id: membership.household_id,
    child_id: input.childId,
    author_id: user.id,
    taken_on: input.takenOn || todayISO(),
    answers,
  });
  if (error) return { error: error.message };
  return {};
}

export async function updateSnapshot(
  id: string,
  input: { takenOn: string; answers: Record<string, string> },
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const answers = cleanAnswers(input.answers);
  if (Object.keys(answers).length === 0) return { error: "Bitte mindestens ein Feld ausfüllen." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const patch: Record<string, unknown> = { answers };
  if (input.takenOn) patch.taken_on = input.takenOn;
  const { error } = await supabase.from("snapshots").update(patch).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteSnapshot(id: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase.from("snapshots").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

// Soft-delete an entry (RLS allows this only for its author). It disappears
// from the timeline but is not permanently destroyed.
export async function deleteEntry(entryId: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: NOT_CONFIGURED };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("entries")
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", entryId);
  if (error) return { error: error.message };
  return {};
}
