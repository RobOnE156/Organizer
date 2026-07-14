"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShareLink, revokeShareLink } from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";
import { useT } from "@/app/LanguageProvider";
import { fmtDate } from "@/lib/timeline";
import { LANGS } from "@/lib/i18n";
import type { Child, ShareLink } from "@/lib/data";

// 0 means "no expiry" (handover / gift mode).
const EXPIRY_OPTIONS = [7, 30, 90, 0] as const;

export default function SharingPanel({
  kids,
  links,
  defaultLang,
}: {
  kids: Child[];
  links: ShareLink[];
  defaultLang: string;
}) {
  const { t } = useT();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();

  const firstKid = kids[0];
  const [childId, setChildId] = useState<string>(firstKid?.id ?? "");
  const [label, setLabel] = useState("");
  const [lang, setLang] = useState(defaultLang);
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeLinks = links.filter((l) => l.status === "active");

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNewLink(null);
    setCopied(false);
    start(async () => {
      const res = await createShareLink({
        scope: "timeline",
        childId: childId || null,
        label,
        language: lang,
        days,
      });
      if (res.error || !res.token) {
        setError(res.error ?? t("sharing.err_create"));
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setNewLink(`${origin}/share/${res.token}`);
      setLabel("");
      router.refresh();
    });
  }

  async function copyLink() {
    if (!newLink) return;
    try {
      await navigator.clipboard.writeText(newLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is still visible to select manually */
    }
  }

  async function shareLink() {
    if (!newLink) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Benni-Tagebuch", text: t("sharing.share_text"), url: newLink });
      } catch {
        /* user cancelled the share sheet */
      }
    } else {
      await copyLink();
    }
  }

  function onRevoke(id: string) {
    start(async () => {
      const ok = await confirm({
        title: t("sharing.revoke_title"),
        body: t("sharing.revoke_body"),
        danger: true,
      });
      if (!ok) return;
      const res = await revokeShareLink(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <section className="stack" style={{ maxWidth: 620 }}>
      <form className="card stack" onSubmit={onCreate}>
        <p className="eyebrow" style={{ margin: 0 }}>{t("sharing.create")}</p>
        <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{t("sharing.create_hint")}</p>

        <div className="field">
          <label htmlFor="slabel">{t("sharing.label_label")}</label>
          <input
            id="slabel"
            type="text"
            maxLength={80}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("sharing.label_ph")}
          />
        </div>

        {kids.length > 1 ? (
          <div className="field">
            <label>{t("sharing.child_label")}</label>
            <div className="langopts">
              {kids.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className={"langbtn" + (k.id === childId ? " on" : "")}
                  onClick={() => setChildId(k.id)}
                  aria-pressed={k.id === childId}
                >
                  {k.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="field">
          <label>{t("sharing.lang_label")}</label>
          <div className="langopts">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                className={"langbtn" + (l.code === lang ? " on" : "")}
                onClick={() => setLang(l.code)}
                aria-pressed={l.code === lang}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t("sharing.expiry_label")}</label>
          <div className="langopts">
            {EXPIRY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={"langbtn" + (d === days ? " on" : "")}
                onClick={() => setDays(d)}
                aria-pressed={d === days}
              >
                {d === 0 ? t("sharing.expiry_never") : t("sharing.expiry_days", { n: d })}
              </button>
            ))}
          </div>
        </div>

        <p className="sharenote">🔒 {t("sharing.privacy")}</p>

        {error ? <p className="err">{error}</p> : null}
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "…" : t("sharing.create_btn")}
        </button>

        {newLink ? (
          <div className="stack" style={{ gap: 8 }}>
            <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>{t("sharing.link_ready")}</p>
            <p className="code">{newLink}</p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={shareLink}>{t("sharing.share")}</button>
              <button type="button" className="btn" onClick={copyLink}>
                {copied ? t("sharing.copied") : t("sharing.copy")}
              </button>
            </div>
          </div>
        ) : null}
      </form>

      {activeLinks.length > 0 ? (
        <div className="stack" style={{ gap: 8 }}>
          <h2 className="shead">{t("sharing.active_links")}</h2>
          {activeLinks.map((l) => (
            <div className="invrow" key={l.id}>
              <div style={{ minWidth: 0 }}>
                <b>{l.label || t("sharing.unnamed_link")}</b>
                <small className="muted" style={{ display: "block" }}>
                  {l.expires_at ? t("sharing.expires_on", { date: fmtDate(l.expires_at) }) : t("sharing.no_expiry")}
                  {l.last_viewed_at ? " · " + t("sharing.viewed") : ""}
                </small>
              </div>
              <span className="statuspill active">{t("sharing.status_active")}</span>
              <button type="button" className="btn" onClick={() => onRevoke(l.id)} disabled={pending}>
                {t("sharing.revoke")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">{t("sharing.empty")}</p>
      )}
    </section>
  );
}
