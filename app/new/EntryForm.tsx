"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createEntryGetId, recordMedia } from "@/app/content-actions";
import VoiceRecorder from "@/app/VoiceRecorder";
import type { MediaInput, MediaKind } from "@/app/content-types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function kindOf(type: string): MediaKind {
  if (type.startsWith("video")) return "video";
  if (type.startsWith("audio")) return "audio";
  return "image";
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
}

export default function EntryForm({
  childId,
  childName,
  placeSuggestions,
}: {
  childId: string;
  childName: string;
  placeSuggestions: string[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, kind: kindOf(f.type), url: URL.createObjectURL(f) })),
    [files],
  );

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await createEntryGetId({
        title: String(fd.get("title") ?? ""),
        body: String(fd.get("body") ?? ""),
        eventDate: String(fd.get("event_date") ?? ""),
        isPrivate: fd.get("is_private") === "on",
        place: String(fd.get("place") ?? ""),
        childId,
      });
      if (res.error || !res.entryId || !res.householdId) {
        setError(res.error ?? "Speichern fehlgeschlagen.");
        setBusy(false);
        return;
      }

      if (files.length > 0) {
        const supabase = createClient();
        const items: MediaInput[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i]!;
          const path = `${res.householdId}/${res.entryId}/${i}-${sanitize(file.name)}`;
          const { error: upErr } = await supabase.storage
            .from("media")
            .upload(path, file, { contentType: file.type || undefined, upsert: false });
          if (upErr) {
            setError(`Upload fehlgeschlagen: ${upErr.message}`);
            setBusy(false);
            return;
          }
          items.push({ storage_key: path, kind: kindOf(file.type), mime: file.type, bytes: file.size, position: i });
        }
        const rec = await recordMedia(res.entryId, res.householdId, items);
        if (rec.error) {
          setError(rec.error);
          setBusy(false);
          return;
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">Neue Erinnerung</p>
        <h1 className="title">Für {childName}</h1>
        <p className="sub">Halte einen Moment fest — mit Text, Fotos und Videos.</p>
      </div>

      <div className="field">
        <label htmlFor="title">Titel (optional)</label>
        <input id="title" name="title" type="text" maxLength={80} placeholder="z. B. Erster Zahn" />
      </div>

      <div className="field">
        <label>Fotos / Videos / Audio (optional)</label>
        <div className="filedrop" onClick={() => inputRef.current?.click()}>
          ＋ Dateien wählen (mehrere möglich)
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <VoiceRecorder onRecorded={(f) => setFiles((prev) => [...prev, f])} />
        {previews.length > 0 ? (
          <div className="filestrip">
            {previews.map((p, i) => (
              <div className="ft" key={i}>
                {p.kind === "image" ? (
                  <img src={p.url} alt="" />
                ) : p.kind === "video" ? (
                  <video src={p.url} muted />
                ) : (
                  <span className="lbl">🎧</span>
                )}
                <button type="button" className="x" aria-label="Entfernen" onClick={() => removeFile(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="body">Text</label>
        <textarea
          id="body"
          name="body"
          rows={5}
          placeholder="Was ist passiert?"
          style={{
            width: "100%",
            padding: "11px 13px",
            borderRadius: 11,
            border: "1px solid var(--faint)",
            background: "var(--surface-2)",
            color: "var(--ink)",
            font: "inherit",
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="event_date">Zeitpunkt der Erinnerung</label>
        <input id="event_date" name="event_date" type="date" defaultValue={todayISO()} />
      </div>

      <div className="field">
        <label htmlFor="place">Ort (optional)</label>
        <input
          id="place"
          name="place"
          type="text"
          maxLength={120}
          placeholder="z. B. Berlin, bei Oma"
          list="place-list"
          autoComplete="off"
        />
        {placeSuggestions.length > 0 ? (
          <datalist id="place-list">
            {placeSuggestions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        ) : null}
      </div>

      <label className="checkline">
        <input type="checkbox" name="is_private" />
        <span className="pt">
          <b>Nur für mich (privat)</b>
          <small>Nur du siehst diesen Eintrag — später auch das Kind, nicht der andere Elternteil.</small>
        </span>
      </label>

      {error ? <p className="err">{error}</p> : null}
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>{busy ? "Speichere …" : "Speichern"}</button>
        <a className="btn" href="/">Abbrechen</a>
      </div>
    </form>
  );
}
