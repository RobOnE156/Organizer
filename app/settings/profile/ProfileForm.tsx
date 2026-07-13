"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, setAvatar } from "@/app/content-actions";
import { AUTHOR_COLORS } from "@/app/content-types";
import Avatar from "@/app/Avatar";
import { useT } from "@/app/LanguageProvider";

function sanitizeExt(name: string): string {
  const ext = (name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "jpg";
}

export default function ProfileForm({
  initialName,
  initialColor,
  email,
  householdId,
  userId,
  initialAvatarUrl,
}: {
  initialName: string;
  initialColor: string;
  email: string;
  householdId: string;
  userId: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const { t } = useT();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onPickAvatar(file: File) {
    setError(null);
    setSaved(false);
    setAvatarBusy(true);
    try {
      const supabase = createClient();
      const key = `${householdId}/avatar/${userId}-${Date.now()}.${sanitizeExt(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(key, file, { contentType: file.type || undefined, upsert: true });
      if (upErr) {
        setError(`Upload fehlgeschlagen: ${upErr.message}`);
        return;
      }
      const res = await setAvatar(key);
      if (res.error) {
        setError(res.error);
        return;
      }
      setAvatarUrl(URL.createObjectURL(file));
      router.refresh();
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setError(null);
    setSaved(false);
    setAvatarBusy(true);
    const res = await setAvatar(null);
    setAvatarBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setAvatarUrl(null);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await updateProfile({ displayName: name, color });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const preview = name.trim() || email.split("@")[0] || "Ich";

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div className="profileprev">
        <Avatar name={preview} color={color} url={avatarUrl} className="ava-lg" />
        <div>
          <b>{preview}</b>
          {email ? <small className="muted" style={{ display: "block" }}>{email}</small> : null}
          <div className="avactions">
            <button
              type="button"
              className="linkbtn"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarBusy}
            >
              {avatarBusy ? "…" : avatarUrl ? t("profile.photo_change") : t("profile.photo_add")}
            </button>
            {avatarUrl ? (
              <button type="button" className="linkbtn danger" onClick={removeAvatar} disabled={avatarBusy}>
                {t("profile.photo_remove")}
              </button>
            ) : null}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickAvatar(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="dname">{t("profile.name_label")}</label>
        <input
          id="dname"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={40}
          placeholder={t("profile.name_ph")}
          autoComplete="name"
        />
      </div>

      <div className="field">
        <label>{t("profile.color_label")}</label>
        <div className="swatches">
          {AUTHOR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={"swatch" + (c === color ? " on" : "")}
              style={{ background: c }}
              onClick={() => {
                setColor(c);
                setSaved(false);
              }}
              aria-label={"Farbe " + c}
              aria-pressed={c === color}
            >
              {c === color ? "✓" : ""}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="err">{error}</p> : null}
      {saved ? <p className="msg">{t("common.saved")}</p> : null}
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? t("common.saving") : t("common.save")}
        </button>
        <a className="btn" href="/">{t("common.cancel")}</a>
      </div>
    </form>
  );
}
