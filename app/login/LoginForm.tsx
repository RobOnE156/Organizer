"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth-actions";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function LoginForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  const signupHref = code ? `/signup?code=${encodeURIComponent(code)}` : "/signup";
  return (
    <form className="card stack" action={action}>
      <div>
        <p className="eyebrow">Benni-Tagebuch</p>
        <h1 className="title">Anmelden</h1>
        <p className="sub">{code ? "Melde dich an, um dem Tagebuch beizutreten." : "Willkommen zurück."}</p>
      </div>
      {code ? <input type="hidden" name="code" value={code} /> : null}
      <div className="field">
        <label htmlFor="email">E-Mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Passwort</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state.error ? <p className="err">{state.error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "…" : "Anmelden"}
      </button>
      <p className="sub" style={{ margin: 0 }}>
        Noch kein Konto? <a href={signupHref}>Registrieren</a>
      </p>
    </form>
  );
}
