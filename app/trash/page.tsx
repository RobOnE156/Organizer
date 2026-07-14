import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTrashedEntries, getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import TrashList from "./TrashList";

import PageHeader from "@/app/PageHeader";
import PageFooter from "@/app/PageFooter";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const [entries, prefs] = await Promise.all([
    getTrashedEntries(supabase, membership.household_id),
    getShellPrefs(supabase, user.id),
  ]);
  const t = translator(prefs.lang);

  return (
    <>
      <PageHeader />
      <main className="page">
      <p className="eyebrow">{t("trash.eyebrow")}</p>
      <h1 className="title">🗑️ {t("trash.title")}</h1>
      <p className="sub">{t("trash.sub")}</p>

      <TrashList entries={entries} />
    </main>
      <PageFooter />
    </>
  );
}
