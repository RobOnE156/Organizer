"use client";

import { useT } from "@/app/LanguageProvider";
import NotificationBell from "@/app/NotificationBell";
import ThemeModeToggle from "@/app/ThemeModeToggle";
import NavDrawer from "@/app/NavDrawer";
import type { AppNotification, MemberProfile } from "@/lib/data";

export default function TopNav({
  childName,
  notifications = [],
  authors = {},
}: {
  childName?: string;
  notifications?: AppNotification[];
  authors?: Record<string, MemberProfile>;
}) {
  const { t } = useT();
  const brand = childName ?? "Benni-Tagebuch";

  return (
    <header className="topbar">
      <a className="brand brand-lg" href="/">
        {brand}
        <small>{t("nav.timeline")}</small>
      </a>
      <div className="topactions">
        <ThemeModeToggle />
        <NotificationBell notifications={notifications} authors={authors} />
        <NavDrawer childName={childName} />
      </div>
    </header>
  );
}
