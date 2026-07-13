import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getChildren, getMeasurements, getMilestones, getSnapshots } from "@/lib/data";
import GrowthPanel from "./GrowthPanel";
import MilestonesPanel from "./MilestonesPanel";
import SnapshotPanel from "./SnapshotPanel";

export const dynamic = "force-dynamic";

export default async function GrowthPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const children = await getChildren(supabase, membership.household_id);
  const child = children[0];
  if (!child) redirect("/children/new");

  const [measurements, milestones, snapshots] = await Promise.all([
    getMeasurements(supabase, child.id),
    getMilestones(supabase, child.id),
    getSnapshots(supabase, child.id),
  ]);

  return (
    <main className="page">
      <p className="eyebrow">Über {child.name}</p>
      <h1 className="title">Schnappschuss, Wachstum &amp; Meilensteine</h1>
      <p className="sub">Wer ist {child.name} gerade — und wie wächst und entwickelt er sich.</p>

      <h2 style={{ fontSize: "1.05rem", margin: "22px 0 8px" }}>„Wer ist {child.name} gerade?"</h2>
      <SnapshotPanel
        childId={child.id}
        childName={child.name}
        birthDate={child.birth_date}
        snapshots={snapshots}
        userId={user.id}
      />

      <h2 style={{ fontSize: "1.05rem", margin: "34px 0 8px" }}>Wachstum</h2>
      <GrowthPanel childId={child.id} childName={child.name} measurements={measurements} userId={user.id} />

      <h2 style={{ fontSize: "1.05rem", margin: "34px 0 8px" }}>Meilensteine</h2>
      <MilestonesPanel childId={child.id} milestones={milestones} userId={user.id} />

      <p style={{ marginTop: 28 }}>
        <a href="/">← Zurück</a>
      </p>
    </main>
  );
}
