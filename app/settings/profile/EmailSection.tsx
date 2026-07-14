"use client";

import { useState } from "react";
import { changeEmail } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";

export default function EmailSection({ currentEmail }: { currentEmail: string }) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setBusy(true);
    const res = await changeEmail(email, pw);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSent(true);
    setEmail("");
    setPw("");
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{t("em.title")}</h2>
      <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{t("em.current", { email: currentEmail })}</p>
      <div className="field">
        <label htmlFor="newemail">{t("em.new")}</label>
        <input
          id="newemail"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSent(false);
          }}
          autoComplete="email"
          placeholder={t("em.new_ph")}
        />
      </div>
      <div className="field">
        <label htmlFor="curpw">{t("em.pw")}</label>
        <input
          id="curpw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          placeholder={t("em.pw_ph")}
        />
      </div>
      {error ? <p className="err">{error}</p> : null}
      {sent ? <p className="msg">{t("em.sent")}</p> : null}
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !email || !pw}>
          {busy ? t("common.saving") : t("em.submit")}
        </button>
      </div>
    </form>
  );
}
