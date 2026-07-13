"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setChildCover } from "@/app/content-actions";
import CoverCropper from "@/app/CoverCropper";
import CoverPicker from "@/app/CoverPicker";
import { useT } from "@/app/LanguageProvider";

export default function ChildHero({
  childId,
  householdId,
  name,
  age,
  birthLabel,
  coverUrl,
  coverKey,
}: {
  childId: string;
  householdId: string;
  name: string;
  age: string;
  birthLabel: string | null;
  coverUrl: string | null;
  coverKey: string | null;
}) {
  const router = useRouter();
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyCover(key: string) {
    setError(null);
    setBusy(true);
    const res = await setChildCover(childId, key);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

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
        setError(t("common.upload_failed") + upErr.message);
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
      setError(err instanceof Error ? err.message : t("common.unknown_error"));
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
        <p className="hero-eyebrow">{t("nav.timeline")}</p>
        <h1 className="hero-name">{name}</h1>
        <p className="hero-sub">
          {age ? age : null}
          {age && birthLabel ? " · " : null}
          {birthLabel ? t("hero.born", { date: birthLabel }) : null}
        </p>
      </div>
      <button
        type="button"
        className="hero-edit"
        onClick={() => setPickerOpen(true)}
        disabled={busy}
        aria-label={t("hero.change_cover")}
        title={t("hero.change_cover")}
      >
        {busy ? "…" : coverUrl ? t("hero.cover_change") : t("hero.cover_add")}
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

      {pickerOpen ? (
        <CoverPicker
          childId={childId}
          householdId={householdId}
          currentKey={coverKey}
          onClose={() => setPickerOpen(false)}
          onPickNew={() => {
            setPickerOpen(false);
            inputRef.current?.click();
          }}
          onSelect={(key) => {
            setPickerOpen(false);
            applyCover(key);
          }}
        />
      ) : null}
      {cropFile ? (
        <CoverCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={uploadCover} />
      ) : null}
    </div>
  );
}
