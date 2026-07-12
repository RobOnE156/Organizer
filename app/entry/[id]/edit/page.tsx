import { notFound, redirect } from "next/navigation";
import { getMembership, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EditEntryForm from "./EditEntryForm";

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

  return (
    <main className="authwrap">
      <EditEntryForm
        entryId={entry.id}
        initialTitle={entry.title ?? ""}
        initialBody={entry.body ?? ""}
        initialDate={entry.event_date}
        initialPrivate={entry.is_private}
        initialPlace={entry.place_name ?? ""}
      />
    </main>
  );
}
