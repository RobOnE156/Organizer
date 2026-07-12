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

// Edit an entry's text (author-only via RLS). The revision trigger records the
// previous version automatically, so edits are never silently lost.
export async function updateEntry(
  entryId: string,
  input: { title: string; body: string; eventDate: string; isPrivate: boolean },
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
    updated_by: user.id,
  };
  if (input.eventDate) patch.event_date = input.eventDate;

  const { error } = await supabase.from("entries").update(patch).eq("id", entryId);
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
