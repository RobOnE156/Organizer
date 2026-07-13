"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEntry } from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";
import { useT } from "@/app/LanguageProvider";

export default function EntryMenu({ entryId }: { entryId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onDelete() {
    const ok = await confirm({
      title: t("em.del_title"),
      body: t("em.del_body"),
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
        aria-label={t("em.options")}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
      >
        ⋯
      </button>
      {open ? (
        <div className="emenu-pop">
          <a className="emenu-item" href={`/entry/${entryId}/edit`}>{t("common.edit")}</a>
          <button className="emenu-item danger" type="button" onClick={onDelete} disabled={pending}>
            {pending ? t("em.deleting") : t("common.delete")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
