import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getChildren,
  getEntriesForChild,
  getHighlightedEntryIds,
  getMediaForEntries,
  getMemberProfiles,
  getMilestones,
  getShellPrefs,
  signMediaByEntry,
  type Entry,
} from "@/lib/data";
import { ageLabel, fmtDate, monthKey, monthLabel } from "@/lib/timeline";
import { translator } from "@/lib/i18n";
import { FIRSTS } from "@/lib/firsts";
import type { MsgKey } from "@/lib/i18n";
import BookControls from "./BookControls";

export const dynamic = "force-dynamic";

const FIRST_BY_KEY = new Map(FIRSTS.map((f) => [f.key, f]));

export default async function BookPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const t = translator((await getShellPrefs(supabase, user.id)).lang);
  const children = await getChildren(supabase, membership.household_id);
  const child = children[0];
  if (!child) redirect("/children/new");

  const all = await getEntriesForChild(supabase, membership.household_id, child.id);
  // A book is made to print and gift, so private entries are left out.
  const visible = all.filter((e) => !e.is_private);
  const years = Array.from(new Set(visible.map((e) => e.event_date.slice(0, 4)))).sort().reverse();

  const sp = await searchParams;
  const selected = sp.year && (sp.year === "all" || years.includes(sp.year)) ? sp.year : (years[0] ?? "all");

  const inPeriod = selected === "all" ? visible : visible.filter((e) => e.event_date.slice(0, 4) === selected);
  // Oldest → newest reads better as a book.
  const ordered = [...inPeriod].sort((a, b) =>
    a.event_date < b.event_date ? -1 : a.event_date > b.event_date ? 1 : a.created_at < b.created_at ? -1 : 1,
  );

  const media = await getMediaForEntries(supabase, ordered.map((e) => e.id));
  const mediaByEntry = await signMediaByEntry(supabase, media, 7200);
  const authors = await getMemberProfiles(supabase, membership.household_id);
  const highlighted = new Set(await getHighlightedEntryIds(supabase, ordered.map((e) => e.id)));
  const milestones = await getMilestones(supabase, child.id);
  const periodMs = milestones.filter(
    (m) => m.achieved_on && (selected === "all" || m.achieved_on.slice(0, 4) === selected),
  );

  // Cover image: the child's cover, else the first photo in the period.
  let coverUrl: string | null = null;
  if (child.cover_key) {
    const { data } = await supabase.storage.from("media").createSignedUrl(child.cover_key, 7200);
    coverUrl = data?.signedUrl ?? null;
  }
  if (!coverUrl) {
    for (const e of ordered) {
      const p = (mediaByEntry[e.id] ?? []).find((m) => m.kind === "image");
      if (p) {
        coverUrl = p.url;
        break;
      }
    }
  }

  const photoCount = ordered.reduce((n, e) => n + (mediaByEntry[e.id] ?? []).filter((m) => m.kind === "image").length, 0);
  const lastDate = ordered.length ? ordered[ordered.length - 1]!.event_date : null;
  const ageAtEnd = lastDate ? ageLabel(child.birth_date, lastDate) : "";
  const periodLabel = selected === "all" ? t("book.all_time") : selected;

  // Group memories by month for gentle section breaks.
  const groups: { key: string; label: string; entries: Entry[] }[] = [];
  for (const e of ordered) {
    const key = monthKey(e.event_date);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: monthLabel(e.event_date), entries: [] };
      groups.push(g);
    }
    g.entries.push(e);
  }

  const fallbackAuthor = { name: t("book.a_parent"), color: "#8a8a8a" };

  return (
    <>
      <BookControls years={years} selected={selected} />

      <main className="book">
        {/* cover */}
        <section className="bookcover" style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}>
          <div className="bookcover-in">
            <p className="bookcover-eyebrow">{t("book.cover_eyebrow")}</p>
            <h1 className="bookcover-title">{child.name}</h1>
            <p className="bookcover-period">{periodLabel}</p>
          </div>
        </section>

        {/* at a glance */}
        <section className="booksection bookstats">
          <h2 className="bookhead">{t("book.glance")}</h2>
          <div className="statgrid">
            <div className="bstat"><b>{ordered.length}</b><span>{t("book.stat_memories")}</span></div>
            <div className="bstat"><b>{photoCount}</b><span>{t("book.stat_photos")}</span></div>
            <div className="bstat"><b>{periodMs.length}</b><span>{t("book.stat_milestones")}</span></div>
            {ageAtEnd ? <div className="bstat"><b>{ageAtEnd}</b><span>{t("book.stat_age")}</span></div> : null}
          </div>
        </section>

        {/* firsts & milestones */}
        {periodMs.length > 0 ? (
          <section className="booksection">
            <h2 className="bookhead">{t("book.firsts")}</h2>
            <ul className="bookfirsts">
              {periodMs.map((m) => {
                const def = FIRST_BY_KEY.get(m.key);
                const name = def ? t(def.label as MsgKey) : m.title;
                return (
                  <li key={m.id} className="bookfirst">
                    <span className="bf-emoji" aria-hidden>{def?.emoji ?? "⭐"}</span>
                    <span className="bf-name">{name}</span>
                    {m.achieved_on ? <span className="bf-date">{fmtDate(m.achieved_on)}</span> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* the memories */}
        {ordered.length === 0 ? (
          <section className="booksection">
            <p className="muted">{t("book.empty")}</p>
          </section>
        ) : (
          <section className="booksection">
            <h2 className="bookhead">{t("book.memories")}</h2>
            {groups.map((g) => (
              <div key={g.key} className="bookmonthwrap">
                <h3 className="bookmonth">{g.label}</h3>
                {g.entries.map((e) => {
                  const author = authors[e.author_id] ?? fallbackAuthor;
                  const photos = (mediaByEntry[e.id] ?? []).filter((m) => m.kind === "image").slice(0, 4);
                  return (
                    <article key={e.id} className="memory">
                      <div className="mem-meta">
                        {highlighted.has(e.id) ? <span className="mem-star" aria-hidden>★</span> : null}
                        <span className="mem-date">{fmtDate(e.event_date)}</span>
                        <span className="mem-age">{ageLabel(child.birth_date, e.event_date)}</span>
                        <span className="mem-author" style={{ color: author.color }}>· {author.name}</span>
                      </div>
                      {e.title ? <h4 className="mem-title">{e.title}</h4> : null}
                      {photos.length > 0 ? (
                        <div className={"mem-photos n" + photos.length}>
                          {photos.map((p, i) => (
                            <img key={i} src={p.url} alt="" />
                          ))}
                        </div>
                      ) : null}
                      {e.body ? <p className="mem-body">{e.body}</p> : null}
                    </article>
                  );
                })}
              </div>
            ))}
          </section>
        )}

        <section className="bookclose">
          <p>{t("book.closing", { name: child.name })}</p>
        </section>
      </main>
    </>
  );
}
