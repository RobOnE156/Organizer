"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMilestone, deleteMilestone } from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";
import { useT } from "@/app/LanguageProvider";
import { fmtDate } from "@/lib/timeline";
import { FIRSTS, FIRST_KEYS } from "@/lib/firsts";
import type { Milestone } from "@/lib/data";

export type PickEntry = { id: string; label: string; date: string };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FirstsCollector({
  childId,
  childName,
  milestones,
  entries,
  userId,
}: {
  childId: string;
  childName: string;
  milestones: Milestone[];
  entries: PickEntry[];
  userId: string;
}) {
  const { t } = useT();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // which canonical card is being recorded, + its form state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [entryId, setEntryId] = useState("");

  // custom-first form
  const [customTitle, setCustomTitle] = useState("");
  const [customDate, setCustomDate] = useState(todayISO());
  const [customEntryId, setCustomEntryId] = useState("");

  const byKey = useMemo(() => {
    const m = new Map<string, Milestone>();
    for (const ms of milestones) if (!m.has(ms.key)) m.set(ms.key, ms);
    return m;
  }, [milestones]);
  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const customs = useMemo(() => milestones.filter((m) => !FIRST_KEYS.has(m.key)), [milestones]);

  const collected = FIRSTS.filter((f) => byKey.has(f.key)).length;
  const pct = Math.round((collected / FIRSTS.length) * 100);

  function openRecord(key: string) {
    setEditingKey(key);
    setDate(todayISO());
    setEntryId("");
    setError(null);
  }

  function record(key: string, title: string) {
    setError(null);
    start(async () => {
      const res = await addMilestone({ childId, title, key, achievedOn: date, entryId: entryId || null });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditingKey(null);
      router.refresh();
    });
  }

  function addCustom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!customTitle.trim()) {
      setError(t("firsts.need_title"));
      return;
    }
    start(async () => {
      const res = await addMilestone({
        childId,
        title: customTitle,
        achievedOn: customDate,
        entryId: customEntryId || null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setCustomTitle("");
      setCustomEntryId("");
      router.refresh();
    });
  }

  function onDelete(id: string) {
    start(async () => {
      const ok = await confirm({ title: t("firsts.del_title"), body: t("firsts.del_body"), danger: true });
      if (!ok) return;
      const res = await deleteMilestone(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function MemorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <select className="selectinput" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t("firsts.no_memory")}</option>
        {entries.map((e) => (
          <option key={e.id} value={e.id}>
            {e.label} · {fmtDate(e.date)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <section className="stack" style={{ maxWidth: 640 }}>
      <div className="firstsprog">
        <div className="firstsbar"><span style={{ width: `${pct}%` }} /></div>
        <small className="muted">{t("firsts.progress", { n: collected, total: FIRSTS.length })}</small>
      </div>

      {error ? <p className="err">{error}</p> : null}

      <div className="firstgrid">
        {FIRSTS.map((f) => {
          const ms = byKey.get(f.key);
          const mem = ms?.entry_id ? entryById.get(ms.entry_id) : null;
          const editing = editingKey === f.key;
          return (
            <div className={"firstcard" + (ms ? " done" : "") + (editing ? " editing" : "")} key={f.key}>
              <div className="firsthead">
                <span className="firstemoji" aria-hidden>{f.emoji}</span>
                <span className="firstlabel"><b>{t(f.label)}</b></span>
                {ms && ms.author_id === userId ? (
                  <button type="button" className="mx" aria-label={t("common.delete")} onClick={() => onDelete(ms.id)} disabled={pending}>✕</button>
                ) : null}
              </div>

              {ms ? (
                <div className="firstmeta">
                  <small className="muted">{ms.achieved_on ? fmtDate(ms.achieved_on) : t("firsts.no_date")}</small>
                  {mem ? (
                    <a className="firstmem" href={`/#entry-${ms.entry_id}`}>🔗 {mem.label}</a>
                  ) : null}
                </div>
              ) : editing ? (
                <div className="firstform">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  <MemorySelect value={entryId} onChange={setEntryId} />
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => record(f.key, t(f.label))} disabled={pending}>
                      {pending ? "…" : t("firsts.save")}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => setEditingKey(null)} disabled={pending}>
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="firstadd" onClick={() => openRecord(f.key)} disabled={pending}>
                  + {t("firsts.record")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* custom firsts */}
      <div className="stack" style={{ gap: 10 }}>
        <h2 className="shead">{t("firsts.custom_head")}</h2>
        {customs.length > 0 ? (
          <ul className="mlist">
            {customs.map((m) => {
              const mem = m.entry_id ? entryById.get(m.entry_id) : null;
              return (
                <li className="mrow" key={m.id}>
                  <span style={{ minWidth: 0 }}>
                    <b>{m.title}</b>
                    <small className="muted"> · {m.achieved_on ? fmtDate(m.achieved_on) : t("firsts.no_date")}</small>
                    {mem ? <a className="firstmem" style={{ display: "block" }} href={`/#entry-${m.entry_id}`}>🔗 {mem.label}</a> : null}
                  </span>
                  {m.author_id === userId ? (
                    <button type="button" className="mx" aria-label={t("common.delete")} onClick={() => onDelete(m.id)} disabled={pending}>✕</button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        <form className="card stack" onSubmit={addCustom} style={{ gap: 10 }}>
          <p className="muted" style={{ margin: 0, fontSize: ".85rem" }}>{t("firsts.custom_hint", { name: childName })}</p>
          <div className="field">
            <label htmlFor="ctitle">{t("firsts.custom_label")}</label>
            <input id="ctitle" type="text" maxLength={80} value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={t("firsts.custom_ph")} />
          </div>
          <div className="row" style={{ gap: 10, alignItems: "flex-end" }}>
            <div className="field" style={{ flex: "1 1 130px" }}>
              <label htmlFor="cdate">{t("common.date")}</label>
              <input id="cdate" type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </div>
            <div className="field" style={{ flex: "2 1 180px" }}>
              <label htmlFor="cmem">{t("firsts.memory_label")}</label>
              <MemorySelect value={customEntryId} onChange={setCustomEntryId} />
            </div>
          </div>
          <div className="row">
            <button className="btn btn-primary" disabled={pending || !customTitle.trim()}>{pending ? "…" : t("firsts.custom_add")}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
