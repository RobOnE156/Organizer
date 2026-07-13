"use client";

import { useActionState } from "react";
import { createChild } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function ChildForm() {
  const { t } = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(createChild, initial);
  return (
    <form className="card stack" action={action}>
      <div>
        <p className="eyebrow">{t("ob.eyebrow")}</p>
        <h1 className="title">{t("child.title")}</h1>
        <p className="sub">{t("child.sub")}</p>
      </div>
      <div className="field">
        <label htmlFor="name">{t("child.name_label")}</label>
        <input id="name" name="name" type="text" required placeholder={t("child.name_ph")} />
      </div>
      <div className="field">
        <label htmlFor="birth">{t("child.birth_label")}</label>
        <input id="birth" name="birth" type="date" />
      </div>
      {state.error ? <p className="err">{state.error}</p> : null}
      <button className="btn btn-primary" disabled={pending}>{pending ? "…" : t("common.save")}</button>
      <p className="sub" style={{ margin: 0 }}>
        <a href="/">{t("common.back")}</a>
      </p>
    </form>
  );
}
