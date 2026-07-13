"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type Cover = { key: string; url: string };

// Modal shown when changing the cover: a gallery of the child's previously
// used covers (read straight from storage, so no history table needed) plus
// an option to upload a new photo. Picking an old one just re-points the
// child's cover_key at it — no re-upload.
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
  const [covers, setCovers] = useState<Cover[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: lErr } = await supabase.storage
        .from("media")
        .list(`${householdId}/cover`, { limit: 100, sortBy: { column: "name", order: "desc" } });
      if (lErr) {
        if (!cancelled) setError(lErr.message);
        return;
      }
      const keys = (data ?? [])
        .map((f) => f.name)
        .filter((n) => n.startsWith(`${childId}-`))
        .slice(0, 24)
        .map((n) => `${householdId}/cover/${n}`);
      if (keys.length === 0) {
        if (!cancelled) setCovers([]);
        return;
      }
      const { data: signed } = await supabase.storage.from("media").createSignedUrls(keys, 900);
      const list: Cover[] = [];
      for (const s of signed ?? []) {
        if (s.signedUrl && s.path) list.push({ key: s.path, url: s.signedUrl });
      }
      if (!cancelled) setCovers(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [childId, householdId]);

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
            covers.map((c) => (
              <button
                key={c.key}
                type="button"
                className={"galtile" + (c.key === currentKey ? " current" : "")}
                onClick={() => onSelect(c.key)}
                aria-label="Dieses Titelbild verwenden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.url} alt="" />
                {c.key === currentKey ? <span className="galbadge">Aktuell</span> : null}
              </button>
            ))
          )}
        </div>
        {error ? <p className="err">{error}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
