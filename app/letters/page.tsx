import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getChildren, getLetters, getMemberProfiles, getShellPrefs, letterUnlockDate } from "@/lib/data";
import { translator } from "@/lib/i18n";
import LettersPanel, { type ViewLetter } from "./LettersPanel";

import PageHeader from "@/app/PageHeader";
import PageFooter from "@/app/PageFooter";

export const dynamic = "force-dynamic";

export default async function LettersPage() {
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

  const [letters, authors] = await Promise.all([
    getLetters(supabase, child.id),
    getMemberProfiles(supabase, membership.household_id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  // Build the view model and seal locked letters: a not-yet-unlocked letter's
  // title and body are stripped for anyone but its author, so the co-parent's
  // browser never even receives the sealed contents.
  const view: ViewLetter[] = letters.map((l) => {
    const unlockOn = letterUnlockDate(l, child.birth_date);
    const locked = unlockOn ? unlockOn > today : true;
    const mine = l.author_id === user.id;
    const reveal = mine || !locked;
    return {
      id: l.id,
      author_id: l.author_id,
      mine,
      locked,
      unlockOn,
      title: reveal ? l.title : null,
      body: reveal ? l.body : "",
      unlock_mode: l.unlock_mode,
      unlock_date: l.unlock_date,
      unlock_age_years: l.unlock_age_years,
    };
  });

  return (
    <>
      <PageHeader />
      <main className="page">
      <p className="eyebrow">{t("letters.eyebrow")}</p>
      <h1 className="title">✉️ {t("letters.title")}</h1>
      <p className="sub">{t("letters.sub", { name: child.name })}</p>

      <LettersPanel
        childId={child.id}
        childName={child.name}
        birthDate={child.birth_date}
        letters={view}
        authors={authors}
        userId={user.id}
      />
    </main>
      <PageFooter />
    </>
  );
}
