"use client";

import { useActionState, useState, useTransition } from "react";
import { enrollTotp, verifyEnroll } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";
import type { FormState, EnrollResult } from "@/app/auth-types";

export default function SecuritySetup({ hasTotp }: { hasTotp: boolean }) {
  const { t } = useT();
  const [enroll, setEnroll] = useState<EnrollResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [verifyState, verifyAction, verifying] = useActionState<FormState, FormData>(verifyEnroll, {});

  if (hasTotp) {
    return <p className="msg">{t("sec.active")}</p>;
  }

  if (!enroll?.factorId) {
    return (
      <div className="stack" style={{ maxWidth: 460 }}>
        <button
          className="btn btn-primary"
          disabled={pending}
          onClick={() => startTransition(async () => setEnroll(await enrollTotp()))}
        >
          {pending ? "…" : t("sec.enable")}
        </button>
        {enroll?.error ? <p className="err">{enroll.error}</p> : null}
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 460 }}>
      <p className="sub">{t("sec.scan")}</p>
      <div className="qr" dangerouslySetInnerHTML={{ __html: enroll.qr ?? "" }} />
      <p className="muted" style={{ fontSize: ".8rem" }}>
        {t("sec.manual")} <span className="code">{enroll.secret}</span>
      </p>
      <form className="stack" action={verifyAction}>
        <input type="hidden" name="factorId" value={enroll.factorId} />
        <div className="field">
          <label htmlFor="code">{t("sec.code")}</label>
          <input id="code" name="code" type="text" inputMode="numeric" maxLength={6} pattern="[0-9]*" required />
        </div>
        {verifyState.error ? <p className="err">{verifyState.error}</p> : null}
        <button className="btn btn-primary" disabled={verifying}>{verifying ? "…" : t("sec.confirm")}</button>
      </form>
    </div>
  );
}
