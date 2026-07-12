"use client";

import { useActionState } from "react";
import { signUp } from "@/app/auth-actions";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function SignupForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(signUp, initial);
  const loginHref = code ? `/login?code=${encodeURIComponent(code)}` : "/login";
  return (
    <form className="card stack" action={action}>
      <div>
        <p className="eyebrow">Benni-Tagebuch</p>
        <h1 className="title">Konto erstellen</h1>
        <p className="sub">
          {code
            ? "Erstelle dein eigenes Konto — danach trittst du automatisch dem Tagebuch bei."
            : "Ein eigenes Konto pro Elternteil — nie ein geteiltes Login."}
        </p>
      </div>
      {code ? <input type="hidden" name="code" value={code} /> : null}
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
        Schon ein Konto? <a href={loginHref}>Anmelden</a>
      </p>
    </form>
  );
}
