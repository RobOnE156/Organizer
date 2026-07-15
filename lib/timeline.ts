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
