import { redirect } from "next/navigation";
import { getUser, getMembership } from "@/lib/auth";
import OnboardingForm from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const membership = await getMembership();
  if (membership) redirect("/");
  return (
    <main className="authwrap">
      <OnboardingForm />
    </main>
  );
}
