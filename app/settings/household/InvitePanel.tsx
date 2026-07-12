"use client";

import { useActionState } from "react";
import { createInvite } from "@/app/auth-actions";
import type { InviteState } from "@/app/auth-types";

export default function InvitePanel({ isOwner }: { isOwner: boolean }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, {});

  if (!isOwner) {
    return <p className="sub">Nur der/die Haushalts-Eigentümer:in kann einladen.</p>;
  }

  return (
    <form className="stack" action={action} style={{ maxWidth: 460 }}>
      <p className="sub" style={{ margin: 0 }}>
        Lade den zweiten Elternteil ein: erzeuge einen Code und gib ihn persönlich weiter. Er/sie
        registriert sich und tritt beim Onboarding mit dem Code bei.
      </p>
      <button className="btn btn-primary" disabled={pending}>{pending ? "…" : "Einladungs-Code erzeugen"}</button>
      {state.error ? <p className="err">{state.error}</p> : null}
      {state.code ? (
        <div>
          <p className="muted" style={{ fontSize: ".8rem", marginBottom: 6 }}>
            Gültig 14 Tage · einmalig verwendbar:
          </p>
          <p className="code">{state.code}</p>
        </div>
      ) : null}
    </form>
  );
}
