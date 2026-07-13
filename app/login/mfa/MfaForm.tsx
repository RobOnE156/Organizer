"use client";

import { useActionState } from "react";
import { verifyMfa } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function MfaForm({ inviteCode }: { inviteCode: string }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(verifyMfa, initial);
  return (
    <form className="card stack" action={action}>
      <div>
        <p className="eyebrow">{t("mfa.eyebrow")}</p>
        <h1 className="title">{t("mfa.title")}</h1>
        <p className="sub">{t("mfa.sub")}</p>
      </div>
      {inviteCode ? <input type="hidden" name="invite_code" value={inviteCode} /> : null}
      <div className="field">
        <label htmlFor="code">{t("sec.code")}</label>
        <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required
          pattern="[0-9]*" maxLength={6} />
      </div>
      {state.error ? <p className="err">{state.error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "…" : t("mfa.title")}
      </button>
    </form>
  );
}
