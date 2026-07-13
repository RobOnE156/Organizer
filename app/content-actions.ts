"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import type { FormState } from "@/app/auth-types";
import type { CreateEntryResult, MediaInput } from "@/app/content-types";

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

  const { data: entry, error } = await supabase
    .from("entries")
    .insert({
      household_id: membership.household_id,
      author_id: user.id,
      created_by: user.id,
      kind: "text",
      title: input.title.trim() || null,
      body: input.body.trim() || null,
      event_date: input.eventDate || todayISO(),
      is_private: input.isPrivate,
      place_name: input.place.trim() || null,
    })
    .select("id")
    .single();
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
  input: { title: string; body: string; eventDate: string; isPrivate: boolean; place: string },
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

  const { error } = await supabase.from("entries").update(patch).eq("id", entryId);
  if (error) return { error: error.message };
  return {};
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
