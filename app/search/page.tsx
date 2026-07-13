import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMemberProfiles } from "@/lib/data";
import SearchPanel from "./SearchPanel";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const authors = await getMemberProfiles(supabase, membership.household_id);

  return (
    <main className="page">
      <p className="eyebrow">Suche</p>
      <h1 className="title">Im Tagebuch suchen</h1>
      <p className="sub">
        Durchsuche Titel, Texte, Orte und Kommentare. Es werden nur Erinnerungen gefunden, die du
        auch sehen darfst.
      </p>
      <SearchPanel authors={authors} />
      <p style={{ marginTop: 24 }}>
        <a href="/">← Zurück zum Tagebuch</a>
      </p>
    </main>
  );
}
