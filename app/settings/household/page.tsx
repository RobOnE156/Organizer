import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import InvitePanel from "./InvitePanel";

export const dynamic = "force-dynamic";

export default async function HouseholdPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const t = translator((await getShellPrefs(supabase, user.id)).lang);
  const { data: household } = await supabase
    .from("households")
    .select("name")
    .eq("id", membership.household_id)
    .maybeSingle();
  const { data: members } = await supabase
    .from("memberships")
    .select("role")
    .eq("household_id", membership.household_id);

  const name = (household as { name: string } | null)?.name ?? t("nav.household");
  const count = (members as unknown[] | null)?.length ?? 1;
  const roleLabel = membership.role === "owner" ? t("role.owner") : t("role.parent");

  return (
    <main className="page">
      <p className="eyebrow">{t("nav.household")}</p>
      <h1 className="title">{name}</h1>
      <p className="sub">
        {count === 1 ? t("hh.member_one", { n: count }) : t("hh.member_many", { n: count })} ·{" "}
        {t("hh.your_role", { role: roleLabel })}
      </p>
      <InvitePanel isOwner={membership.role === "owner"} />
      <p style={{ marginTop: 24 }}>
        <a href="/settings">{t("common.back")}</a>
      </p>
    </main>
  );
}
