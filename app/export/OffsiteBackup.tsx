"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runBackupNow } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";

type LastRun = {
  status: "ok" | "partial" | "error";
  files_total: number;
  bytes_total: number;
  finished_at: string | null;
} | null;

function fmtBytes(n: number): string {
  if (n <= 0) return "0 MB";
  const gb = n / 1_000_000_000;
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1).replace(".", ",")} GB`;
  return `${Math.max(1, Math.round(n / 1_000_000))} MB`;
}

export default function OffsiteBackup({ configured, lastRun }: { configured: boolean; lastRun: LastRun }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const daysSince = lastRun?.finished_at
    ? Math.floor((Date.now() - new Date(lastRun.finished_at).getTime()) / 86_400_000)
    : null;
  // health: green ≤3 days, amber ≤10, red beyond / never / errored
  const health =
    !configured || lastRun?.status === "error" || daysSince === null
      ? "red"
      : daysSince <= 3
        ? "green"
        : daysSince <= 10
          ? "amber"
          : "red";

  const lastLabel =
    daysSince === null
      ? t("offsite.never")
      : daysSince === 0
        ? t("backup.today")
        : daysSince === 1
          ? t("backup.yesterday")
          : t("backup.days_ago", { n: String(daysSince) });

  function runNow() {
    setError(null);
    setMsg(null);
    start(async () => {
      const res = await runBackupNow();
      if (res.error) {
        setError(res.error);
        return;
      }
      const files = res.filesNew ?? 0;
      setMsg(
        res.status === "partial"
          ? t("offsite.ran_partial", { n: String(files) })
          : t("offsite.ran_ok", { n: String(files) }),
      );
      router.refresh();
    });
  }

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <span className={"bkdot " + health} aria-hidden />
        <div style={{ flex: 1 }}>
          <b>{t("offsite.head")}</b>
          <div className="muted" style={{ fontSize: ".85rem" }}>
            {!configured
              ? t("offsite.not_configured")
              : lastRun
                ? `${lastLabel} · ${lastRun.files_total} ${t("offsite.files")} · ${fmtBytes(lastRun.bytes_total)}${
                    lastRun.status === "partial" ? " · " + t("offsite.catching_up") : ""
                  }`
                : t("offsite.never")}
          </div>
        </div>
        {configured ? (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={runNow}>
            {pending ? "…" : t("offsite.run_now")}
          </button>
        ) : null}
      </div>
      {msg ? <p className="muted" style={{ margin: 0, fontSize: ".85rem" }}>{msg}</p> : null}
      {error ? <p className="err" style={{ margin: 0 }}>{error}</p> : null}
      <p className="muted" style={{ margin: 0, fontSize: ".78rem" }}>{t("offsite.hint")}</p>
    </div>
  );
}
