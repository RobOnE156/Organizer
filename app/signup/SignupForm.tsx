"use client";

import { useActionState } from "react";
import { signUp } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";
import type { FormState } from "@/app/auth-types";

const initial: FormState = {};

export default function SignupForm({ code }: { code: string }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(signUp, initial);
  const loginHref = code ? `/login?code=${encodeURIComponent(code)}` : "/login";
  return (
    <form className="card stack" action={action}>
      <div>
        <p className="eyebrow">Benni-Tagebuch</p>
        <h1 className="title">{t("signup.title")}</h1>
        <p className="sub">{code ? t("signup.sub_join") : t("signup.sub")}</p>
      </div>
      {code ? <input type="hidden" name="code" value={code} /> : null}
      <div className="field">
        <label htmlFor="email">{t("auth.email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">{t("signup.password")}</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {state.message ? <p className="msg">{state.message}</p> : null}
      {state.error ? <p className="err">{state.error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "…" : t("login.register")}
      </button>
      <p className="sub" style={{ margin: 0 }}>
        {t("signup.have_account")} <a href={loginHref}>{t("login.title")}</a>
      </p>
    </form>
  );
}
