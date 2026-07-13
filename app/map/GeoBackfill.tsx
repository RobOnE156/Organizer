"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEntriesNeedingGeo } from "@/lib/data";
import { gpsFromBlob } from "@/lib/exif-gps";
import { setEntryGeo } from "@/app/content-actions";

export default function GeoBackfill({ householdId, userId }: { householdId: string; userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState<{ found: number; scanned: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setDone(null);
    setError(null);
    setStatus("Suche deine Einträge ohne Ort …");
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
        setStatus(`Prüfe Erinnerung ${i + 1}/${items.length} … ${found} ${found === 1 ? "Ort" : "Orte"} gefunden`);
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
      setError(err instanceof Error ? err.message : "Nachtragen fehlgeschlagen.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="backfill">
      <button className="btn" onClick={run} disabled={busy}>
        {busy ? "Trage nach …" : "Orte aus vorhandenen Fotos nachtragen"}
      </button>
      {status ? <p className="msg" style={{ marginTop: 8 }}>{status}</p> : null}
      {done ? (
        <p className="msg" style={{ marginTop: 8 }}>
          {done.scanned === 0
            ? "Keine deiner Erinnerungen ohne Ort mit Foto gefunden — alles aktuell ✓"
            : done.found > 0
              ? `Fertig ✓ ${done.found} von ${done.scanned} Erinnerungen einen Ort ergänzt.`
              : `Fertig — in ${done.scanned} geprüften Fotos war kein GPS enthalten.`}
        </p>
      ) : null}
      {error ? <p className="err" style={{ marginTop: 8 }}>{error}</p> : null}
      <p className="muted" style={{ fontSize: ".78rem", marginTop: 8 }}>
        Liest die GPS-Angaben aus deinen bereits hochgeladenen Fotos (nur deine eigenen Einträge).
        Die Fotos werden dafür kurz geladen — am besten im WLAN ausführen. Es werden keine Daten an
        Dritte gesendet.
      </p>
    </div>
  );
}
