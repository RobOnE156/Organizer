"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/content-actions";
import { AUTHOR_COLORS } from "@/app/content-types";
import { initial } from "@/lib/timeline";

export default function ProfileForm({
  initialName,
  initialColor,
  email,
}: {
  initialName: string;
  initialColor: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await updateProfile({ displayName: name, color });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const preview = name.trim() || email.split("@")[0] || "Ich";

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div className="profileprev">
        <span className="ava ava-lg" style={{ background: color }}>{initial(preview)}</span>
        <div>
          <b>{preview}</b>
          {email ? <small className="muted" style={{ display: "block" }}>{email}</small> : null}
        </div>
      </div>

      <div className="field">
        <label htmlFor="dname">Anzeigename</label>
        <input
          id="dname"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={40}
          placeholder="z. B. Mama, Papa, dein Vorname"
          autoComplete="name"
        />
      </div>

      <div className="field">
        <label>Deine Farbe</label>
        <div className="swatches">
          {AUTHOR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={"swatch" + (c === color ? " on" : "")}
              style={{ background: c }}
              onClick={() => {
                setColor(c);
                setSaved(false);
              }}
              aria-label={"Farbe " + c}
              aria-pressed={c === color}
            >
              {c === color ? "✓" : ""}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="err">{error}</p> : null}
      {saved ? <p className="msg">Gespeichert ✓</p> : null}
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? "Speichere …" : "Speichern"}
        </button>
        <a className="btn" href="/">Abbrechen</a>
      </div>
    </form>
  );
}
