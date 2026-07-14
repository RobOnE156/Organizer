"use client";

import { useState, useTransition } from "react";
import { generateRecoveryCodes } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";

function fmt(c: string): string {
  return c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
}

export default function RecoveryCodes({
  remaining,
  configured,
}: {
  remaining: number;
  configured: boolean;
}) {
  const { t } = useT();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function generate() {
    setError(null);
    setCopied(false);
    start(async () => {
      const res = await generateRecoveryCodes();
      if (res.error) {
        setError(res.error);
        return;
      }
      setCodes(res.codes ?? []);
    });
  }

  async function copyAll() {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.map(fmt).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — codes are still visible to select manually */
    }
  }

  function download() {
    if (!codes) return;
    const text = `${t("rec.file_header")}\n\n${codes.map(fmt).join("\n")}\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "benni-tagebuch-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card stack" style={{ marginTop: 18, maxWidth: 460 }}>
      <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{t("rec.title")}</h2>
      <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{t("rec.sub")}</p>
      {!configured ? <p className="err" style={{ fontSize: ".82rem" }}>{t("rec.not_configured")}</p> : null}

      {codes ? (
        <>
          <p className="msg">{t("rec.save_now")}</p>
          <div className="reccodes">
            {codes.map((c, i) => (
              <span key={i} className="reccode">{fmt(c)}</span>
            ))}
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={copyAll}>{copied ? t("rec.copied") : t("rec.copy")}</button>
            <button type="button" className="btn" onClick={download}>{t("rec.download")}</button>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: ".78rem" }}>{t("rec.print_hint")}</p>
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: 0, fontSize: ".85rem" }}>
            {remaining > 0 ? t("rec.remaining", { n: remaining }) : t("rec.none")}
          </p>
          <button className="btn btn-primary" onClick={generate} disabled={pending}>
            {pending ? "…" : remaining > 0 ? t("rec.regenerate") : t("rec.generate")}
          </button>
          {remaining > 0 ? <p className="muted" style={{ margin: 0, fontSize: ".78rem" }}>{t("rec.regenerate_hint")}</p> : null}
          {error ? <p className="err">{error}</p> : null}
        </>
      )}
    </div>
  );
}
