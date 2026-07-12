"use client";

import { useActionState } from "react";
import { verifyMfa } from "@/app/auth-actions";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function MfaPage() {
  const [state, action, pending] = useActionState(verifyMfa, initial);
  return (
    <main className="authwrap">
      <form className="card stack" action={action}>
        <div>
          <p className="eyebrow">Zwei-Faktor</p>
          <h1 className="title">Bestätigen</h1>
          <p className="sub">Gib den 6-stelligen Code aus deiner Authenticator-App ein.</p>
        </div>
        <div className="field">
          <label htmlFor="code">Code</label>
          <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required
            pattern="[0-9]*" maxLength={6} />
        </div>
        {state.error ? <p className="err">{state.error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "…" : "Bestätigen"}
        </button>
      </form>
    </main>
  );
}
