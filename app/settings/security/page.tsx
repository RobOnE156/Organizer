import { redirect } from "next/navigation";
import { getUser, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import SecuritySetup from "./SecuritySetup";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();

  let hasTotp = false;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    hasTotp = Boolean(data?.totp?.some((f) => f.status === "verified"));
  }

  return (
    <main className="page">
      <p className="eyebrow">Konto &amp; Sicherheit</p>
      <h1 className="title">Zwei-Faktor-Authentifizierung</h1>
      <p className="sub">Schütze euer Tagebuch mit einem zweiten Faktor (Authenticator-App / TOTP).</p>
      <SecuritySetup hasTotp={hasTotp} />
      <p style={{ marginTop: 24 }}>
        <a href="/">← Zurück</a>
      </p>
    </main>
  );
}
