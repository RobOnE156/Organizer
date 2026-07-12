"use client";

import { useActionState } from "react";
import { signUp } from "@/app/auth-actions";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, initial);
  return (
    <main className="authwrap">
      <form className="card stack" action={action}>
        <div>
          <p className="eyebrow">Benni-Tagebuch</p>
          <h1 className="title">Konto erstellen</h1>
          <p className="sub">Ein eigenes Konto pro Elternteil — nie ein geteiltes Login.</p>
        </div>
        <div className="field">
          <label htmlFor="email">E-Mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Passwort (min. 8 Zeichen)</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        {state.message ? <p className="msg">{state.message}</p> : null}
        {state.error ? <p className="err">{state.error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "…" : "Registrieren"}
        </button>
        <p className="sub" style={{ margin: 0 }}>
          Schon ein Konto? <a href="/login">Anmelden</a>
        </p>
      </form>
    </main>
  );
}
