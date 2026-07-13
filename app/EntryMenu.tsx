"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEntry } from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";

export default function EntryMenu({ entryId }: { entryId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onDelete() {
    const ok = await confirm({
      title: "Eintrag löschen?",
      body: "Der Eintrag wird aus dem Tagebuch entfernt.",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteEntry(entryId);
      if (res.error) {
        window.alert(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="emenu">
      <button
        className="emenu-btn"
        type="button"
        aria-label="Optionen"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
      >
        ⋯
      </button>
      {open ? (
        <div className="emenu-pop">
          <a className="emenu-item" href={`/entry/${entryId}/edit`}>Bearbeiten</a>
          <button className="emenu-item danger" type="button" onClick={onDelete} disabled={pending}>
            {pending ? "Löschen…" : "Löschen"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
