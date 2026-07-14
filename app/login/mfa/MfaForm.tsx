"use client";

import { useActionState, useState } from "react";
import { verifyMfa, redeemRecoveryCode } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function MfaForm({ inviteCode }: { inviteCode: string }) {
  const { t } = useT();
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [state, action, pending] = useActionState(verifyMfa, initial);
  const [recState, recAction, recPending] = useActionState(redeemRecoveryCode, initial);

  if (mode === "recovery") {
    return (
      <form className="card stack" action={recAction}>
        <div>
          <p className="eyebrow">{t("mfa.eyebrow")}</p>
          <h1 className="title">{t("rec.mfa_title")}</h1>
          <p className="sub">{t("rec.mfa_sub")}</p>
        </div>
        {inviteCode ? <input type="hidden" name="invite_code" value={inviteCode} /> : null}
        <div className="field">
          <label htmlFor="rcode">{t("rec.code_label")}</label>
          <input id="rcode" name="code" type="text" autoComplete="one-time-code" autoCapitalize="off" required />
        </div>
        {recState.error ? <p className="err">{recState.error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={recPending}>
          {recPending ? "…" : t("rec.mfa_submit")}
        </button>
        <button type="button" className="linklike" onClick={() => setMode("totp")}>
          {t("rec.back_to_totp")}
        </button>
      </form>
    );
  }

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
      <button type="button" className="linklike" onClick={() => setMode("recovery")}>
        {t("rec.lost_device")}
      </button>
    </form>
  );
}
