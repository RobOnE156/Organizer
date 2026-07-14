import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getChildren, getMeasurements, getMilestones, getSnapshots, getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import GrowthPanel from "./GrowthPanel";
import SnapshotPanel from "./SnapshotPanel";

import PageHeader from "@/app/PageHeader";
import PageFooter from "@/app/PageFooter";

export const dynamic = "force-dynamic";

export default async function GrowthPage() {
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

  const [measurements, milestones, snapshots] = await Promise.all([
    getMeasurements(supabase, child.id),
    getMilestones(supabase, child.id),
    getSnapshots(supabase, child.id),
  ]);

  return (
    <>
      <PageHeader />
      <main className="page">
      <p className="eyebrow">{t("nav.about", { name: child.name })}</p>
      <h1 className="title">{t("growth.title")}</h1>
      <p className="sub">{t("growth.sub", { name: child.name })}</p>

      <h2 style={{ fontSize: "1.05rem", margin: "22px 0 8px" }}>{t("snap.who", { name: child.name })}</h2>
      <SnapshotPanel
        childId={child.id}
        childName={child.name}
        birthDate={child.birth_date}
        snapshots={snapshots}
        userId={user.id}
      />

      <h2 style={{ fontSize: "1.05rem", margin: "34px 0 8px" }}>{t("growth.head_growth")}</h2>
      <GrowthPanel childId={child.id} childName={child.name} measurements={measurements} userId={user.id} />

      <h2 style={{ fontSize: "1.05rem", margin: "34px 0 8px" }}>{t("growth.head_milestones")}</h2>
      <a className="settingcard" href="/firsts">
        <span className="si">🎉</span>
        <span className="st">
          <b>{t("firsts.title")}</b>
          <small>
            {milestones.length > 0
              ? t("firsts.growth_count", { n: milestones.length })
              : t("firsts.growth_empty")}
          </small>
        </span>
        <span className="sarrow">›</span>
      </a>
    </main>
      <PageFooter />
    </>
  );
}
