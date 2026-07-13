"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateEntry, recordMedia, deleteMedia, attachLink } from "@/app/content-actions";
import VoiceRecorder from "@/app/VoiceRecorder";
import { firstPhotoGps } from "@/lib/exif-gps";
import { useConfirm } from "@/app/ConfirmProvider";
import { useT } from "@/app/LanguageProvider";
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
  initialLink,
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
  initialLink: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { t } = useT();
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
      title: t("ee.rm_media_title"),
      body: t("ee.rm_media_body"),
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
      // If a newly added photo carries GPS, capture it (never clears existing).
      const gps = await firstPhotoGps(files);
      const res = await updateEntry(entryId, {
        title: String(fd.get("title") ?? ""),
        body: String(fd.get("body") ?? ""),
        eventDate: String(fd.get("event_date") ?? ""),
        isPrivate: fd.get("is_private") === "on",
        place: String(fd.get("place") ?? ""),
        lat: gps?.lat ?? null,
        lng: gps?.lng ?? null,
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
            setError(t("common.upload_failed") + upErr.message);
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

      // Only re-resolve the link if it actually changed (avoids re-fetching).
      const link = String(fd.get("link") ?? "").trim();
      if (link !== initialLink.trim()) {
        const lr = await attachLink(entryId, householdId, link);
        if (lr.error) {
          setError(lr.error);
          setBusy(false);
          return;
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.unknown_error"));
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">{t("ee.eyebrow")}</p>
        <h1 className="title">{t("ee.title")}</h1>
        <p className="sub">{t("ee.sub")}</p>
      </div>

      <div className="field">
        <label htmlFor="title">{t("ef.title_label")}</label>
        <input id="title" name="title" type="text" maxLength={80} defaultValue={initialTitle} />
      </div>

      <div className="field">
        <label>{t("ee.media_label")}</label>
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
                  aria-label={t("common.remove")}
                  disabled={removingId === m.id}
                  onClick={() => onRemoveExisting(m.id)}
                >
                  {removingId === m.id ? "…" : "✕"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: "0.85rem", margin: "2px 0 0" }}>{t("ee.no_media")}</p>
        )}
        <div className="filedrop" style={{ marginTop: 10 }} onClick={() => inputRef.current?.click()}>
          {t("ee.add_media")}
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
                <button type="button" className="x" aria-label={t("common.remove")} onClick={() => removeNewFile(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="body">{t("ef.text_label")}</label>
        <textarea id="body" name="body" rows={5} defaultValue={initialBody} />
      </div>

      <div className="field">
        <label htmlFor="event_date">{t("ef.when_label")}</label>
        <input id="event_date" name="event_date" type="date" defaultValue={initialDate} />
      </div>

      <div className="field">
        <label htmlFor="place">{t("ef.place_label")}</label>
        <input
          id="place"
          name="place"
          type="text"
          maxLength={120}
          defaultValue={initialPlace}
          placeholder={t("ef.place_ph")}
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

      <div className="field">
        <label htmlFor="link">{t("ef.link_label")}</label>
        <input id="link" name="link" type="url" inputMode="url" defaultValue={initialLink} placeholder={t("ef.link_ph")} />
        <small className="muted" style={{ fontSize: ".76rem" }}>{t("ee.link_hint")}</small>
      </div>

      <label className="checkline">
        <input type="checkbox" name="is_private" defaultChecked={initialPrivate} />
        <span className="pt">
          <b>{t("ef.private_title")}</b>
          <small>{t("ef.private_hint")}</small>
        </span>
      </label>

      {error ? <p className="err">{error}</p> : null}
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</button>
        <a className="btn" href="/">{t("common.cancel")}</a>
      </div>
    </form>
  );
}
