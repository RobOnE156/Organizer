"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createEntryGetId, recordMedia, attachLink } from "@/app/content-actions";
import VoiceRecorder from "@/app/VoiceRecorder";
import { firstPhotoGps } from "@/lib/exif-gps";
import { kindOf, uploadEntryMedia, type UploadProgress } from "@/lib/upload";
import { useT } from "@/app/LanguageProvider";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      // Read GPS from the photos (in the browser) so the private map can show
      // where this memory happened. Best-effort — most photos won't have it.
      const gps = await firstPhotoGps(files);
      const res = await createEntryGetId({
        title: String(fd.get("title") ?? ""),
        body: String(fd.get("body") ?? ""),
        eventDate: String(fd.get("event_date") ?? ""),
        isPrivate: fd.get("is_private") === "on",
        place: String(fd.get("place") ?? ""),
        childId,
        lat: gps?.lat ?? null,
        lng: gps?.lng ?? null,
      });
      if (res.error || !res.entryId || !res.householdId) {
        setError(res.error ?? t("ef.save_fail"));
        setBusy(false);
        return;
      }

      if (files.length > 0) {
        const supabase = createClient();
        const controller = new AbortController();
        abortRef.current = controller;
        const up = await uploadEntryMedia({
          supabase,
          householdId: res.householdId,
          entryId: res.entryId,
          files,
          onProgress: setProgress,
          signal: controller.signal,
        });
        abortRef.current = null;
        if (up.error) {
          setError(t("common.upload_failed") + up.error);
          setBusy(false);
          setProgress(null);
          return;
        }
        // On cancel we keep whatever already finished, so the entry isn't empty.
        if (up.items.length > 0) {
          const rec = await recordMedia(res.entryId, res.householdId, up.items);
          if (rec.error) {
            setError(rec.error);
            setBusy(false);
            setProgress(null);
            return;
          }
        }
      }

      const link = String(fd.get("link") ?? "").trim();
      if (link) {
        const lr = await attachLink(res.entryId, res.householdId, link);
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
        <p className="eyebrow">{t("ef.eyebrow")}</p>
        <h1 className="title">{t("ef.for", { name: childName })}</h1>
        <p className="sub">{t("ef.sub")}</p>
      </div>

      <div className="field">
        <label htmlFor="title">{t("ef.title_label")}</label>
        <input id="title" name="title" type="text" maxLength={80} placeholder={t("ef.title_ph")} />
      </div>

      <div className="field">
        <label>{t("ef.media_label")}</label>
        <div className="filedrop" onClick={() => inputRef.current?.click()}>
          {t("ef.pick_files")}
        </div>
        <small className="muted" style={{ fontSize: ".76rem" }}>{t("ef.media_hint")}</small>
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
                <button type="button" className="x" aria-label={t("common.remove")} onClick={() => removeFile(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="body">{t("ef.text_label")}</label>
        <textarea
          id="body"
          name="body"
          rows={5}
          placeholder={t("ef.text_ph")}
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
        <label htmlFor="link">{t("ef.link_label")}</label>
        <input id="link" name="link" type="url" inputMode="url" placeholder={t("ef.link_ph")} />
        <small className="muted" style={{ fontSize: ".76rem" }}>{t("ef.link_hint")}</small>
      </div>

      <div className="field">
        <label htmlFor="event_date">{t("ef.when_label")}</label>
        <input id="event_date" name="event_date" type="date" defaultValue={todayISO()} />
      </div>

      <div className="field">
        <label htmlFor="place">{t("ef.place_label")}</label>
        <input
          id="place"
          name="place"
          type="text"
          maxLength={120}
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

      <label className="checkline">
        <input type="checkbox" name="is_private" />
        <span className="pt">
          <b>{t("ef.private_title")}</b>
          <small>{t("ef.private_hint")}</small>
        </span>
      </label>

      {error ? <p className="err">{error}</p> : null}
      {busy && progress && progress.total > 0 ? (
        <div className="uploadbar">
          <div className="uploadbar-track">
            <div className="uploadbar-fill" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
          </div>
          <small className="muted">
            {progress.phase === "prepare"
              ? t("ef.preparing", { pct: Math.round(progress.fraction * 100) })
              : t("ef.uploading", {
                  done: progress.done,
                  total: progress.total,
                  pct: Math.round(progress.fraction * 100),
                })}
          </small>
          <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
            {t("common.cancel")}
          </button>
        </div>
      ) : null}
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</button>
        <a className="btn" href="/">{t("common.cancel")}</a>
      </div>
    </form>
  );
}
