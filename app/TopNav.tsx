"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";
import NotificationBell from "@/app/NotificationBell";
import ThemeModeToggle from "@/app/ThemeModeToggle";
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
  const [open, setOpen] = useState(false);
  const brand = childName ?? "Benni-Tagebuch";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          {brand}
          <small>{t("nav.timeline")}</small>
        </a>
        <div className="topactions">
          <ThemeModeToggle />
          <NotificationBell notifications={notifications} authors={authors} />
          <button className="menubtn" onClick={() => setOpen(true)} aria-label={t("nav.menu")} aria-expanded={open}>
            ☰
          </button>
        </div>
      </header>

      {open ? (
        <div className="drawer-wrap" onClick={() => setOpen(false)}>
          <nav className="drawer" onClick={(e) => e.stopPropagation()} aria-label={t("nav.menu")}>
            <div className="drawerhead">
              <b>{brand}</b>
              <button className="menubtn" onClick={() => setOpen(false)} aria-label={t("nav.close")}>
                ✕
              </button>
            </div>

            <span className="drawerlabel">{t("nav.explore")}</span>
            <a className="drawerlink" href="/">
              <span className="di">🏠</span> {t("nav.timeline")}
            </a>
            <a className="drawerlink" href="/growth">
              <span className="di">📈</span> {t("nav.about", { name: childName ?? t("nav.child_fallback") })}
            </a>
            <a className="drawerlink" href="/firsts">
              <span className="di">🎉</span> {t("nav.firsts")}
            </a>
            <a className="drawerlink" href="/highlights">
              <span className="di">★</span> {t("nav.review")}
            </a>
            <a className="drawerlink" href="/map">
              <span className="di">🗺️</span> {t("nav.map")}
            </a>
            <a className="drawerlink" href="/search">
              <span className="di">🔍</span> {t("nav.search")}
            </a>
            <a className="drawerlink" href="/letters">
              <span className="di">✉️</span> {t("nav.letters")}
            </a>
            <a className="drawerlink" href="/guests">
              <span className="di">🎁</span> {t("nav.guests")}
            </a>

            <span className="drawerlabel">{t("nav.settings")}</span>
            <a className="drawerlink" href="/settings">
              <span className="di">⚙️</span> {t("nav.settings")}
            </a>
            <form action={signOut}>
              <button className="drawerlink signout" type="submit">
                <span className="di">↩</span> {t("nav.signout")}
              </button>
            </form>
          </nav>
        </div>
      ) : null}
    </>
  );
}
