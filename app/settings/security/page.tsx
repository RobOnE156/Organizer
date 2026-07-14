import { redirect } from "next/navigation";
import { getUser, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { hasServiceRole } from "@/lib/supabase/admin";
import { getShellPrefs, getRecoveryCodesRemaining } from "@/lib/data";
import { translator } from "@/lib/i18n";
import SecuritySetup from "./SecuritySetup";
import RecoveryCodes from "./RecoveryCodes";

import PageHeader from "@/app/PageHeader";
import PageFooter from "@/app/PageFooter";

export const dynamic = "force-dynamic";

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ recovered?: string; enrolled?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const { recovered } = await searchParams;

  const supabase = await createClient();
  const t = translator((await getShellPrefs(supabase, user.id)).lang);
  let hasTotp = false;
  let remaining = 0;
  if (hasSupabaseEnv()) {
    const { data } = await supabase.auth.mfa.listFactors();
    hasTotp = Boolean(data?.totp?.some((f) => f.status === "verified"));
    remaining = await getRecoveryCodesRemaining(supabase, user.id);
  }

  return (
    <>
      <PageHeader />
      <main className="page">
      <p className="eyebrow">{t("sec.eyebrow")}</p>
      <h1 className="title">{t("sec.title")}</h1>
      <p className="sub">{t("sec.sub")}</p>

      {recovered ? <p className="msg">{t("rec.recovered_note")}</p> : null}

      <SecuritySetup hasTotp={hasTotp} />

      {hasTotp ? <RecoveryCodes remaining={remaining} configured={hasServiceRole()} /> : null}
    </main>
      <PageFooter />
    </>
  );
}
