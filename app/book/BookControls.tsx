"use client";

import { useT } from "@/app/LanguageProvider";

// Screen-only toolbar for the book: pick a period and print/save as PDF.
// Hidden when printing (.noprint).
export default function BookControls({ years, selected }: { years: string[]; selected: string }) {
  const { t } = useT();
  return (
    <div className="noprint bookbar">
      <div className="bookbar-row">
        <a className="footlink" href="/">
          <span aria-hidden>←</span> {t("chrome.home")}
        </a>
        <span className="footspacer" />
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          🖨️ {t("book.save_pdf")}
        </button>
      </div>
      <div className="bookbar-years">
        <span className="muted" style={{ fontSize: ".8rem" }}>{t("book.period")}:</span>
        {years.map((y) => (
          <a key={y} className={"chip" + (y === selected ? " on" : "")} href={`/book?year=${y}`}>
            {y}
          </a>
        ))}
        <a className={"chip" + (selected === "all" ? " on" : "")} href="/book?year=all">
          {t("book.all_time")}
        </a>
      </div>
      <p className="muted bookbar-hint">{t("book.print_hint")}</p>
    </div>
  );
}
