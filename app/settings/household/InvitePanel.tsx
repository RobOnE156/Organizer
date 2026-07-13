"use client";

import { useActionState, useEffect, useState } from "react";
import { createInvite } from "@/app/auth-actions";
import { useT } from "@/app/LanguageProvider";
import type { InviteState } from "@/app/auth-types";

export default function InvitePanel({ isOwner }: { isOwner: boolean }) {
  const { t } = useT();
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, {});
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  if (!isOwner) {
    return <p className="sub">{t("inv.not_owner")}</p>;
  }

  const link = state.code && origin ? `${origin}/join?code=${state.code}` : "";

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is still visible to select manually */
    }
  }

  async function share() {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Benni-Tagebuch",
          text: t("inv.share_text"),
          url: link,
        });
      } catch {
        /* user cancelled the share sheet */
      }
    } else {
      await copy();
    }
  }

  return (
    <form className="stack" action={action} style={{ maxWidth: 460 }}>
      <p className="sub" style={{ margin: 0 }}>{t("inv.intro")}</p>
      <button className="btn btn-primary" disabled={pending}>{pending ? "…" : t("inv.create")}</button>
      {state.error ? <p className="err">{state.error}</p> : null}
      {state.code ? (
        <div className="stack" style={{ gap: 8 }}>
          <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>{t("inv.valid")}</p>
          <p className="code">{link || "…"}</p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={share}>{t("inv.share")}</button>
            <button type="button" className="btn" onClick={copy}>{copied ? t("inv.copied") : t("inv.copy")}</button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
