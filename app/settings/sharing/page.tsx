import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getChildren, getShareLinks, getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import PageHeader from "@/app/PageHeader";
import PageFooter from "@/app/PageFooter";
import SharingPanel from "./SharingPanel";

export const dynamic = "force-dynamic";

export default async function SharingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const [kids, links, prefs] = await Promise.all([
    getChildren(supabase, membership.household_id),
    getShareLinks(supabase, membership.household_id),
    getShellPrefs(supabase, user.id),
  ]);
  const t = translator(prefs.lang);

  return (
    <>
      <PageHeader />
      <main className="page">
        <p className="eyebrow">{t("sharing.eyebrow")}</p>
        <h1 className="title">🔗 {t("sharing.title")}</h1>
        <p className="sub">{t("sharing.sub")}</p>
        <SharingPanel kids={kids} links={links} defaultLang={prefs.lang} />
      </main>
      <PageFooter />
    </>
  );
}
