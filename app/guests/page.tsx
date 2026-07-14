import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getChildren,
  getGuestInvites,
  getGuestContributions,
  getMemberProfiles,
  getShellPrefs,
} from "@/lib/data";
import { translator } from "@/lib/i18n";
import GuestsPanel from "./GuestsPanel";

import PageHeader from "@/app/PageHeader";
import PageFooter from "@/app/PageFooter";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const prefs = await getShellPrefs(supabase, user.id);
  const t = translator(prefs.lang);
  const [kids, invites, contributions, authors] = await Promise.all([
    getChildren(supabase, membership.household_id),
    getGuestInvites(supabase, membership.household_id),
    getGuestContributions(supabase, membership.household_id),
    getMemberProfiles(supabase, membership.household_id),
  ]);

  return (
    <>
      <PageHeader />
      <main className="page">
      <p className="eyebrow">{t("guests.eyebrow")}</p>
      <h1 className="title">🎁 {t("guests.title")}</h1>
      <p className="sub">{t("guests.sub")}</p>

      <GuestsPanel
        kids={kids}
        invites={invites}
        contributions={contributions}
        authors={authors}
        defaultLang={prefs.lang}
      />
    </main>
      <PageFooter />
    </>
  );
}
