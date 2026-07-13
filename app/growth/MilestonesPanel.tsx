"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMilestone, deleteMilestone } from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";
import { useT } from "@/app/LanguageProvider";
import type { Milestone } from "@/lib/data";

const PRESET_KEYS = [
  "ms.smile",
  "ms.slept",
  "ms.tooth",
  "ms.roll",
  "ms.sit",
  "ms.crawl",
  "ms.word",
  "ms.steps",
] as const;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MilestonesPanel({
  childId,
  milestones,
  userId,
}: {
  childId: string;
  milestones: Milestone[];
  userId: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { t } = useT();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const fmtDate = (d: string | null): string =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }) : t("ms.no_date");

  const presets = PRESET_KEYS.map((k) => t(k));
  const used = new Set(milestones.map((m) => m.title));
  const remainingPresets = presets.filter((p) => !used.has(p));

  function add(value: string, key: string) {
    setError(null);
    if (!value.trim()) {
      setError(t("ms.need_title"));
      return;
    }
    start(async () => {
      const res = await addMilestone({ childId, title: value, achievedOn: date, key });
      if (res.error) {
        setError(res.error);
        return;
      }
      setTitle("");
      router.refresh();
    });
  }

  async function onDelete(id: string) {
    const ok = await confirm({ title: t("ms.del_title"), body: t("ms.del_body"), danger: true });
    if (!ok) return;
    start(async () => {
      const res = await deleteMilestone(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <section className="stack" style={{ maxWidth: 560 }}>
      {remainingPresets.length > 0 ? (
        <div className="chips">
          {remainingPresets.map((p) => (
            <button key={p} type="button" className="chip" onClick={() => setTitle(p)} disabled={pending}>
              + {p}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="row"
        style={{ alignItems: "flex-end", gap: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          add(title, presets.includes(title) ? "preset" : "custom");
        }}
      >
        <div className="field" style={{ flex: "1 1 180px" }}>
          <label htmlFor="mtitle">{t("ms.label")}</label>
          <input id="mtitle" type="text" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("ms.ph")} />
        </div>
        <div className="field" style={{ flex: "1 1 130px" }}>
          <label htmlFor="mdate2">{t("common.date")}</label>
          <input id="mdate2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={pending}>{pending ? "…" : t("ms.save")}</button>
      </form>
      {error ? <p className="err">{error}</p> : null}

      {milestones.length > 0 ? (
        <ul className="mlist">
          {milestones
            .slice()
            .reverse()
            .map((m) => (
              <li className="mrow" key={m.id}>
                <span>
                  <b>{m.title}</b>
                  <small className="muted"> · {fmtDate(m.achieved_on)}</small>
                </span>
                {m.author_id === userId ? (
                  <button type="button" className="mx" aria-label={t("common.delete")} onClick={() => onDelete(m.id)} disabled={pending}>
                    ✕
                  </button>
                ) : null}
              </li>
            ))}
        </ul>
      ) : (
        <p className="muted" style={{ fontSize: ".85rem", margin: 0 }}>{t("ms.empty")}</p>
      )}
    </section>
  );
}
