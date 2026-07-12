import { redirect } from "next/navigation";
import { getUser, getMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getChildren } from "@/lib/data";
import EntryForm from "./EntryForm";

export const dynamic = "force-dynamic";

export default async function NewEntryPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const children = await getChildren(supabase, membership.household_id);
  const child = children[0];
  if (!child) redirect("/children/new");

  return (
    <main className="authwrap">
      <EntryForm childId={child.id} childName={child.name} />
    </main>
  );
}
