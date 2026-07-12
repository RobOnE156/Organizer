"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEntry } from "@/app/content-actions";

export default function EditEntryForm({
  entryId,
  initialTitle,
  initialBody,
  initialDate,
  initialPrivate,
}: {
  entryId: string;
  initialTitle: string;
  initialBody: string;
  initialDate: string;
  initialPrivate: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateEntry(entryId, {
      title: String(fd.get("title") ?? ""),
      body: String(fd.get("body") ?? ""),
      eventDate: String(fd.get("event_date") ?? ""),
      isPrivate: fd.get("is_private") === "on",
    });
    if (res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">Erinnerung bearbeiten</p>
        <h1 className="title">Eintrag ändern</h1>
        <p className="sub">Text, Datum und Sichtbarkeit anpassen. (Fotos ändern folgt bald.)</p>
      </div>

      <div className="field">
        <label htmlFor="title">Titel (optional)</label>
        <input id="title" name="title" type="text" maxLength={80} defaultValue={initialTitle} />
      </div>

      <div className="field">
        <label htmlFor="body">Text</label>
        <textarea id="body" name="body" rows={5} defaultValue={initialBody} />
      </div>

      <div className="field">
        <label htmlFor="event_date">Zeitpunkt der Erinnerung</label>
        <input id="event_date" name="event_date" type="date" defaultValue={initialDate} />
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
