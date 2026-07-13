"use client";

import { useState } from "react";
import { setHighlight } from "@/app/content-actions";

export default function HighlightStar({
  entryId,
  householdId,
  initial,
}: {
  entryId: string;
  householdId: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !on;
    setBusy(true);
    setOn(next); // optimistic
    const res = await setHighlight(entryId, householdId, next);
    setBusy(false);
    if (res.error) setOn(!next); // revert
  }

  return (
    <button
      type="button"
      className={"star" + (on ? " on" : "")}
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? "Aus den Höhepunkten entfernen" : "Zu den Höhepunkten hinzufügen"}
      title={on ? "Höhepunkt" : "Zu Höhepunkten"}
    >
      {on ? "★" : "☆"}
    </button>
  );
}
