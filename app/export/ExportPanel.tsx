"use client";

import { useState } from "react";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/client";
import type { Child, ExportEntry, MemberProfile } from "@/lib/data";
import {
  buildIndexHtml,
  buildSidecar,
  EXPORT_README,
  fileNameOf,
  slugify,
  type ViewerEntry,
} from "@/lib/export-format";

type ExportMedia = { entry_id: string; storage_key: string; kind: string; position: number };

export default function ExportPanel({
  householdName,
  childList,
  entries,
  media,
  authors,
}: {
  householdName: string;
  childList: Child[];
  entries: ExportEntry[];
  media: ExportMedia[];
  authors: Record<string, MemberProfile>;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  async function run() {
    setError(null);
    setWarn(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const zip = new JSZip();

      // media grouped per entry, in display order
      const byEntry = new Map<string, ExportMedia[]>();
      for (const m of media) {
        const arr = byEntry.get(m.entry_id);
        if (arr) arr.push(m);
        else byEntry.set(m.entry_id, [m]);
      }
      for (const arr of byEntry.values()) arr.sort((a, b) => a.position - b.position);

      const pathOf = (m: ExportMedia) => "media/" + m.entry_id + "/" + fileNameOf(m.storage_key, m.position);

      // 1) download every media file (RLS-scoped) into the ZIP
      let done = 0;
      let failed = 0;
      for (const m of media) {
        setStatus("Lade Medien … " + (done + 1) + "/" + media.length);
        const { data: blob, error: dErr } = await supabase.storage.from("media").download(m.storage_key);
        if (dErr || !blob) failed += 1;
        else zip.file(pathOf(m), blob);
        done += 1;
      }

      // 2) resolve authors + children, build viewer data + sidecars
      const childName = new Map(childList.map((c) => [c.id, c.name]));
      const authorOf = (id: string) => authors[id] ?? { name: "Elternteil", color: "#8a8a8a" };

      setStatus("Erstelle Tagebuch-Seite …");
      const viewerEntries: ViewerEntry[] = entries.map((e) => {
        const a = authorOf(e.author_id);
        const kids = e.child_ids.map((id) => childName.get(id)).filter((n): n is string => Boolean(n));
        const ms = (byEntry.get(e.id) ?? []).map((m) => ({ path: pathOf(m), kind: m.kind }));
        return {
          date: e.event_date,
          created_at: e.created_at,
          author: a.name,
          color: a.color,
          place: e.place_name,
          private: e.is_private,
          title: e.title,
          body: e.body,
          children: kids,
          media: ms,
        };
      });

      for (const e of entries) {
        const a = authorOf(e.author_id);
        const kids = e.child_ids.map((id) => childName.get(id)).filter((n): n is string => Boolean(n));
        const paths = (byEntry.get(e.id) ?? []).map(pathOf);
        zip.file("entries/" + e.event_date + "-" + e.id.slice(0, 8) + ".md", buildSidecar(e, a.name, kids, paths));
      }

      zip.file(
        "entries.json",
        JSON.stringify(
          { title: householdName, exported_at: new Date().toISOString(), children: childList, entries: viewerEntries },
          null,
          2,
        ),
      );
      zip.file("index.html", buildIndexHtml(householdName, viewerEntries));
      zip.file("README.txt", EXPORT_README);

      // 3) zip it up and hand the file to the browser
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (meta) => {
        setStatus("Packe ZIP … " + Math.round(meta.percent) + "%");
      });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = slugify(householdName) + "-tagebuch-" + date + ".zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);

      if (failed > 0) {
        setWarn(failed + " von " + media.length + " Mediendateien konnten nicht geladen werden und fehlen im Export. Bitte erneut versuchen.");
      }
      setStatus("Fertig ✓ Die ZIP-Datei wurde heruntergeladen.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export fehlgeschlagen.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 520 }}>
      <p className="muted" style={{ fontSize: ".9rem", margin: 0 }}>
        {entries.length} {entries.length === 1 ? "Eintrag" : "Einträge"} · {media.length}{" "}
        {media.length === 1 ? "Mediendatei" : "Mediendateien"}
      </p>
      <button className="btn btn-primary" onClick={run} disabled={busy || entries.length === 0}>
        {busy ? "Exportiere …" : "Tagebuch exportieren"}
      </button>
      {status ? <p className="msg">{status}</p> : null}
      {warn ? <p className="err">{warn}</p> : null}
      {error ? <p className="err">{error}</p> : null}
      <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>
        Bei sehr vielen oder großen Videos den Export am besten am Computer ausführen. Die Datei wird
        lokal auf deinem Gerät erstellt — es werden keine Daten an Dritte gesendet.
      </p>
    </div>
  );
}
