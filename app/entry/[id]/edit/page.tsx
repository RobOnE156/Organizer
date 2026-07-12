import { notFound, redirect } from "next/navigation";
import { getMembership, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMediaForEntries } from "@/lib/data";
import EditEntryForm, { type ExistingMedia } from "./EditEntryForm";

export const dynamic = "force-dynamic";

type EntryRow = {
  id: string;
  author_id: string;
  title: string | null;
  body: string | null;
  event_date: string;
  is_private: boolean;
  place_name: string | null;
};

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const { data } = await supabase
    .from("entries")
    .select("id, author_id, title, body, event_date, is_private, place_name")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  const entry = (data as EntryRow | null) ?? null;
  if (!entry) notFound();
  if (entry.author_id !== user.id) redirect("/"); // only the author may edit

  // Existing media, with short-lived signed URLs for preview.
  const mediaRows = await getMediaForEntries(supabase, [entry.id]);
  const { data: signed } = await supabase.storage
    .from("media")
    .createSignedUrls(mediaRows.map((m) => m.storage_key), 300);
  const urlByKey = new Map<string, string>();
  for (const s of signed ?? []) {
    if (s.signedUrl && s.path) urlByKey.set(s.path, s.signedUrl);
  }
  const existingMedia: ExistingMedia[] = mediaRows.map((m) => ({
    id: m.id,
    kind: m.kind,
    url: urlByKey.get(m.storage_key) ?? "",
  }));
  const nextPosition = mediaRows.reduce((max, m) => Math.max(max, m.position), -1) + 1;

  return (
    <main className="authwrap">
      <EditEntryForm
        entryId={entry.id}
        householdId={membership.household_id}
        initialTitle={entry.title ?? ""}
        initialBody={entry.body ?? ""}
        initialDate={entry.event_date}
        initialPrivate={entry.is_private}
        initialPlace={entry.place_name ?? ""}
        existingMedia={existingMedia}
        nextPosition={nextPosition}
      />
    </main>
  );
}
