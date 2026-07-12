"use client";

import { useActionState } from "react";
import { createHousehold, redeemInvite } from "@/app/auth-actions";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function OnboardingForm() {
  const [createState, createAction, creating] = useActionState<FormState, FormData>(createHousehold, initial);
  const [joinState, joinAction, joining] = useActionState<FormState, FormData>(redeemInvite, initial);

  return (
    <div className="card stack" style={{ width: "min(460px, 100%)" }}>
      <div>
        <p className="eyebrow">Einrichten</p>
        <h1 className="title">Haushalt anlegen</h1>
        <p className="sub">
          Ein Haushalt bündelt eure Erinnerungen. Lege einen neuen an — oder tritt mit einem
          Einladungs-Code des anderen Elternteils bei.
        </p>
      </div>

      <form className="stack" action={createAction}>
        <div className="field">
          <label htmlFor="name">Name des Haushalts</label>
          <input id="name" name="name" type="text" placeholder="z. B. Familie Wolter" />
        </div>
        {createState.error ? <p className="err">{createState.error}</p> : null}
        <button className="btn btn-primary" disabled={creating}>{creating ? "…" : "Haushalt anlegen"}</button>
      </form>

      <p className="muted" style={{ fontSize: ".8rem", textAlign: "center", margin: 0 }}>oder</p>

      <form className="stack" action={joinAction}>
        <div className="field">
          <label htmlFor="code">Einladungs-Code</label>
          <input id="code" name="code" type="text" placeholder="Code vom anderen Elternteil" />
        </div>
        {joinState.error ? <p className="err">{joinState.error}</p> : null}
        <button className="btn" disabled={joining}>{joining ? "…" : "Mit Code beitreten"}</button>
      </form>
    </div>
  );
}
