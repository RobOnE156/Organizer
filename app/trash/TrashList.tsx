"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreEntry } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";
import { fmtDate } from "@/lib/timeline";
import type { TrashedEntry } from "@/lib/data";

export default function TrashList({ entries }: { entries: TrashedEntry[] }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onRestore(id: string) {
    setError(null);
    setBusyId(id);
    start(async () => {
      const res = await restoreEntry(id);
      setBusyId(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (entries.length === 0) {
    return <p className="muted">{t("trash.empty")}</p>;
  }

  return (
    <div className="stack" style={{ maxWidth: 620 }}>
      {error ? <p className="err">{error}</p> : null}
      {entries.map((e) => {
        const label = e.title || (e.body ? e.body.slice(0, 90) : t("home.memory"));
        return (
          <div className="trashcard" key={e.id}>
            <div style={{ minWidth: 0 }}>
              <b className="trashtitle">{label}</b>
              <small className="muted" style={{ display: "block" }}>
                {t("trash.from", { date: fmtDate(e.event_date) })} · {t("trash.deleted_on", { date: fmtDate(e.deleted_at) })}
              </small>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onRestore(e.id)}
              disabled={pending && busyId === e.id}
            >
              {pending && busyId === e.id ? "…" : t("trash.restore")}
            </button>
          </div>
        );
      })}
    </div>
  );
}
