import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getChildren, getEntriesForChild, getMilestones, getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import FirstsCollector, { type PickEntry } from "./FirstsCollector";

export const dynamic = "force-dynamic";

export default async function FirstsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const t = translator((await getShellPrefs(supabase, user.id)).lang);
  const children = await getChildren(supabase, membership.household_id);
  const child = children[0];
  if (!child) redirect("/children/new");

  const [milestones, entries] = await Promise.all([
    getMilestones(supabase, child.id),
    getEntriesForChild(supabase, membership.household_id, child.id),
  ]);
  const pickEntries: PickEntry[] = entries.map((e) => ({
    id: e.id,
    label: e.title || (e.body ? e.body.slice(0, 50) : e.event_date),
    date: e.event_date,
  }));

  return (
    <main className="page">
      <p className="eyebrow">{t("firsts.eyebrow")}</p>
      <h1 className="title">🎉 {t("firsts.title")}</h1>
      <p className="sub">{t("firsts.sub", { name: child.name })}</p>

      <FirstsCollector
        childId={child.id}
        childName={child.name}
        milestones={milestones}
        entries={pickEntries}
        userId={user.id}
      />

      <p style={{ marginTop: 28 }}>
        <a href="/">{t("back.diary")}</a>
      </p>
    </main>
  );
}
