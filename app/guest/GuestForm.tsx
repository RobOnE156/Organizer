"use client";

import { useState, useTransition } from "react";
import { submitGuestContribution } from "@/app/content-actions";
import { translator, type Lang, type MsgKey } from "@/lib/i18n";

const ERR: Record<string, MsgKey> = {
  name: "guest.err_name",
  empty: "guest.err_empty",
  revoked: "guest.err_revoked",
  expired: "guest.err_expired",
  invalid: "guest.err_invalid",
  generic: "guest.err_generic",
};

// The guest's write form. Renders in the invite's language (passed in), builds
// its own translator client-side rather than reading the shell's Language
// provider (which reflects the visitor's browser, not the invite).
export default function GuestForm({
  token,
  lang,
  childName,
}: {
  token: string;
  lang: Lang;
  childName: string;
}) {
  const t = translator(lang);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="stack" style={{ gap: 10 }}>
        <p className="guestdone">✓ {t("guest.thanks")}</p>
        <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>
          {t("guest.thanks_sub")}
        </p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setDone(false);
            setTitle("");
            setBody("");
            setError(null);
          }}
        >
          {t("guest.another")}
        </button>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t("guest.err_name"));
      return;
    }
    if (!body.trim() && !title.trim()) {
      setError(t("guest.err_empty"));
      return;
    }
    start(async () => {
      const res = await submitGuestContribution({ token, guestName: name, title, body });
      if (res.error) {
        setError(t(ERR[res.error] ?? "guest.err_generic"));
        return;
      }
      setDone(true);
    });
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="gname">{t("guest.name_label")}</label>
        <input
          id="gname"
          type="text"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("guest.name_ph")}
          autoComplete="name"
        />
      </div>
      <div className="field">
        <label htmlFor="gtitle">{t("guest.title_label")}</label>
        <input
          id="gtitle"
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("guest.title_ph")}
        />
      </div>
      <div className="field">
        <label htmlFor="gbody">{t("guest.body_label")}</label>
        <textarea
          id="gbody"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("guest.body_ph", { name: childName })}
        />
      </div>
      {error ? <p className="err">{error}</p> : null}
      <button className="btn btn-primary" disabled={pending || !name.trim()}>
        {pending ? "…" : t("guest.send")}
      </button>
      <p className="muted" style={{ margin: 0, fontSize: ".78rem" }}>
        {t("guest.moderated_note")}
      </p>
    </form>
  );
}
