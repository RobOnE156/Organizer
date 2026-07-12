import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import ChildForm from "./ChildForm";

export const dynamic = "force-dynamic";

export default async function NewChildPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");
  return (
    <main className="authwrap">
      <ChildForm />
    </main>
  );
}
