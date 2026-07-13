"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEntriesNeedingGeo } from "@/lib/data";
import { gpsFromBlob } from "@/lib/exif-gps";
import { setEntryGeo } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";

export default function GeoBackfill({ householdId, userId }: { householdId: string; userId: string }) {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState<{ found: number; scanned: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setDone(null);
    setError(null);
    setStatus(t("gb.searching"));
    try {
      const supabase = createClient();
      const items = await getEntriesNeedingGeo(supabase, householdId, userId);
      if (items.length === 0) {
        setDone({ found: 0, scanned: 0 });
        setStatus("");
        setBusy(false);
        return;
      }
      let found = 0;
      for (let i = 0; i < items.length; i++) {
        setStatus(t("gb.checking", { i: i + 1, n: items.length, found }));
        const item = items[i]!;
        for (const key of item.keys) {
          const { data: blob } = await supabase.storage.from("media").download(key);
          if (!blob) continue;
          const gps = await gpsFromBlob(blob);
          if (gps) {
            const res = await setEntryGeo(item.entry_id, gps.lat, gps.lng);
            if (res.updated) found += 1;
            break; // stop at the first photo of this entry that has GPS
          }
        }
      }
      setDone({ found, scanned: items.length });
      setStatus("");
      if (found > 0) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("gb.failed"));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="backfill">
      <button className="btn" onClick={run} disabled={busy}>
        {busy ? t("gb.busy") : t("gb.button")}
      </button>
      {status ? <p className="msg" style={{ marginTop: 8 }}>{status}</p> : null}
      {done ? (
        <p className="msg" style={{ marginTop: 8 }}>
          {done.scanned === 0
            ? t("gb.none")
            : done.found > 0
              ? t("gb.done_some", { found: done.found, scanned: done.scanned })
              : t("gb.done_none", { scanned: done.scanned })}
        </p>
      ) : null}
      {error ? <p className="err" style={{ marginTop: 8 }}>{error}</p> : null}
      <p className="muted" style={{ fontSize: ".78rem", marginTop: 8 }}>{t("gb.hint")}</p>
    </div>
  );
}
