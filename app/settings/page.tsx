import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getShellPrefs } from "@/lib/data";
import { translator } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const t = translator((await getShellPrefs(supabase, user.id)).lang);

  const items = [
    { href: "/settings/profile", icon: "👤", title: t("nav.profile"), desc: t("settings.profile_desc") },
    { href: "/settings/household", icon: "👪", title: t("nav.household"), desc: t("settings.household_desc") },
    { href: "/guests", icon: "🎁", title: t("nav.guests"), desc: t("settings.guests_desc") },
    { href: "/settings/notifications", icon: "🔔", title: t("nav.notifications"), desc: t("settings.notifications_desc") },
    { href: "/settings/security", icon: "🔒", title: t("nav.security"), desc: t("settings.security_desc") },
    { href: "/export", icon: "⬇️", title: t("nav.export"), desc: t("settings.export_desc") },
  ];

  return (
    <main className="page">
      <p className="eyebrow">{t("settings.eyebrow")}</p>
      <h1 className="title">{t("settings.title")}</h1>
      <p className="sub">{t("settings.sub")}</p>

      <div className="settingslist">
        {items.map((it) => (
          <a key={it.href} className="settingcard" href={it.href}>
            <span className="si">{it.icon}</span>
            <span className="st">
              <b>{it.title}</b>
              <small>{it.desc}</small>
            </span>
            <span className="sarrow">›</span>
          </a>
        ))}
      </div>

      <p style={{ marginTop: 24 }}>
        <a href="/">{t("common.back")}</a>
      </p>
    </main>
  );
}
