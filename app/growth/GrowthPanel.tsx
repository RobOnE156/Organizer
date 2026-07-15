"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMeasurement, deleteMeasurement, setChildSex } from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";
import { useT } from "@/app/LanguageProvider";
import type { Measurement, MetricKind } from "@/lib/data";
import { whoCurves, zScoreFor, zToPercentile, type WhoMetric, type WhoSex } from "@/lib/who-growth";

const METRICS: { key: MetricKind; unit: string }[] = [
  { key: "weight", unit: "kg" },
  { key: "height", unit: "cm" },
  { key: "head", unit: "cm" },
];
const METRIC_KEY = { weight: "metric.weight", height: "metric.height", head: "metric.head" } as const;
// weight/height map onto WHO datasets; head circumference has no curve yet.
const WHO_OF: Partial<Record<MetricKind, WhoMetric>> = { weight: "weight", height: "height" };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

// Age in (fractional) completed months between two ISO dates.
function ageMonths(birth: string, on: string): number {
  const b = new Date(birth + "T00:00:00").getTime();
  const o = new Date(on + "T00:00:00").getTime();
  return (o - b) / (1000 * 60 * 60 * 24 * 30.4375);
}

type Pt = { month: number; value: number };

// A chart of age (x) vs value (y). When WHO data + sex + birth date are known,
// the 3rd–97th percentile band is drawn behind the child's own measurements.
function Chart({
  points,
  who,
  ariaLabel,
}: {
  points: Pt[];
  who: { p: number; points: Pt[] }[] | null;
  ariaLabel: string;
}) {
  const W = 340;
  const H = 190;
  const padL = 34;
  const padR = 10;
  const padB = 22;
  const padT = 10;

  // x-domain: 0..(a bit past the newest point), capped at 60 months
  const maxAgePt = points.length ? Math.max(...points.map((p) => p.month)) : 0;
  const maxX = Math.min(60, Math.max(6, Math.ceil((maxAgePt + 2) / 3) * 3));

  // y-domain: fit both the WHO band (within x range) and the child's points
  const inRange = (arr: Pt[]) => arr.filter((p) => p.month <= maxX + 0.001);
  const ys: number[] = [];
  for (const p of points) ys.push(p.value);
  if (who) for (const c of who) for (const p of inRange(c.points)) ys.push(p.value);
  let minY = ys.length ? Math.min(...ys) : 0;
  let maxY = ys.length ? Math.max(...ys) : 1;
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const padY = (maxY - minY) * 0.08;
  minY -= padY;
  maxY += padY;

  const px = (m: number) => padL + (m / maxX) * (W - padL - padR);
  const py = (y: number) => H - padB - ((y - minY) / (maxY - minY)) * (H - padB - padT);
  const line = (arr: Pt[]) => inRange(arr).map((p) => px(p.month).toFixed(1) + "," + py(p.value).toFixed(1)).join(" ");

  // shaded band between P3 and P97
  let band = "";
  if (who) {
    const lo = who.find((c) => c.p === 3);
    const hi = who.find((c) => c.p === 97);
    if (lo && hi) {
      const up = inRange(lo.points).map((p) => px(p.month).toFixed(1) + "," + py(p.value).toFixed(1));
      const down = inRange(hi.points)
        .map((p) => px(p.month).toFixed(1) + "," + py(p.value).toFixed(1))
        .reverse();
      band = up.concat(down).join(" ");
    }
  }

  const xticks: number[] = [];
  const step = maxX <= 12 ? 3 : maxX <= 24 ? 6 : 12;
  for (let m = 0; m <= maxX; m += step) xticks.push(m);

  return (
    <svg viewBox={"0 0 " + W + " " + H} className="chart" role="img" aria-label={ariaLabel}>
      {/* y-axis labels (min/max) */}
      <text x="2" y={py(maxY) + 8} className="cax">{maxY.toFixed(0)}</text>
      <text x="2" y={py(minY) - 2} className="cax">{minY.toFixed(0)}</text>
      {/* x-axis ticks (months) */}
      {xticks.map((m) => (
        <text key={m} x={px(m)} y={H - 6} className="cax" textAnchor="middle">
          {m}
        </text>
      ))}
      {/* WHO percentile band + curves */}
      {band ? <polygon points={band} className="whoband" /> : null}
      {who
        ? who.map((c) => (
            <polyline key={c.p} points={line(c.points)} className={"whocurve" + (c.p === 50 ? " median" : "")} fill="none" />
          ))
        : null}
      {/* child's own measurements */}
      {points.length > 1 ? <polyline points={line(points)} className="cline" fill="none" /> : null}
      {points.map((p, i) => (
        <circle key={i} cx={px(p.month)} cy={py(p.value)} r="3.4" className="cdot" />
      ))}
    </svg>
  );
}

