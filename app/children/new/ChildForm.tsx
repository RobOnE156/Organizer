"use client";

import { useActionState } from "react";
import { createChild } from "@/app/content-actions";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function ChildForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createChild, initial);
  return (
    <form className="card stack" action={action}>
      <div>
        <p className="eyebrow">Einrichten</p>
        <h1 className="title">Kind anlegen</h1>
        <p className="sub">Für wen ist dieses Tagebuch?</p>
      </div>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required placeholder="z. B. Benni" />
      </div>
      <div className="field">
        <label htmlFor="birth">Geburtsdatum (optional)</label>
        <input id="birth" name="birth" type="date" />
      </div>
      {state.error ? <p className="err">{state.error}</p> : null}
      <button className="btn btn-primary" disabled={pending}>{pending ? "…" : "Speichern"}</button>
      <p className="sub" style={{ margin: 0 }}>
        <a href="/">← Zurück</a>
      </p>
    </form>
  );
}
