"use client";

import { useState } from "react";
import JSZip from "jszip";
import { useT } from "@/app/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { ageLabel } from "@/lib/timeline";
import { snapshotPrompts } from "@/lib/snapshot-prompts";
import { REACTION_EMOJIS } from "@/app/content-types";
import type { Child, Comment, CommentReaction, ExportEntry, MemberProfile, Reaction, Snapshot } from "@/lib/data";
import {
  buildIndexHtml,
  buildSidecar,
  buildSnapshotSidecar,
  EXPORT_README,
  fileNameOf,
  slugify,
  type ViewerComment,
  type ViewerEntry,
  type ViewerLink,
  type ViewerReaction,
  type ViewerSnapshot,
} from "@/lib/export-format";

type ExportMedia = { entry_id: string; storage_key: string; kind: string; position: number };

function fmtCommentDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExportPanel({
  householdName,
  childList,
  entries,
  media,
  authors,
  snapshots,
  comments,
  reactions,
  commentReactions,
  highlightedIds,
}: {
  householdName: string;
  childList: Child[];
  entries: ExportEntry[];
  media: ExportMedia[];
  authors: Record<string, MemberProfile>;
  snapshots: Snapshot[];
  comments: Comment[];
  reactions: Reaction[];
  commentReactions: CommentReaction[];
  highlightedIds: string[];
}) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  async function run() {
    setError(null);
    setWarn(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const zip = new JSZip();
      const highlightSet = new Set(highlightedIds);

      // media grouped per entry, in display order
      const byEntry = new Map<string, ExportMedia[]>();
      for (const m of media) {
        const arr = byEntry.get(m.entry_id);
        if (arr) arr.push(m);
        else byEntry.set(m.entry_id, [m]);
      }
      for (const arr of byEntry.values()) arr.sort((a, b) => a.position - b.position);

      const pathOf = (m: ExportMedia) => "media/" + m.entry_id + "/" + fileNameOf(m.storage_key, m.position);

      // 1) download every media file (RLS-scoped) into the ZIP
      let done = 0;
      let failed = 0;
      for (const m of media) {
        setStatus(t("export.loading_media", { i: done + 1, n: media.length }));
        const { data: blob, error: dErr } = await supabase.storage.from("media").download(m.storage_key);
        if (dErr || !blob) failed += 1;
        else zip.file(pathOf(m), blob);
        done += 1;
      }

      // 2) resolve authors + children, build viewer data + sidecars
      const childName = new Map(childList.map((c) => [c.id, c.name]));
      const authorOf = (id: string) => authors[id] ?? { name: "Elternteil", color: "#8a8a8a" };

      const commentsByEntry = new Map<string, Comment[]>();
      for (const c of comments) {
        const arr = commentsByEntry.get(c.entry_id);
        if (arr) arr.push(c);
        else commentsByEntry.set(c.entry_id, [c]);
      }

      // aggregate a flat reaction list into pills per emoji, in palette order
      const aggregate = (rows: { emoji: string }[]): ViewerReaction[] =>
        REACTION_EMOJIS.map((emoji) => ({ emoji, count: rows.filter((r) => r.emoji === emoji).length })).filter(
          (r) => r.count > 0,
        );

      const commentReactionsByComment = new Map<string, CommentReaction[]>();
      for (const r of commentReactions) {
        const arr = commentReactionsByComment.get(r.comment_id);
        if (arr) arr.push(r);
        else commentReactionsByComment.set(r.comment_id, [r]);
      }
      const viewerCommentsFor = (entryId: string): ViewerComment[] =>
        (commentsByEntry.get(entryId) ?? []).map((c) => ({
          author: authorOf(c.author_id).name,
          date: fmtCommentDate(c.created_at),
          text: c.body,
          reactions: aggregate(commentReactionsByComment.get(c.id) ?? []),
        }));

      // entry reactions aggregated per emoji (in the app's palette order)
      const reactionsByEntry = new Map<string, Reaction[]>();
      for (const r of reactions) {
        const arr = reactionsByEntry.get(r.entry_id);
        if (arr) arr.push(r);
        else reactionsByEntry.set(r.entry_id, [r]);
      }
      const viewerReactionsFor = (entryId: string): ViewerReaction[] => aggregate(reactionsByEntry.get(entryId) ?? []);

      // link preview cards — self-host the thumbnail into the ZIP
      const linkByEntry = new Map<string, ViewerLink>();
      for (const e of entries) {
        const lk = e.link;
        if (!lk) continue;
        let thumbPath: string | null = null;
        if (lk.thumbnail_key) {
          const { data: blob } = await supabase.storage.from("media").download(lk.thumbnail_key);
          if (blob) {
            thumbPath = "links/" + (lk.thumbnail_key.split("/").pop() || e.id + ".jpg");
            zip.file(thumbPath, blob);
          }
        }
        linkByEntry.set(e.id, {
          url: lk.url,
          title: lk.title,
          description: lk.description,
          provider: lk.provider,
          thumbPath,
        });
      }

      setStatus(t("export.building"));
      const viewerEntries: ViewerEntry[] = entries.map((e) => {
        const a = authorOf(e.author_id);
        const kids = e.child_ids.map((id) => childName.get(id)).filter((n): n is string => Boolean(n));
        const ms = (byEntry.get(e.id) ?? []).map((m) => ({ path: pathOf(m), kind: m.kind }));
        return {
          date: e.event_date,
          created_at: e.created_at,
          author: a.name,
          color: a.color,
          place: e.place_name,
          private: e.is_private,
          title: e.title,
          body: e.body,
          children: kids,
          highlight: highlightSet.has(e.id),
          media: ms,
          link: linkByEntry.get(e.id) ?? null,
          reactions: viewerReactionsFor(e.id),
          comments: viewerCommentsFor(e.id),
        };
      });

      for (const e of entries) {
        const a = authorOf(e.author_id);
        const kids = e.child_ids.map((id) => childName.get(id)).filter((n): n is string => Boolean(n));
        const paths = (byEntry.get(e.id) ?? []).map(pathOf);
        zip.file(
          "entries/" + e.event_date + "-" + e.id.slice(0, 8) + ".md",
          buildSidecar(
            e,
            a.name,
            kids,
            paths,
            viewerCommentsFor(e.id),
            linkByEntry.get(e.id) ?? null,
            viewerReactionsFor(e.id),
            highlightSet.has(e.id),
          ),
        );
      }

      // snapshots ("who is <child> right now")
      const childById = new Map(childList.map((c) => [c.id, c]));
      const viewerSnapshots: ViewerSnapshot[] = [];
      for (const s of snapshots) {
        const child = childById.get(s.child_id);
        const cname = child?.name ?? "Kind";
        const items = snapshotPrompts(cname)
          .filter((p) => (s.answers[p.key] ?? "").trim())
          .map((p) => ({ label: p.label, value: s.answers[p.key] as string }));
        if (items.length === 0) continue;
        const age = ageLabel(child?.birth_date ?? null, s.taken_on);
        viewerSnapshots.push({ date: s.taken_on, child: cname, age, items });
        zip.file("snapshots/" + s.taken_on + "-" + s.id.slice(0, 8) + ".md", buildSnapshotSidecar(s.taken_on, cname, age, items));
      }
      if (viewerSnapshots.length > 0) {
        zip.file("snapshots.json", JSON.stringify({ snapshots: viewerSnapshots }, null, 2));
      }

      zip.file(
        "entries.json",
        JSON.stringify(
          { title: householdName, exported_at: new Date().toISOString(), children: childList, entries: viewerEntries },
          null,
          2,
        ),
      );
      zip.file("index.html", buildIndexHtml(householdName, viewerEntries, viewerSnapshots));
      zip.file("README.txt", EXPORT_README);

      // 3) zip it up and hand the file to the browser
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (meta) => {
        setStatus(t("export.zipping", { p: Math.round(meta.percent) }));
      });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = slugify(householdName) + "-tagebuch-" + date + ".zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);

      if (failed > 0) {
        setWarn(t("export.warn", { failed, total: media.length }));
      }
      setStatus(t("export.done"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("export.failed"));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 520 }}>
      <p className="muted" style={{ fontSize: ".9rem", margin: 0 }}>
        {t("export.summary", { n: entries.length, m: media.length })}
      </p>
      <button className="btn btn-primary" onClick={run} disabled={busy || entries.length === 0}>
        {busy ? t("export.busy") : t("export.title")}
      </button>
      {status ? <p className="msg">{status}</p> : null}
      {warn ? <p className="err">{warn}</p> : null}
      {error ? <p className="err">{error}</p> : null}
      <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>{t("export.hint")}</p>
    </div>
  );
}
