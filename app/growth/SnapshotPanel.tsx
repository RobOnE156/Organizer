"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSnapshot, updateSnapshot, deleteSnapshot } from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";
import { ageLabel, fmtDate } from "@/lib/timeline";
import type { Snapshot } from "@/lib/data";

function prompts(name: string) {
  return [
    { key: "food", label: "Lieblingsessen", ph: "z. B. Nudeln mit Tomatensoße" },
    { key: "toy", label: "Lieblingsspielzeug", ph: "z. B. der rote Bagger" },
    { key: "word", label: "Lieblingswort / Lieblingsspruch", ph: "z. B. „Nochmal!“" },
    { key: "saying", label: "Lustigster Spruch (Kindermund)", ph: `Was hat ${name} Lustiges gesagt?` },
    { key: "obsession", label: "Aktuelle Obsession", ph: `Wofür interessiert sich ${name} gerade total?` },
    { key: "loves", label: "Liebt gerade", ph: "Menschen, Tiere, Orte, Aktivitäten …" },
    { key: "laugh", label: `Was bringt ${name} zum Lachen?`, ph: "" },
  ];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SnapshotPanel({
  childId,
  childName,
  birthDate,
  snapshots,
  userId,
}: {
  childId: string;
  childName: string;
  birthDate: string | null;
  snapshots: Snapshot[];
  userId: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const PROMPTS = prompts(childName);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [takenOn, setTakenOn] = useState(todayISO());
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setEditingId(null);
    setTakenOn(todayISO());
    setValues({});
    setError(null);
  }

  function startEdit(s: Snapshot) {
    setEditingId(s.id);
    setTakenOn(s.taken_on);
    setValues({ ...s.answers });
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const answers = values;
    const filled = Object.values(answers).some((v) => (v ?? "").trim());
    if (!filled) {
      setError("Bitte mindestens ein Feld ausfüllen.");
      return;
    }
    start(async () => {
      const res = editingId
        ? await updateSnapshot(editingId, { takenOn, answers })
        : await addSnapshot({ childId, takenOn, answers });
      if (res.error) {
        setError(res.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  function onDelete(id: string) {
    start(async () => {
      const ok = await confirm({ title: "Schnappschuss löschen?", body: "Diese Momentaufnahme wird entfernt.", danger: true });
      if (!ok) return;
      const res = await deleteSnapshot(id);
      if (res.error) setError(res.error);
      else {
        if (editingId === id) reset();
        router.refresh();
      }
    });
  }

  return (
    <section>
      <form className="card stack" onSubmit={onSubmit} style={{ maxWidth: 560 }}>
        <div className="spread">
          <p className="eyebrow" style={{ margin: 0 }}>
            {editingId ? "Schnappschuss bearbeiten" : `Wer ist ${childName} gerade?`}
          </p>
          {editingId ? (
            <button type="button" className="btn" onClick={reset} disabled={pending}>Neu</button>
          ) : null}
        </div>
        <p className="sub" style={{ margin: 0 }}>
          Ein kleiner Steckbrief für diesen Moment — fülle aus, was gerade passt. Später wird daraus eine
          schöne Sammlung.
        </p>

        <div className="field">
          <label htmlFor="snap_date">Datum</label>
          <input id="snap_date" type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
        </div>

        {PROMPTS.map((p) => (
          <div className="field" key={p.key}>
            <label htmlFor={"snap_" + p.key}>{p.label}</label>
            <textarea
              id={"snap_" + p.key}
              rows={2}
              placeholder={p.ph}
              value={values[p.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
            />
          </div>
        ))}

        {error ? <p className="err">{error}</p> : null}
        <div className="row">
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "…" : editingId ? "Speichern" : "Schnappschuss sichern"}
          </button>
        </div>
      </form>

      {snapshots.length > 0 ? (
        <div style={{ marginTop: 16, maxWidth: 560 }}>
          {snapshots.map((s) => {
            const age = ageLabel(birthDate, s.taken_on);
            return (
              <article className="snapcard" key={s.id}>
                <div className="snaphead">
                  <b>{fmtDate(s.taken_on)}</b>
                  {age ? <span>· {childName} mit {age}</span> : null}
                </div>
                <dl className="snapdl">
                  {PROMPTS.filter((p) => (s.answers[p.key] ?? "").trim()).map((p) => (
                    <div key={p.key}>
                      <dt className="k">{p.label}</dt>
                      <dd className="v">{s.answers[p.key]}</dd>
                    </div>
                  ))}
                </dl>
                {s.author_id === userId ? (
                  <div className="snapactions">
                    <button type="button" className="btn" onClick={() => startEdit(s)} disabled={pending}>Bearbeiten</button>
                    <button type="button" className="btn" onClick={() => onDelete(s.id)} disabled={pending}>Löschen</button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
