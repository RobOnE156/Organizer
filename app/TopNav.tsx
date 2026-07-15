"use client";

import { useT } from "@/app/LanguageProvider";
import NotificationBell from "@/app/NotificationBell";
import ThemeModeToggle from "@/app/ThemeModeToggle";
import ViewToggle from "@/app/ViewToggle";
import NavDrawer from "@/app/NavDrawer";
import type { AppNotification, MemberProfile } from "@/lib/data";

export default function TopNav({
  childName,
  notifications = [],
  authors = {},
  view = "2d",
}: {
  childName?: string;
  notifications?: AppNotification[];
  authors?: Record<string, MemberProfile>;
  view?: "2d" | "3d";
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
        <ViewToggle current={view} />
        <ThemeModeToggle />
        <NotificationBell notifications={notifications} authors={authors} />
        <NavDrawer childName={childName} />
      </div>
    </header>
  );
}