export default function GrowthPanel({
  childId,
  childName,
  birthDate,
  sex,
  measurements,
  userId,
}: {
  childId: string;
  childName: string;
  birthDate: string | null;
  sex: WhoSex | null;
  measurements: Measurement[];
  userId: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { t } = useT();
  const [metric, setMetric] = useState<MetricKind>("weight");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const active = METRICS.find((m) => m.key === metric) ?? METRICS[0]!;
  const forMetric = useMemo(() => measurements.filter((m) => m.metric === metric), [measurements, metric]);

  // Plot points as (age in months, value). Falls back to index if no birth date.
  const points: Pt[] = useMemo(
    () =>
      forMetric.map((m, i) => ({
        month: birthDate ? Math.max(0, ageMonths(birthDate, m.measured_on)) : i,
        value: Number(m.value_num),
      })),
    [forMetric, birthDate],
  );

  const whoMetric = WHO_OF[metric] ?? null;
  const showWho = Boolean(whoMetric && sex && birthDate);
  const who = useMemo(
    () => (showWho && whoMetric && sex ? whoCurves(whoMetric, sex) : null),
    [showWho, whoMetric, sex],
  );

  // Percentile of the most recent measurement (for a friendly one-liner).
  const latestPct = useMemo(() => {
    if (!showWho || !whoMetric || !sex || !birthDate || forMetric.length === 0) return null;
    const last = forMetric[forMetric.length - 1]!;
    const z = zScoreFor(whoMetric, sex, ageMonths(birthDate, last.measured_on), Number(last.value_num));
    return z === null ? null : zToPercentile(z);
  }, [showWho, whoMetric, sex, birthDate, forMetric]);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const v = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      setError(t("growth.invalid_value"));
      return;
    }
    start(async () => {
      const res = await addMeasurement({ childId, metric, value: v, unit: active.unit, measuredOn: date });
      if (res.error) {
        setError(res.error);
        return;
      }
      setValue("");
      router.refresh();
    });
  }

  async function onDelete(id: string) {
    const ok = await confirm({ title: t("growth.del_measure_title"), body: t("growth.del_measure_body"), danger: true });
    if (!ok) return;
    start(async () => {
      const res = await deleteMeasurement(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function pickSex(s: WhoSex) {
    start(async () => {
      const res = await setChildSex(childId, s);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  const canHaveCurve = Boolean(whoMetric);

  return (
    <section className="stack" style={{ maxWidth: 560 }}>
      <div className="tabs">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={"tab" + (m.key === metric ? " active" : "")}
            onClick={() => setMetric(m.key)}
          >
            {t(METRIC_KEY[m.key])}
          </button>
        ))}
      </div>

      {forMetric.length === 0 ? (
        <p className="muted" style={{ fontSize: ".85rem", margin: "6px 0 0" }}>{t("growth.no_measure")}</p>
      ) : (
        <>
          <Chart points={points} who={who} ariaLabel={t("growth.chart_aria")} />
          {who ? (
            <div className="wholegend">
              <span className="wholeg-band" /> {t("growth.who_legend")} <b>3 · 15 · 50 · 85 · 97</b>
              {latestPct !== null ? <span className="wholeg-pct">{t("growth.at_percentile", { p: String(latestPct) })}</span> : null}
            </div>
          ) : null}
        </>
      )}

      {/* Prompt to enable WHO curves for weight/height when we lack sex/birth. */}
      {canHaveCurve && !showWho && forMetric.length > 0 ? (
        !birthDate ? (
          <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>{t("growth.no_birth", { name: childName })}</p>
        ) : !sex ? (
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: ".82rem" }}>{t("growth.pick_sex")}</span>
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => pickSex("male")}>
              {t("child.sex_boy")}
            </button>
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => pickSex("female")}>
              {t("child.sex_girl")}
            </button>
          </div>
        ) : null
      ) : null}

      <form className="row" onSubmit={onAdd} style={{ alignItems: "flex-end", gap: 10 }}>
        <div className="field" style={{ flex: "1 1 110px" }}>
          <label htmlFor="mval">{t(METRIC_KEY[active.key])} ({active.unit})</label>
          <input
            id="mval"
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={active.key === "weight" ? t("growth.ph_weight") : t("growth.ph_other")}
          />
        </div>
        <div className="field" style={{ flex: "1 1 130px" }}>
          <label htmlFor="mdate">{t("common.date")}</label>
          <input id="mdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={pending}>{pending ? "…" : t("common.add")}</button>
      </form>
      {error ? <p className="err">{error}</p> : null}

      {forMetric.length > 0 ? (
        <ul className="mlist">
          {forMetric
            .slice()
            .reverse()
            .map((m) => (
              <li className="mrow" key={m.id}>
                <span>
                  <b>
                    {Number(m.value_num)} {m.unit}
                  </b>
                  <small className="muted"> · {fmtDate(m.measured_on)}</small>
                </span>
                {m.author_id === userId ? (
                  <button type="button" className="mx" aria-label={t("common.delete")} onClick={() => onDelete(m.id)} disabled={pending}>
                    ✕
                  </button>
                ) : null}
              </li>
            ))}
        </ul>
      ) : null}
      <p className="muted" style={{ fontSize: ".78rem", margin: 0 }}>
        {metric === "head" ? t("growth.head_no_curve") : t("growth.who_hint", { name: childName })}
      </p>
    </section>
  );
}
