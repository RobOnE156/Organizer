"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setChildCover } from "@/app/content-actions";
import CoverCropper from "@/app/CoverCropper";

export default function ChildHero({
  childId,
  householdId,
  name,
  age,
  birthLabel,
  coverUrl,
}: {
  childId: string;
  householdId: string;
  name: string;
  age: string;
  birthLabel: string | null;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadCover(blob: Blob) {
    setCropFile(null);
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${householdId}/cover/${childId}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) {
        setError("Upload fehlgeschlagen: " + upErr.message);
        setBusy(false);
        return;
      }
      const res = await setChildCover(childId, path);
      if (res.error) {
        setError(res.error);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={"hero" + (coverUrl ? " hero-photo" : "")}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="hero-bg" src={coverUrl} alt="" />
      ) : null}
      <div className="hero-inner">
        <p className="hero-eyebrow">Tagebuch</p>
        <h1 className="hero-name">{name}</h1>
        <p className="hero-sub">
          {age ? age : null}
          {age && birthLabel ? " · " : null}
          {birthLabel ? `geboren am ${birthLabel}` : null}
        </p>
      </div>
      <button
        type="button"
        className="hero-edit"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Titelbild ändern"
        title="Titelbild ändern"
      >
        {busy ? "…" : coverUrl ? "📷 Ändern" : "📷 Titelbild"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) setCropFile(f);
        }}
      />
      {error ? <p className="hero-err">{error}</p> : null}
      {cropFile ? (
        <CoverCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={uploadCover} />
      ) : null}
    </div>
  );
}
