"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateA11y } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";

export default function AccessibilitySection({
  initialTextSize,
  initialHighContrast,
  initialReduceMotion,
}: {
  initialTextSize: string;
  initialHighContrast: boolean;
  initialReduceMotion: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  const [large, setLarge] = useState(initialTextSize === "large");
  const [contrast, setContrast] = useState(initialHighContrast);
  const [motion, setMotion] = useState(initialReduceMotion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await updateA11y({
      textSize: large ? "large" : "normal",
      highContrast: contrast,
      reduceMotion: motion,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh(); // re-render the layout so the change applies immediately
  }

  return (
    <div className="card stack">
      <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{t("a11y.title")}</h2>
      <label className="checkline">
        <input type="checkbox" checked={large} onChange={(e) => { setLarge(e.target.checked); setSaved(false); }} />
        <span className="pt">
          <b>{t("a11y.large")}</b>
          <small>{t("a11y.large_hint")}</small>
        </span>
      </label>
      <label className="checkline">
        <input type="checkbox" checked={contrast} onChange={(e) => { setContrast(e.target.checked); setSaved(false); }} />
        <span className="pt">
          <b>{t("a11y.contrast")}</b>
          <small>{t("a11y.contrast_hint")}</small>
        </span>
      </label>
      <label className="checkline">
        <input type="checkbox" checked={motion} onChange={(e) => { setMotion(e.target.checked); setSaved(false); }} />
        <span className="pt">
          <b>{t("a11y.motion")}</b>
          <small>{t("a11y.motion_hint")}</small>
        </span>
      </label>
      {error ? <p className="err">{error}</p> : null}
      {saved ? <p className="msg">{t("common.saved")}</p> : null}
      <div className="row">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
