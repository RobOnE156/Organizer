"use client";

import { useState } from "react";
import { changePassword } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";

export default function PasswordSection() {
  const { t } = useT();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (pw.length < 8) {
      setError(t("pw.min"));
      return;
    }
    if (pw !== pw2) {
      setError(t("pw.mismatch"));
      return;
    }
    setBusy(true);
    const res = await changePassword(pw);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setPw("");
    setPw2("");
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{t("pw.title")}</h2>
      <div className="field">
        <label htmlFor="newpw">{t("pw.new")}</label>
        <input
          id="newpw"
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setSaved(false);
          }}
          autoComplete="new-password"
          placeholder={t("pw.new_ph")}
        />
      </div>
      <div className="field">
        <label htmlFor="newpw2">{t("pw.repeat")}</label>
        <input
          id="newpw2"
          type="password"
          value={pw2}
          onChange={(e) => {
            setPw2(e.target.value);
            setSaved(false);
          }}
          autoComplete="new-password"
        />
      </div>
      {error ? <p className="err">{error}</p> : null}
      {saved ? <p className="msg">{t("pw.changed")}</p> : null}
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !pw || !pw2}>
          {busy ? t("common.saving") : t("pw.title")}
        </button>
      </div>
    </form>
  );
}
