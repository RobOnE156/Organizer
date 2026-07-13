"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createGuestInvite,
  revokeGuestInvite,
  moderateContribution,
} from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";
import { useT } from "@/app/LanguageProvider";
import Avatar from "@/app/Avatar";
import { fmtDate } from "@/lib/timeline";
import { LANGS } from "@/lib/i18n";
import type {
  Child,
  GuestInvite,
  GuestContribution,
  MemberProfile,
} from "@/lib/data";

const EXPIRY_OPTIONS = [7, 30, 90] as const;

export default function GuestsPanel({
  kids,
  invites,
  contributions,
  authors,
  defaultLang,
}: {
  kids: Child[];
  invites: GuestInvite[];
  contributions: GuestContribution[];
  authors: Record<string, MemberProfile>;
  defaultLang: string;
}) {
  const { t } = useT();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();

  const firstKid = kids[0];
  const [childId, setChildId] = useState<string>(firstKid?.id ?? "");
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [lang, setLang] = useState(defaultLang);
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pendingContribs = useMemo(
    () => contributions.filter((c) => c.status === "pending"),
    [contributions],
  );
  const approvedContribs = useMemo(
    () => contributions.filter((c) => c.status === "approved"),
    [contributions],
  );
  const activeInvites = useMemo(
    () => invites.filter((i) => i.status === "active"),
    [invites],
  );

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNewLink(null);
    setCopied(false);
    start(async () => {
      const res = await createGuestInvite({
        childId: childId || null,
        label,
        message,
        language: lang,
        days,
      });
      if (res.error || !res.token) {
        setError(res.error ?? t("guests.err_create"));
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setNewLink(`${origin}/guest?token=${res.token}`);
      setLabel("");
      setMessage("");
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
        await navigator.share({ title: "Benni-Tagebuch", text: t("guests.share_text"), url: newLink });
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
        title: t("guests.revoke_title"),
        body: t("guests.revoke_body"),
        danger: true,
      });
      if (!ok) return;
      const res = await revokeGuestInvite(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function onModerate(id: string, decision: "approved" | "rejected") {
    start(async () => {
      const res = await moderateContribution(id, decision);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  const who = (id: string | null): MemberProfile =>
    (id && authors[id]) || { name: t("guests.a_parent"), color: "#8a8a8a" };

  return (
    <section className="stack" style={{ maxWidth: 620 }}>
      {/* create a link */}
      <form className="card stack" onSubmit={onCreate}>
        <p className="eyebrow" style={{ margin: 0 }}>{t("guests.create")}</p>
        <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{t("guests.create_hint")}</p>

        <div className="field">
          <label htmlFor="glabel">{t("guests.label_label")}</label>
          <input
            id="glabel"
            type="text"
            maxLength={80}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("guests.label_ph")}
          />
        </div>

        <div className="field">
          <label htmlFor="gmsg">{t("guests.msg_label")}</label>
          <textarea
            id="gmsg"
            rows={3}
            maxLength={400}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("guests.msg_ph")}
          />
        </div>

        {kids.length > 1 ? (
          <div className="field">
            <label>{t("guests.child_label")}</label>
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
          <label>{t("guests.lang_label")}</label>
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
          <label>{t("guests.expiry_label")}</label>
          <div className="langopts">
            {EXPIRY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={"langbtn" + (d === days ? " on" : "")}
                onClick={() => setDays(d)}
                aria-pressed={d === days}
              >
                {t("guests.expiry_days", { n: d })}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="err">{error}</p> : null}
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "…" : t("guests.create_btn")}
        </button>

        {newLink ? (
          <div className="stack" style={{ gap: 8 }}>
            <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>{t("guests.link_ready")}</p>
            <p className="code">{newLink}</p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={shareLink}>{t("guests.share")}</button>
              <button type="button" className="btn" onClick={copyLink}>
                {copied ? t("guests.copied") : t("guests.copy")}
              </button>
            </div>
          </div>
        ) : null}
      </form>

      {/* pending moderation queue */}
      {pendingContribs.length > 0 ? (
        <div className="stack" style={{ gap: 10 }}>
          <h2 className="shead">{t("guests.pending", { n: pendingContribs.length })}</h2>
          {pendingContribs.map((c) => (
            <article className="contribcard pending" key={c.id}>
              <div className="lmeta">
                <span className="gwho">👤 {c.guest_name}</span>
                <span className="lwhen">{fmtDate(c.created_at)}</span>
              </div>
              {c.title ? <h3 className="ltitle">{c.title}</h3> : null}
              {c.body ? <p className="lbody">{c.body}</p> : null}
              <div className="row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onModerate(c.id, "approved")}
                  disabled={pending}
                >
                  ✓ {t("guests.approve")}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => onModerate(c.id, "rejected")}
                  disabled={pending}
                >
                  ✕ {t("guests.reject")}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {/* approved wall */}
      {approvedContribs.length > 0 ? (
        <div className="stack" style={{ gap: 10 }}>
          <h2 className="shead">{t("guests.wall")}</h2>
          {approvedContribs.map((c) => {
            const reviewer = who(c.reviewed_by);
            return (
              <article className="contribcard" key={c.id}>
                <div className="lmeta">
                  <span className="gwho">👤 {c.guest_name}</span>
                  <span className="lwhen">{fmtDate(c.created_at)}</span>
                </div>
                {c.title ? <h3 className="ltitle">{c.title}</h3> : null}
                {c.body ? <p className="lbody">{c.body}</p> : null}
                <div className="lmeta" style={{ marginTop: 4 }}>
                  <Avatar name={reviewer.name} color={reviewer.color} url={reviewer.avatarUrl} className="cava" />
                  <small className="muted">{t("guests.approved_by", { name: reviewer.name })}</small>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {/* active links */}
      {activeInvites.length > 0 ? (
        <div className="stack" style={{ gap: 8 }}>
          <h2 className="shead">{t("guests.active_links")}</h2>
          {activeInvites.map((i) => (
            <div className="invrow" key={i.id}>
              <div style={{ minWidth: 0 }}>
                <b>{i.label || t("guests.unnamed_link")}</b>
                <small className="muted" style={{ display: "block" }}>
                  {t("guests.expires_on", { date: fmtDate(i.expires_at) })}
                  {i.used_at ? " · " + t("guests.used") : ""}
                </small>
              </div>
              <span className="statuspill active">{t("guests.status_active")}</span>
              <button type="button" className="btn" onClick={() => onRevoke(i.id)} disabled={pending}>
                {t("guests.revoke")}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {pendingContribs.length === 0 && approvedContribs.length === 0 && activeInvites.length === 0 ? (
        <p className="muted">{t("guests.empty")}</p>
      ) : null}
    </section>
  );
}
