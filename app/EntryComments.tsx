"use client";

import { useState } from "react";
import { addComment, updateComment, deleteComment } from "@/app/content-actions";
import { useConfirm } from "@/app/ConfirmProvider";
import { initial } from "@/lib/timeline";
import type { Comment, MemberProfile } from "@/lib/data";

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function EntryComments({
  entryId,
  householdId,
  initialComments,
  authors,
  userId,
}: {
  entryId: string;
  householdId: string;
  initialComments: Comment[];
  authors: Record<string, MemberProfile>;
  userId: string;
}) {
  const confirm = useConfirm();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const fallback: MemberProfile = { name: "Elternteil", color: "#8a8a8a" };

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setEditText(c.body);
    setError(null);
  }

  async function saveEdit(id: string) {
    const body = editText.trim();
    if (!body) return;
    setBusy(true);
    const res = await updateComment(id, body);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, body } : c)));
    setEditingId(null);
    setEditText("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError(null);
    setBusy(true);
    const res = await addComment(entryId, householdId, body);
    setBusy(false);
    if (res.error || !res.comment) {
      setError(res.error ?? "Kommentar konnte nicht gespeichert werden.");
      return;
    }
    setComments((prev) => [...prev, { entry_id: entryId, ...res.comment! }]);
    setText("");
  }

  async function onDelete(id: string) {
    const ok = await confirm({ title: "Kommentar löschen?", body: "Dein Kommentar wird entfernt.", danger: true });
    if (!ok) return;
    const res = await deleteComment(id);
    if (res.error) {
      setError(res.error);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="cmts">
      {comments.length > 0 ? (
        <ul className="cmtlist">
          {comments.map((c) => {
            const a = authors[c.author_id] ?? fallback;
            return (
              <li className="cmt" key={c.id}>
                <span className="cava" style={{ background: a.color }}>{initial(a.name)}</span>
                <div className="cbody">
                  <div className="cmeta">
                    <b>{a.name}</b>
                    <span>{fmtTime(c.created_at)}</span>
                    {c.author_id === userId && editingId !== c.id ? (
                      <span className="cactions">
                        <button type="button" className="cedit" aria-label="Kommentar bearbeiten" onClick={() => startEdit(c)}>
                          ✎
                        </button>
                        <button type="button" className="cdel" aria-label="Kommentar löschen" onClick={() => onDelete(c.id)}>
                          ✕
                        </button>
                      </span>
                    ) : null}
                  </div>
                  {editingId === c.id ? (
                    <form
                      className="ceditform"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit(c.id);
                      }}
                    >
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        maxLength={4000}
                        autoFocus
                        aria-label="Kommentar bearbeiten"
                      />
                      <button className="btn btn-primary" disabled={busy || !editText.trim()}>Speichern</button>
                      <button type="button" className="btn" onClick={() => setEditingId(null)} disabled={busy}>
                        Abbrechen
                      </button>
                    </form>
                  ) : (
                    <p>{c.body}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <form className="cform" onSubmit={onSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Kommentar schreiben …"
          maxLength={4000}
          aria-label="Kommentar"
        />
        <button className="btn btn-primary" disabled={busy || !text.trim()}>{busy ? "…" : "Senden"}</button>
      </form>
      {error ? <p className="err" style={{ marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}
