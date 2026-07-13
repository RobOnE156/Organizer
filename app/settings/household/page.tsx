import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import InvitePanel from "./InvitePanel";

export const dynamic = "force-dynamic";

export default async function HouseholdPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const { data: household } = await supabase
    .from("households")
    .select("name")
    .eq("id", membership.household_id)
    .maybeSingle();
  const { data: members } = await supabase
    .from("memberships")
    .select("role")
    .eq("household_id", membership.household_id);

  const name = (household as { name: string } | null)?.name ?? "Haushalt";
  const count = (members as unknown[] | null)?.length ?? 1;

  return (
    <main className="page">
      <p className="eyebrow">Haushalt</p>
      <h1 className="title">{name}</h1>
      <p className="sub">
        {count} {count === 1 ? "Mitglied" : "Mitglieder"} · deine Rolle: {membership.role}
      </p>
      <InvitePanel isOwner={membership.role === "owner"} />
      <p style={{ marginTop: 24 }}>
        <a href="/settings">← Zurück</a>
      </p>
    </main>
  );
}
