"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setChildCover } from "@/app/content-actions";

function sanitizeExt(name: string, mime: string): string {
  const fromName = name.includes(".") ? name.split(".").pop() : "";
  const ext = (fromName || mime.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5);
  return ext || "jpg";
}

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${householdId}/cover/${childId}-${Date.now()}.${sanitizeExt(file.name, file.type)}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
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
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error ? <p className="hero-err">{error}</p> : null}
    </div>
  );
}
