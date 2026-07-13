"use client";

import { useState } from "react";
import { changePassword } from "@/app/auth-actions";

export default function PasswordSection() {
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
      setError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (pw !== pw2) {
      setError("Die Passwörter stimmen nicht überein.");
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
      <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Passwort ändern</h2>
      <div className="field">
        <label htmlFor="newpw">Neues Passwort</label>
        <input
          id="newpw"
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setSaved(false);
          }}
          autoComplete="new-password"
          placeholder="mindestens 8 Zeichen"
        />
      </div>
      <div className="field">
        <label htmlFor="newpw2">Neues Passwort wiederholen</label>
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
      {saved ? <p className="msg">Passwort geändert ✓</p> : null}
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !pw || !pw2}>
          {busy ? "Speichere …" : "Passwort ändern"}
        </button>
      </div>
    </form>
  );
}
