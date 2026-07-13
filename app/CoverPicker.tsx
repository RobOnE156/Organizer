"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/app/ConfirmProvider";

type Cover = { key: string; url: string };

// Modal shown when changing the cover: a gallery of the child's previously
// used covers (read straight from storage, so no history table needed) plus
// an option to upload a new photo. Picking an old one re-points the child's
// cover_key at it; the ✕ permanently deletes an old cover file. The current
// cover cannot be deleted (that would leave the hero pointing at nothing).
export default function CoverPicker({
  childId,
  householdId,
  currentKey,
  onPickNew,
  onSelect,
  onClose,
}: {
  childId: string;
  householdId: string;
  currentKey: string | null;
  onPickNew: () => void;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const confirm = useConfirm();
  const [covers, setCovers] = useState<Cover[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: lErr } = await supabase.storage
      .from("media")
      .list(`${householdId}/cover`, { limit: 100, sortBy: { column: "name", order: "desc" } });
    if (lErr) {
      setError(lErr.message);
      return;
    }
    const keys = (data ?? [])
      .map((f) => f.name)
      .filter((n) => n.startsWith(`${childId}-`))
      .slice(0, 24)
      .map((n) => `${householdId}/cover/${n}`);
    if (keys.length === 0) {
      setCovers([]);
      return;
    }
    const { data: signed } = await supabase.storage.from("media").createSignedUrls(keys, 900);
    const list: Cover[] = [];
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) list.push({ key: s.path, url: s.signedUrl });
    }
    setCovers(list);
  }, [childId, householdId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(key: string, e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await confirm({
      title: "Titelbild löschen?",
      body: "Dieses Titelbild wird dauerhaft aus dem Speicher entfernt.",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    setDeleting(key);
    const supabase = createClient();
    const { data, error: dErr } = await supabase.storage.from("media").remove([key]);
    setDeleting(null);
    if (dErr) {
      setError(dErr.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("Löschen nicht möglich — evtl. kann nur der Elternteil löschen, der dieses Bild hochgeladen hat.");
      return;
    }
    setCovers((prev) => (prev ? prev.filter((c) => c.key !== key) : prev));
  }

  return createPortal(
    <div className="cropwrap" role="dialog" aria-modal="true" aria-label="Titelbild wählen" onClick={onClose}>
      <div className="cropcard" onClick={(e) => e.stopPropagation()}>
        <div className="spread" style={{ marginBottom: 12 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Titelbild wählen</p>
          <button type="button" className="btn" onClick={onClose}>Schließen</button>
        </div>
        <div className="gal">
          <button type="button" className="galnew" onClick={onPickNew}>
            ＋<br />
            Neues Foto
          </button>
          {covers === null ? (
            <p className="muted" style={{ gridColumn: "1 / -1", fontSize: ".85rem" }}>Lädt …</p>
          ) : covers.length === 0 ? (
            <p className="muted" style={{ gridColumn: "1 / -1", fontSize: ".85rem" }}>Noch keine früheren Titelbilder.</p>
          ) : (
            covers.map((c) => {
              const isCurrent = c.key === currentKey;
              return (
                <div key={c.key} className={"galtile" + (isCurrent ? " current" : "")}>
                  <button type="button" className="galpick" onClick={() => onSelect(c.key)} aria-label="Dieses Titelbild verwenden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt="" />
                  </button>
                  {isCurrent ? (
                    <span className="galbadge">Aktuell</span>
                  ) : (
                    <button
                      type="button"
                      className="galdel"
                      onClick={(e) => onDelete(c.key, e)}
                      disabled={deleting === c.key}
                      aria-label="Titelbild löschen"
                      title="Dauerhaft löschen"
                    >
                      {deleting === c.key ? "…" : "✕"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
        {error ? <p className="err" style={{ marginTop: 10 }}>{error}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
