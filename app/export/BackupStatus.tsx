"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordBackup, updateBackupInterval } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";

const INTERVALS = [30, 90, 180, 0] as const;

export default function BackupStatus({
  lastBackupAt,
  intervalDays,
}: {
  lastBackupAt: string | null;
  intervalDays: number;
}) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const daysSince = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86_400_000)
    : null;

  // health: green within the interval, amber up to 2×, red beyond / never
  const ref = intervalDays > 0 ? intervalDays : 30;
  const health = daysSince === null ? "red" : daysSince <= ref ? "green" : daysSince <= ref * 2 ? "amber" : "red";

  const lastLabel =
    daysSince === null
      ? t("backup.never")
      : daysSince === 0
        ? t("backup.today")
        : daysSince === 1
          ? t("backup.yesterday")
          : t("backup.days_ago", { n: daysSince });

  function setInterval(days: number) {
    if (days === intervalDays) return;
    setError(null);
    start(async () => {
      const res = await updateBackupInterval(days);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function markExternal() {
    setError(null);
    start(async () => {
      const res = await recordBackup("external");
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="card stack" style={{ maxWidth: 520 }}>
      <div className="bkstat">
        <span className={"bkdot " + health} aria-hidden />
        <div>
          <b>{t("backup.last")}</b>
          <small className="muted" style={{ display: "block" }}>{lastLabel}</small>
        </div>
        <button type="button" className="btn btn-sm" onClick={markExternal} disabled={pending}>
          {t("backup.mark_external")}
        </button>
      </div>

      <div className="field">
        <label>{t("backup.remind_label")}</label>
        <div className="langopts">
          {INTERVALS.map((d) => (
            <button
              key={d}
              type="button"
              className={"langbtn" + (d === intervalDays ? " on" : "")}
              onClick={() => setInterval(d)}
              disabled={pending}
              aria-pressed={d === intervalDays}
            >
              {d === 0 ? t("backup.off") : t("backup.every_days", { n: d })}
            </button>
          ))}
        </div>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: ".78rem" }}>{t("backup.remind_hint")}</p>
      </div>

      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}
