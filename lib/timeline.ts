// Pure formatting helpers for the timeline (locale-aware, no side effects).

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function monthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(d);
}

// Short month name (for the timeline's left date rail, where the year is shown
// separately and the column is narrow — "Jan.", "Dez.", …).
export function monthName(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("de-DE", { month: "short" }).format(d);
}

export function fmtDate(iso: string): string {
  if (!iso) return "";
  // Accept both date-only ("2026-07-08") and full timestamps
  // ("2026-07-08T09:14:23+00:00"); only date-only needs a time appended.
  const d = new Date(iso.length > 10 ? iso : iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

// Full timestamp -> date + time (for the activity log).
export function fmtDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Age of the child at a given date, as a short human label (German).
export function ageLabel(birthISO: string | null, atISO: string): string {
  if (!birthISO) return "";
  const b = new Date(birthISO + "T00:00:00");
  const a = new Date(atISO + "T00:00:00");
  if (Number.isNaN(b.getTime()) || Number.isNaN(a.getTime())) return "";
  const days = Math.floor((a.getTime() - b.getTime()) / 86400000);
  if (days < 0) return "vor der Geburt";
  if (days < 14) return `${days} Tage`;
  if (days < 70) return `${Math.floor(days / 7)} Wochen`;
  let months = (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
  if (a.getDate() < b.getDate()) months -= 1;
  months = Math.max(0, months);
  if (months < 24) return `${months} Monate`;
  return `${Math.floor(months / 12)} Jahre`;
}

export function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

// Day + month, no year (for "on this day" cards): "16. Juli".
export function dayMonth(iso: string): string {
  const d = new Date((iso.length > 10 ? iso : iso + "T00:00:00"));
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long" }).format(d);
}

function dayOfYear(iso: string): number {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  const start = new Date(d.getFullYear() + "-01-01T00:00:00");
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

// Circular distance (in days) between two day-of-year values, so late Dec and
// early Jan count as close.
function doyDistance(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 365 - raw);
}

// Memories to resurface as "On this day": entries from PREVIOUS years matched to
// today — the exact calendar day if any exist, else within a few days, else the
// same calendar month. Returns the tightest non-empty scope so the section
// rarely sits empty once there's a year or two of history.
export function resurfacedMemories<T extends { event_date: string }>(
  entries: T[],
  todayIso: string,
): { scope: "day" | "week" | "month"; items: T[] } {
  const curYear = todayIso.slice(0, 4);
  const todayMd = todayIso.slice(5, 10);
  const todayMonth = todayIso.slice(5, 7);
  const todayDoy = dayOfYear(todayIso);
  const past = entries.filter((e) => e.event_date.slice(0, 4) < curYear);

  const exact = past.filter((e) => e.event_date.slice(5, 10) === todayMd);
  if (exact.length) return { scope: "day", items: exact };

  const near = past
    .map((e) => ({ e, d: doyDistance(dayOfYear(e.event_date), todayDoy) }))
    .filter((x) => x.d <= 3)
    .sort((a, b) => a.d - b.d || (a.e.event_date < b.e.event_date ? 1 : -1))
    .map((x) => x.e);
  if (near.length) return { scope: "week", items: near };

  const month = past
    .filter((e) => e.event_date.slice(5, 7) === todayMonth)
    .sort((a, b) => (a.event_date < b.event_date ? 1 : -1));
  return { scope: "month", items: month };
}
