"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLetter, updateLetter, deleteLetter } from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";
import { useT } from "@/app/LanguageProvider";
import Avatar from "@/app/Avatar";
import { fmtDate } from "@/lib/timeline";
import type { MemberProfile } from "@/lib/data";

export type ViewLetter = {
  id: string;
  author_id: string;
  mine: boolean;
  locked: boolean;
  unlockOn: string | null;
  title: string | null;
  body: string;
  unlock_mode: "date" | "age";
  unlock_date: string | null;
  unlock_age_years: number | null;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusYears(iso: string, n: number): string {
  return String(Number(iso.slice(0, 4)) + n) + iso.slice(4);
}

export default function LettersPanel({
  childId,
  childName,
  birthDate,
  letters,
  authors,
  userId,
}: {
  childId: string;
  childName: string;
  birthDate: string | null;
  letters: ViewLetter[];
  authors: Record<string, MemberProfile>;
  userId: string;
}) {
  const { t } = useT();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();

  const today = todayISO();
  const birth18 = birthDate ? plusYears(birthDate, 18) : plusYears(today, 18);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [unlockDate, setUnlockDate] = useState(birth18);
  const [error, setError] = useState<string | null>(null);

  const fallback: MemberProfile = { name: "Elternteil", color: "#8a8a8a" };
  const who = (id: string) => authors[id] ?? fallback;

  // Your own letters (with content) that are still sealed.
  const yourSealed = letters.filter((l) => l.mine && l.locked);
  // Everything that has opened (yours + the co-parent's), readable.
  const opened = letters.filter((l) => !l.locked);
  // The co-parent's sealed letters — content was stripped server-side; only
  // author + unlock date remain, grouped for a "waiting for you" teaser.
  const teasers = new Map<string, string[]>();
  for (const l of letters) {
    if (l.locked && !l.mine) {
      const arr = teasers.get(l.author_id) ?? [];
      if (l.unlockOn) arr.push(l.unlockOn);
      teasers.set(l.author_id, arr);
    }
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setUnlockDate(birth18);
    setError(null);
  }

  function startEdit(l: ViewLetter) {
    setEditingId(l.id);
    setTitle(l.title ?? "");
    setBody(l.body);
    setUnlockDate(l.unlockOn ?? birth18);
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) return;
    const payload = { title, body, unlockMode: "date" as const, unlockDate, unlockAgeYears: 0 };
    start(async () => {
      const res = editingId ? await updateLetter(editingId, payload) : await addLetter({ childId, ...payload });
      if (res.error) {
        setError(res.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  }

  function onDelete(id: string) {
    start(async () => {
      const ok = await confirm({ title: t("letters.del_title"), body: t("letters.del_body"), danger: true });
      if (!ok) return;
      const res = await deleteLetter(id);
      if (res.error) setError(res.error);
      else {
        if (editingId === id) resetForm();
        router.refresh();
      }
    });
  }

  function LetterCard({ l }: { l: ViewLetter }) {
    const a = who(l.author_id);
    return (
      <article className={"lettercard" + (l.locked ? " sealed" : "")}>
        <div className="lmeta">
          <Avatar name={a.name} color={a.color} url={a.avatarUrl} className="cava" />
          <b>{a.name}</b>
          <span className="lwhen">
            {l.locked
              ? t("letters.sealed_until", { date: l.unlockOn ? fmtDate(l.unlockOn) : "—" })
              : l.unlockOn
                ? t("letters.opened_on", { date: fmtDate(l.unlockOn) })
                : ""}
          </span>
        </div>
        {l.title ? <h3 className="ltitle">{l.title}</h3> : null}
        <p className="lbody">{l.body}</p>
        {l.mine ? (
          <div className="lactions">
            <button type="button" className="btn" onClick={() => startEdit(l)} disabled={pending}>{t("common.edit")}</button>
            <button type="button" className="btn" onClick={() => onDelete(l.id)} disabled={pending}>{t("common.delete")}</button>
          </div>
        ) : null}
      </article>
    );
  }

  const nothing = letters.length === 0;

  return (
    <section className="stack" style={{ maxWidth: 620 }}>
      <form className="card stack" onSubmit={onSubmit}>
        <p className="eyebrow" style={{ margin: 0 }}>{t("letters.write")}</p>
        <div className="field">
          <label htmlFor="ltitle">{t("ef.title_label")}</label>
          <input id="ltitle" type="text" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("letters.title_ph")} />
        </div>
        <div className="field">
          <label htmlFor="lbody">{t("letters.body_label")}</label>
          <textarea id="lbody" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("letters.body_ph", { name: childName })} />
        </div>
        <div className="field">
          <label htmlFor="lunlock">{t("letters.unlock_label")}</label>
          <input id="lunlock" type="date" value={unlockDate} min={today} onChange={(e) => setUnlockDate(e.target.value)} />
          <div className="chips" style={{ marginTop: 8 }}>
            <button type="button" className="chip" onClick={() => setUnlockDate(birth18)}>{t("letters.preset_18")}</button>
            <button type="button" className="chip" onClick={() => setUnlockDate(plusYears(today, 1))}>{t("letters.preset_1y")}</button>
            <button type="button" className="chip" onClick={() => setUnlockDate(plusYears(today, 5))}>{t("letters.preset_5y")}</button>
          </div>
        </div>
        {error ? <p className="err">{error}</p> : null}
        <div className="row">
          <button className="btn btn-primary" disabled={pending || !body.trim()}>
            {pending ? "…" : editingId ? t("common.save") : t("letters.seal")}
          </button>
          {editingId ? <button type="button" className="btn" onClick={resetForm} disabled={pending}>{t("common.cancel")}</button> : null}
        </div>
      </form>

      {teasers.size > 0 ? (
        <div className="stack" style={{ gap: 10 }}>
          <h2 className="shead">{t("letters.waiting")}</h2>
          {Array.from(teasers.entries()).map(([authorId, dates]) => {
            const a = who(authorId);
            const next = dates.slice().sort()[0];
            return (
              <div className="teaser" key={authorId}>
                <span className="tseal">🔒</span>
                <div>
                  <b>{dates.length === 1 ? t("letters.from_one", { name: a.name }) : t("letters.from_many", { name: a.name, n: dates.length })}</b>
                  {next ? <small className="muted" style={{ display: "block" }}>{t("letters.next_opens", { date: fmtDate(next) })}</small> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {yourSealed.length > 0 ? (
        <div className="stack" style={{ gap: 10 }}>
          <h2 className="shead">{t("letters.your_sealed")}</h2>
          {yourSealed.map((l) => <LetterCard key={l.id} l={l} />)}
        </div>
      ) : null}

      {opened.length > 0 ? (
        <div className="stack" style={{ gap: 10 }}>
          <h2 className="shead">{t("letters.opened")}</h2>
          {opened.map((l) => <LetterCard key={l.id} l={l} />)}
        </div>
      ) : null}

      {nothing ? <p className="muted">{t("letters.empty")}</p> : null}
    </section>
  );
}
