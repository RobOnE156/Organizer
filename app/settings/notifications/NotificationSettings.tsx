"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationPrefs } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";
import type { NotificationPrefs } from "@/lib/data";

type EventKey = "entry" | "comment" | "reaction";

export default function NotificationSettings({ initial }: { initial: NotificationPrefs }) {
  const router = useRouter();
  const { t } = useT();
  const [p, setP] = useState<NotificationPrefs>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows: { key: EventKey; label: string; hint: string }[] = [
    { key: "entry", label: t("notif.opt_entry"), hint: t("notif.opt_entry_hint") },
    { key: "comment", label: t("notif.opt_comment"), hint: t("notif.opt_comment_hint") },
    { key: "reaction", label: t("notif.opt_reaction"), hint: t("notif.opt_reaction_hint") },
  ];

  function set(field: keyof NotificationPrefs, value: boolean) {
    setP((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await updateNotificationPrefs(p);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const inappKey = (k: EventKey) => `${k}_inapp` as keyof NotificationPrefs;
  const emailKey = (k: EventKey) => `${k}_email` as keyof NotificationPrefs;

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="card stack">
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>{t("notif.opt_head")}</h2>

        <div className="notifmatrix">
          <div className="nmhead">
            <span />
            <span>{t("notif.ch_inapp")}</span>
            <span>{t("notif.ch_email")}</span>
          </div>
          {rows.map((r) => (
            <div className="nmrow" key={r.key}>
              <div className="nmlabel">
                <b>{r.label}</b>
                <small>{r.hint}</small>
              </div>
              <label className="nmcell">
                <input
                  type="checkbox"
                  checked={Boolean(p[inappKey(r.key)]) && !p.muted}
                  disabled={p.muted}
                  aria-label={`${r.label} – ${t("notif.ch_inapp")}`}
                  onChange={(e) => set(inappKey(r.key), e.target.checked)}
                />
              </label>
              <label className="nmcell">
                <input
                  type="checkbox"
                  checked={Boolean(p[emailKey(r.key)]) && !p.muted}
                  disabled={p.muted}
                  aria-label={`${r.label} – ${t("notif.ch_email")}`}
                  onChange={(e) => set(emailKey(r.key), e.target.checked)}
                />
              </label>
            </div>
          ))}
        </div>

        <p className="muted" style={{ margin: 0, fontSize: ".8rem" }}>{t("notif.email_privacy")}</p>
      </div>

      <div className="card stack">
        <label className="checkline">
          <input type="checkbox" checked={p.muted} onChange={(e) => set("muted", e.target.checked)} />
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
