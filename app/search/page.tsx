import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMemberProfiles, getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import SearchPanel from "./SearchPanel";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const t = translator((await getShellPrefs(supabase, user.id)).lang);
  const authors = await getMemberProfiles(supabase, membership.household_id);

  return (
    <main className="page">
      <p className="eyebrow">{t("search.eyebrow")}</p>
      <h1 className="title">{t("search.title")}</h1>
      <p className="sub">{t("search.sub")}</p>
      <SearchPanel authors={authors} />
      <p style={{ marginTop: 24 }}>
        <a href="/">{t("back.diary")}</a>
      </p>
    </main>
  );
}
