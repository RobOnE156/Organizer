"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLanguage } from "@/app/content-actions";
import { LANGS } from "@/lib/i18n";
import { useT } from "@/app/LanguageProvider";

export default function LanguageSection({ initialLang }: { initialLang: string }) {
  const router = useRouter();
  const { t } = useT();
  const [lang, setLang] = useState(initialLang);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: string) {
    if (busy || next === lang) return;
    const prev = lang;
    setLang(next);
    setBusy(true);
    setSaved(false);
    setError(null);
    const res = await updateLanguage(next);
    setBusy(false);
    if (res.error) {
      setLang(prev);
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh(); // re-render the whole UI in the new language
  }

  return (
    <div className="card stack">
      <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{t("lang.title")}</h2>
      <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{t("lang.sub")}</p>
      <div className="langopts">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            className={"langbtn" + (l.code === lang ? " on" : "")}
            onClick={() => choose(l.code)}
            disabled={busy}
            aria-pressed={l.code === lang}
          >
            {l.label}
          </button>
        ))}
      </div>
      {saved ? <p className="msg">{t("common.saved")}</p> : null}
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}
