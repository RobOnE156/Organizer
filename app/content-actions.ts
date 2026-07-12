"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import type { FormState } from "@/app/auth-types";

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
