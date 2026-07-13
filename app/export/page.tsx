import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getChildren,
  getEntriesForExport,
  getMediaForEntries,
  getMemberProfiles,
  getSnapshotsForExport,
} from "@/lib/data";
import ExportPanel from "./ExportPanel";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const [children, entries, snapshots] = await Promise.all([
    getChildren(supabase, membership.household_id),
    getEntriesForExport(supabase, membership.household_id),
    getSnapshotsForExport(supabase, membership.household_id),
  ]);
  const mediaRows = await getMediaForEntries(supabase, entries.map((e) => e.id));
  const authors = await getMemberProfiles(supabase, membership.household_id);

  const { data: hh } = await supabase
    .from("households")
    .select("name")
    .eq("id", membership.household_id)
    .maybeSingle();
  const householdName = (hh as { name: string } | null)?.name ?? "Tagebuch";

  const media = mediaRows.map((m) => ({
    entry_id: m.entry_id,
    storage_key: m.storage_key,
    kind: m.kind,
    position: m.position,
  }));

  return (
    <main className="page">
      <p className="eyebrow">Sicherung</p>
      <h1 className="title">Tagebuch exportieren</h1>
      <p className="sub">
        Lade das komplette Tagebuch als ZIP herunter: alle Original-Fotos und -Videos, jeder Eintrag
        als offene Textdatei und eine <code>index.html</code>, die das Tagebuch offline in jedem
        Browser anzeigt — auch in vielen Jahren noch, ohne diese App. So hat jeder Elternteil jederzeit
        eine vollständige eigene Kopie.
      </p>
      <ExportPanel
        householdName={householdName}
        childList={children}
        entries={entries}
        media={media}
        authors={authors}
        snapshots={snapshots}
      />
      <p style={{ marginTop: 24 }}>
        <a href="/">← Zurück</a>
      </p>
    </main>
  );
}
