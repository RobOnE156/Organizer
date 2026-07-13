"use client";

import { useActionState } from "react";
import { createHousehold, redeemInvite } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function OnboardingForm() {
  const { t } = useT();
  const [createState, createAction, creating] = useActionState<FormState, FormData>(createHousehold, initial);
  const [joinState, joinAction, joining] = useActionState<FormState, FormData>(redeemInvite, initial);

  return (
    <div className="card stack" style={{ width: "min(460px, 100%)" }}>
      <div>
        <p className="eyebrow">{t("ob.eyebrow")}</p>
        <h1 className="title">{t("ob.title")}</h1>
        <p className="sub">{t("ob.sub")}</p>
      </div>

      <form className="stack" action={createAction}>
        <div className="field">
          <label htmlFor="name">{t("ob.name_label")}</label>
          <input id="name" name="name" type="text" placeholder={t("ob.name_ph")} />
        </div>
        {createState.error ? <p className="err">{createState.error}</p> : null}
        <button className="btn btn-primary" disabled={creating}>{creating ? "…" : t("ob.title")}</button>
      </form>

      <p className="muted" style={{ fontSize: ".8rem", textAlign: "center", margin: 0 }}>{t("ob.or")}</p>

      <form className="stack" action={joinAction}>
        <div className="field">
          <label htmlFor="code">{t("ob.code_label")}</label>
          <input id="code" name="code" type="text" placeholder={t("ob.code_ph")} />
        </div>
        {joinState.error ? <p className="err">{joinState.error}</p> : null}
        <button className="btn" disabled={joining}>{joining ? "…" : t("ob.join")}</button>
      </form>
    </div>
  );
}
