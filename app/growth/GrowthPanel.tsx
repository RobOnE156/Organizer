"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMeasurement, deleteMeasurement } from "@/app/content-actions";
import type { Measurement, MetricKind } from "@/lib/data";

const METRICS: { key: MetricKind; label: string; unit: string }[] = [
  { key: "weight", label: "Gewicht", unit: "kg" },
  { key: "height", label: "Größe", unit: "cm" },
  { key: "head", label: "Kopfumfang", unit: "cm" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

function Chart({ points }: { points: { y: number }[] }) {
  if (points.length === 0) {
    return <p className="muted" style={{ fontSize: ".85rem", margin: "6px 0 0" }}>Noch keine Messungen — trage unten die erste ein.</p>;
  }
  const W = 320;
  const H = 150;
  const padL = 30;
  const padB = 16;
  const padT = 10;
  const ys = points.map((p) => p.y);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const spanY = maxY - minY;
  const spanX = points.length > 1 ? points.length - 1 : 1;
  const px = (i: number) => padL + (i / spanX) * (W - padL - 8);
  const py = (y: number) => H - padB - ((y - minY) / spanY) * (H - padB - padT);
  const poly = points.map((p, i) => px(i).toFixed(1) + "," + py(p.y).toFixed(1)).join(" ");
  return (
    <svg viewBox={"0 0 " + W + " " + H} className="chart" role="img" aria-label="Verlaufskurve">
      <text x="2" y={py(maxY) + 4} className="cax">{maxY.toFixed(1)}</text>
      <text x="2" y={py(minY) + 4} className="cax">{minY.toFixed(1)}</text>
      {points.length > 1 ? <polyline points={poly} className="cline" fill="none" /> : null}
      {points.map((p, i) => (
        <circle key={i} cx={px(i)} cy={py(p.y)} r="3.2" className="cdot" />
      ))}
    </svg>
  );
}

export default function GrowthPanel({
  childId,
  childName,
  measurements,
  userId,
}: {
  childId: string;
  childName: string;
  measurements: Measurement[];
  userId: string;
}) {
  const router = useRouter();
  const [metric, setMetric] = useState<MetricKind>("weight");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const active = METRICS.find((m) => m.key === metric) ?? METRICS[0]!;
  const forMetric = useMemo(
    () => measurements.filter((m) => m.metric === metric),
    [measurements, metric],
  );
  const points = forMetric.map((m) => ({ y: Number(m.value_num) }));

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const v = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      setError("Bitte einen gültigen Wert eingeben.");
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

  function onDelete(id: string) {
    if (!window.confirm("Diese Messung löschen?")) return;
    start(async () => {
      const res = await deleteMeasurement(id);
      if (res.error) window.alert(res.error);
      else router.refresh();
    });
  }

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
            {m.label}
          </button>
        ))}
      </div>

      <Chart points={points} />

      <form className="row" onSubmit={onAdd} style={{ alignItems: "flex-end", gap: 10 }}>
        <div className="field" style={{ flex: "1 1 110px" }}>
          <label htmlFor="mval">{active.label} ({active.unit})</label>
          <input
            id="mval"
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={active.key === "weight" ? "z. B. 7,4" : "z. B. 68"}
          />
        </div>
        <div className="field" style={{ flex: "1 1 130px" }}>
          <label htmlFor="mdate">Datum</label>
          <input id="mdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={pending}>{pending ? "…" : "Hinzufügen"}</button>
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
                  <button type="button" className="mx" aria-label="Löschen" onClick={() => onDelete(m.id)} disabled={pending}>
                    ✕
                  </button>
                ) : null}
              </li>
            ))}
        </ul>
      ) : null}
      <p className="muted" style={{ fontSize: ".78rem", margin: 0 }}>
        Nur {childName}s eigene Werte — WHO-Perzentilkurven kommen später.
      </p>
    </section>
  );
}
