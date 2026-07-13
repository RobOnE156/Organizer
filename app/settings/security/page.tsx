import { redirect } from "next/navigation";
import { getUser, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import SecuritySetup from "./SecuritySetup";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();

  const supabase = await createClient();
  const t = translator((await getShellPrefs(supabase, user.id)).lang);
  let hasTotp = false;
  if (hasSupabaseEnv()) {
    const { data } = await supabase.auth.mfa.listFactors();
    hasTotp = Boolean(data?.totp?.some((f) => f.status === "verified"));
  }

  return (
    <main className="page">
      <p className="eyebrow">{t("sec.eyebrow")}</p>
      <h1 className="title">{t("sec.title")}</h1>
      <p className="sub">{t("sec.sub")}</p>
      <SecuritySetup hasTotp={hasTotp} />
      <p style={{ marginTop: 24 }}>
        <a href="/settings">{t("common.back")}</a>
      </p>
    </main>
  );
}
