"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationPrefs } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";
import type { NotificationPrefs } from "@/lib/data";

export default function NotificationSettings({ initial }: { initial: NotificationPrefs }) {
  const router = useRouter();
  const { t } = useT();
  const [entry, setEntry] = useState(initial.entry_inapp);
  const [comment, setComment] = useState(initial.comment_inapp);
  const [reaction, setReaction] = useState(initial.reaction_inapp);
  const [muted, setMuted] = useState(initial.muted);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function touch() {
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await updateNotificationPrefs({
      entry_inapp: entry,
      comment_inapp: comment,
      reaction_inapp: reaction,
      muted,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="card stack">
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{t("notif.opt_head")}</h2>
        <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{t("notif.opt_channel_note")}</p>

        <label className="checkline">
          <input type="checkbox" checked={entry && !muted} disabled={muted} onChange={(e) => { setEntry(e.target.checked); touch(); }} />
          <span className="pt">
            <b>{t("notif.opt_entry")}</b>
            <small>{t("notif.opt_entry_hint")}</small>
          </span>
        </label>
        <label className="checkline">
          <input type="checkbox" checked={comment && !muted} disabled={muted} onChange={(e) => { setComment(e.target.checked); touch(); }} />
          <span className="pt">
            <b>{t("notif.opt_comment")}</b>
            <small>{t("notif.opt_comment_hint")}</small>
          </span>
        </label>
        <label className="checkline">
          <input type="checkbox" checked={reaction && !muted} disabled={muted} onChange={(e) => { setReaction(e.target.checked); touch(); }} />
          <span className="pt">
            <b>{t("notif.opt_reaction")}</b>
            <small>{t("notif.opt_reaction_hint")}</small>
          </span>
        </label>
      </div>

      <div className="card stack">
        <label className="checkline">
          <input type="checkbox" checked={muted} onChange={(e) => { setMuted(e.target.checked); touch(); }} />
          <span className="pt">
            <b>{t("notif.mute")}</b>
            <small>{t("notif.mute_hint")}</small>
          </span>
        </label>
      </div>

      {error ? <p className="err">{error}</p> : null}
      {saved ? <p className="msg">{t("common.saved")}</p> : null}
      <div className="row">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
