"use client";

import { useActionState } from "react";
import { createEntry } from "@/app/content-actions";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function EntryForm({ childId, childName }: { childId: string; childName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createEntry, initial);
  return (
    <form className="card stack" action={action}>
      <input type="hidden" name="child_id" value={childId} />
      <div>
        <p className="eyebrow">Neue Erinnerung</p>
        <h1 className="title">Für {childName}</h1>
        <p className="sub">Halte einen Moment fest. Fotos & Videos folgen bald.</p>
      </div>
      <div className="field">
        <label htmlFor="title">Titel (optional)</label>
        <input id="title" name="title" type="text" maxLength={80} placeholder="z. B. Erster Zahn" />
      </div>
      <div className="field">
        <label htmlFor="body">Text</label>
        <textarea id="body" name="body" rows={5} placeholder="Was ist passiert?"
          style={{ width: "100%", padding: "11px 13px", borderRadius: 11, border: "1px solid var(--faint)", background: "var(--surface-2)", color: "var(--ink)", font: "inherit" }} />
      </div>
      <div className="field">
        <label htmlFor="event_date">Zeitpunkt der Erinnerung</label>
        <input id="event_date" name="event_date" type="date" defaultValue={todayISO()} />
      </div>
      <label className="checkline">
        <input type="checkbox" name="is_private" />
        <span className="pt">
          <b>Nur für mich (privat)</b>
          <small>Nur du siehst diesen Eintrag — später auch das Kind, nicht der andere Elternteil.</small>
        </span>
      </label>
      {state.error ? <p className="err">{state.error}</p> : null}
      <div className="row">
        <button className="btn btn-primary" disabled={pending}>{pending ? "…" : "Speichern"}</button>
        <a className="btn" href="/">Abbrechen</a>
      </div>
    </form>
  );
}
