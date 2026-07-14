"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTheme } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";
import { THEMES } from "@/lib/themes";

export default function ThemeSection({ initialTheme }: { initialTheme: string }) {
  const { t } = useT();
  const router = useRouter();
  const [theme, setTheme] = useState(initialTheme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(key: string) {
    if (busy || key === theme) return;
    const prev = theme;
    setTheme(key); // optimistic — the swatch highlights immediately
    setBusy(true);
    setError(null);
    const res = await updateTheme(key);
    setBusy(false);
    if (res.error) {
      setTheme(prev);
      setError(res.error);
      return;
    }
    router.refresh(); // re-render the shell so the new colour scheme applies
  }

  return (
    <div className="card stack">
      <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{t("theme.title")}</h2>
      <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{t("theme.sub")}</p>
      <div className="themeopts">
        {THEMES.map((th) => (
          <button
            key={th.key}
            type="button"
            className={"themeswatch" + (th.key === theme ? " on" : "")}
            onClick={() => choose(th.key)}
            disabled={busy}
            aria-pressed={th.key === theme}
          >
            <span className="themedot" style={{ background: th.accent }} aria-hidden />
            <span>{t(th.label)}</span>
          </button>
        ))}
      </div>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}
