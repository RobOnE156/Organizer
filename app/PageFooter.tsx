"use client";

import { useT } from "@/app/LanguageProvider";

// Always-present footer nav so any sub-page can jump straight back to the diary
// (or settings), rather than only stepping "back". `back` keeps the contextual
// return link when a page wants one.
export default function PageFooter({ back }: { back?: string }) {
  const { t } = useT();
  return (
    <nav className="pagefoot" aria-label={t("nav.menu")}>
      {back ? (
        <a className="footlink" href={back}>
          {t("common.back")}
        </a>
      ) : null}
      <span className="footspacer" />
      <a className="footlink primary" href="/">
        <span aria-hidden>🏠</span> {t("chrome.home")}
      </a>
      <a className="footlink" href="/settings">
        <span aria-hidden>⚙️</span> {t("chrome.settings")}
      </a>
    </nav>
  );
}
