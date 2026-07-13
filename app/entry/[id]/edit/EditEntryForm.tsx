"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateEntry, recordMedia, deleteMedia } from "@/app/content-actions";
import VoiceRecorder from "@/app/VoiceRecorder";
import { useConfirm } from "@/app/ConfirmProvider";
import type { MediaInput, MediaKind } from "@/app/content-types";

export type ExistingMedia = { id: string; kind: string; url: string };

function kindOf(type: string): MediaKind {
  if (type.startsWith("video")) return "video";
  if (type.startsWith("audio")) return "audio";
  return "image";
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
}

export default function EditEntryForm({
  entryId,
  householdId,
  initialTitle,
  initialBody,
  initialDate,
  initialPrivate,
  initialPlace,
  existingMedia,
  nextPosition,
  placeSuggestions,
}: {
  entryId: string;
  householdId: string;
  initialTitle: string;
  initialBody: string;
  initialDate: string;
  initialPrivate: boolean;
  initialPlace: string;
  existingMedia: ExistingMedia[];
  nextPosition: number;
  placeSuggestions: string[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [existing, setExisting] = useState<ExistingMedia[]>(existingMedia);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, kind: kindOf(f.type), url: URL.createObjectURL(f) })),
    [files],
  );

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeNewFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onRemoveExisting(id: string) {
    const ok = await confirm({
      title: "Medium entfernen?",
      body: "Dieses Foto/Video wird dauerhaft gelöscht.",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    setRemovingId(id);
    const res = await deleteMedia(id);
    setRemovingId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setExisting((prev) => prev.filter((m) => m.id !== id));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await updateEntry(entryId, {
        title: String(fd.get("title") ?? ""),
        body: String(fd.get("body") ?? ""),
        eventDate: String(fd.get("event_date") ?? ""),
        isPrivate: fd.get("is_private") === "on",
        place: String(fd.get("place") ?? ""),
      });
      if (res.error) {
        setError(res.error);
        setBusy(false);
        return;
      }

      if (files.length > 0) {
        const supabase = createClient();
        const items: MediaInput[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i]!;
          const position = nextPosition + i;
          const path = `${householdId}/${entryId}/${position}-${sanitize(file.name)}`;
          const { error: upErr } = await supabase.storage
            .from("media")
            .upload(path, file, { contentType: file.type || undefined, upsert: false });
          if (upErr) {
            setError(`Upload fehlgeschlagen: ${upErr.message}`);
            setBusy(false);
            return;
          }
          items.push({ storage_key: path, kind: kindOf(file.type), mime: file.type, bytes: file.size, position });
        }
        const rec = await recordMedia(entryId, householdId, items);
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
        <p className="eyebrow">Erinnerung bearbeiten</p>
        <h1 className="title">Eintrag ändern</h1>
        <p className="sub">Text, Ort, Datum, Sichtbarkeit und Fotos/Videos anpassen.</p>
      </div>

      <div className="field">
        <label htmlFor="title">Titel (optional)</label>
        <input id="title" name="title" type="text" maxLength={80} defaultValue={initialTitle} />
      </div>

      <div className="field">
        <label>Fotos / Videos</label>
        {existing.length > 0 ? (
          <div className="filestrip">
            {existing.map((m) => (
              <div className="ft" key={m.id}>
                {m.kind === "image" ? (
                  <img src={m.url} alt="" />
                ) : m.kind === "video" ? (
                  <video src={m.url} muted />
                ) : (
                  <span className="lbl">🎧</span>
                )}
                <button
                  type="button"
                  className="x"
                  aria-label="Entfernen"
                  disabled={removingId === m.id}
                  onClick={() => onRemoveExisting(m.id)}
                >
                  {removingId === m.id ? "…" : "✕"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: "0.85rem", margin: "2px 0 0" }}>
            Noch keine Medien in diesem Eintrag.
          </p>
        )}
        <div className="filedrop" style={{ marginTop: 10 }} onClick={() => inputRef.current?.click()}>
          ＋ Fotos/Videos/Audio hinzufügen (mehrere möglich)
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
                <button type="button" className="x" aria-label="Entfernen" onClick={() => removeNewFile(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="body">Text</label>
        <textarea id="body" name="body" rows={5} defaultValue={initialBody} />
      </div>

      <div className="field">
        <label htmlFor="event_date">Zeitpunkt der Erinnerung</label>
        <input id="event_date" name="event_date" type="date" defaultValue={initialDate} />
      </div>

      <div className="field">
        <label htmlFor="place">Ort (optional)</label>
        <input
          id="place"
          name="place"
          type="text"
          maxLength={120}
          defaultValue={initialPlace}
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
        <input type="checkbox" name="is_private" defaultChecked={initialPrivate} />
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
