"use client";

import { useEffect, useState } from "react";
import { searchDiary } from "@/app/content-actions";
import type { SearchCommentHit, SearchEntryHit, SearchResult } from "@/app/content-types";
import { makeSnippet, type Snippet } from "@/lib/search-format";
import { fmtDate } from "@/lib/timeline";
import Avatar from "@/app/Avatar";
import { useT } from "@/app/LanguageProvider";
import type { MemberProfile } from "@/lib/data";

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

function Marked({ s }: { s: Snippet }) {
  return (
    <span className="snip">
      {s.pre}
      <mark>{s.hit}</mark>
      {s.post}
    </span>
  );
}

// Pick the most relevant field to excerpt for an entry hit.
function entrySnippet(e: SearchEntryHit, q: string): Snippet | null {
  return makeSnippet(e.body ?? "", q) ?? makeSnippet(e.place_name ?? "", q) ?? makeSnippet(e.title ?? "", q);
}

export default function SearchPanel({ authors }: { authors: Record<string, MemberProfile> }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fallback: MemberProfile = { name: "Elternteil", color: "#8a8a8a" };
  const nameOf = (id: string) => (authors[id] ?? fallback).name;
  const colorOf = (id: string) => (authors[id] ?? fallback).color;
  const avatarOf = (id: string) => (authors[id] ?? fallback).avatarUrl ?? null;

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const h = setTimeout(async () => {
      const r = await searchDiary(term);
      if (active) {
        setRes(r);
        setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(h);
    };
  }, [q]);

  const term = q.trim();
  const total = res ? res.entries.length + res.comments.length : 0;

  return (
    <div className="searchwrap">
      <input
        className="searchbox"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("search.ph")}
        aria-label={t("search.title")}
        autoFocus
      />

      {loading ? <p className="muted" style={{ marginTop: 12 }}>{t("search.searching")}</p> : null}

      {!loading && term.length >= 2 && res ? (
        total === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>{t("search.none", { term })}</p>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>{t("search.results", { n: total, term })}</p>
        )
      ) : null}

      {!loading && res && res.entries.length > 0 ? (
        <>
          <h2 className="shead">{t("search.entries")}</h2>
          <ul className="shits">
            {res.entries.map((e: SearchEntryHit) => {
              const snip = entrySnippet(e, term);
              return (
                <li key={e.id} className="shit">
                  <a href={`/#entry-${e.id}`}>
                    <div className="shmeta">
                      <Avatar name={nameOf(e.author_id)} color={colorOf(e.author_id)} url={avatarOf(e.author_id)} className="cava" />
                      <b>{e.title || t("search.untitled")}</b>
                      <span className="swhen">{fmtDate(e.event_date)}</span>
                    </div>
                    {e.place_name ? <span className="splace">📍 {e.place_name}</span> : null}
                    {snip ? <p className="sbody"><Marked s={snip} /></p> : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {!loading && res && res.comments.length > 0 ? (
        <>
          <h2 className="shead">{t("search.comments")}</h2>
          <ul className="shits">
            {res.comments.map((c: SearchCommentHit) => {
              const snip = makeSnippet(c.body, term);
              return (
                <li key={c.id} className="shit">
                  <a href={`/#entry-${c.entry_id}`}>
                    <div className="shmeta">
                      <Avatar name={nameOf(c.author_id)} color={colorOf(c.author_id)} url={avatarOf(c.author_id)} className="cava" />
                      <b>{nameOf(c.author_id)}</b>
                      <span className="swhen">{fmtTime(c.created_at)}</span>
                    </div>
                    {snip ? <p className="sbody"><Marked s={snip} /></p> : <p className="sbody">{c.body}</p>}
                    <span className="sctx">
                      {t("search.on")} {c.entry_title || t("home.memory")}
                      {c.entry_date ? ` · ${fmtDate(c.entry_date)}` : ""}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
