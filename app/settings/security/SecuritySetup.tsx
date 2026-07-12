"use client";

import { useActionState, useState, useTransition } from "react";
import { enrollTotp, verifyEnroll } from "@/app/auth-actions";
import type { FormState, EnrollResult } from "@/app/auth-types";

export default function SecuritySetup({ hasTotp }: { hasTotp: boolean }) {
  const [enroll, setEnroll] = useState<EnrollResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [verifyState, verifyAction, verifying] = useActionState<FormState, FormData>(verifyEnroll, {});

  if (hasTotp) {
    return (
      <p className="msg">
        ✅ Zwei-Faktor ist aktiv. Damit dich ein verlorenes Handy nicht aussperrt, nutze eine
        Authenticator-App mit Cloud-Backup (z. B. iPhone-„Passwörter", 1Password oder Authy).
        Geht der Zugang trotzdem verloren, kann der/die Haushalts-Eigentümer:in den zweiten
        Faktor zurücksetzen.
      </p>
    );
  }

  if (!enroll?.factorId) {
    return (
      <div className="stack" style={{ maxWidth: 460 }}>
        <button
          className="btn btn-primary"
          disabled={pending}
          onClick={() => startTransition(async () => setEnroll(await enrollTotp()))}
        >
          {pending ? "…" : "Zwei-Faktor aktivieren"}
        </button>
        {enroll?.error ? <p className="err">{enroll.error}</p> : null}
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 460 }}>
      <p className="sub">Scanne den QR-Code mit deiner Authenticator-App und gib dann den 6-stelligen Code ein.</p>
      <div className="qr" dangerouslySetInnerHTML={{ __html: enroll.qr ?? "" }} />
      <p className="muted" style={{ fontSize: ".8rem" }}>
        Manuell: <span className="code">{enroll.secret}</span>
      </p>
      <form className="stack" action={verifyAction}>
        <input type="hidden" name="factorId" value={enroll.factorId} />
        <div className="field">
          <label htmlFor="code">Code</label>
          <input id="code" name="code" type="text" inputMode="numeric" maxLength={6} pattern="[0-9]*" required />
        </div>
        {verifyState.error ? <p className="err">{verifyState.error}</p> : null}
        <button className="btn btn-primary" disabled={verifying}>{verifying ? "…" : "Bestätigen & aktivieren"}</button>
      </form>
    </div>
  );
}
