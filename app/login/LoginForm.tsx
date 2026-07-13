"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function LoginForm({ code }: { code: string }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(signIn, initial);
  const signupHref = code ? `/signup?code=${encodeURIComponent(code)}` : "/signup";
  return (
    <form className="card stack" action={action}>
      <div>
        <p className="eyebrow">Benni-Tagebuch</p>
        <h1 className="title">{t("login.title")}</h1>
        <p className="sub">{code ? t("login.sub_join") : t("login.sub")}</p>
      </div>
      {code ? <input type="hidden" name="code" value={code} /> : null}
      <div className="field">
        <label htmlFor="email">{t("auth.email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">{t("auth.password")}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state.error ? <p className="err">{state.error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "…" : t("login.title")}
      </button>
      <p className="sub" style={{ margin: 0 }}>
        {t("login.no_account")} <a href={signupHref}>{t("login.register")}</a>
      </p>
    </form>
  );
}
