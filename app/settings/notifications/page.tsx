import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getNotificationPrefs, getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";
import NotificationSettings from "./NotificationSettings";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const [prefs, shell] = await Promise.all([
    getNotificationPrefs(supabase, user.id),
    getShellPrefs(supabase, user.id),
  ]);
  const t = translator(shell.lang);

  return (
    <main className="page">
      <p className="eyebrow">{t("notif.settings_eyebrow")}</p>
      <h1 className="title">🔔 {t("notif.settings_title")}</h1>
      <p className="sub">{t("notif.settings_sub")}</p>

      <NotificationSettings initial={prefs} />

      <p style={{ marginTop: 24 }}>
        <a href="/settings">{t("common.back")}</a>
      </p>
    </main>
  );
}
