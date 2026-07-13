import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  ensureProfile,
  getChildren,
  getCommentsForEntries,
  getEntriesForChild,
  getHighlightedEntryIds,
  getMediaForEntries,
  getMemberProfiles,
  getReactionsForComments,
  getReactionsForEntries,
  signMediaByEntry,
  type Comment,
  type CommentReaction,
  type Entry,
  type MemberProfile,
  type Reaction,
  type SignedMedia,
} from "@/lib/data";
import { ageLabel, fmtDate, initial, monthKey, monthLabel } from "@/lib/timeline";
import { signOut } from "@/app/auth-actions";
import EntryMenu from "@/app/EntryMenu";
import EntryMedia from "@/app/EntryMedia";
import EntryComments from "@/app/EntryComments";
import ReactionBar from "@/app/ReactionBar";
import HighlightStar from "@/app/HighlightStar";
import ChildHero from "@/app/ChildHero";
import RefreshOnFocus from "@/app/RefreshOnFocus";

export const dynamic = "force-dynamic";

function TopBar({ childName }: { childName?: string }) {
  return (
    <header className="topbar">
      <div className="brand">
        {childName ?? "Benni-Tagebuch"}
        <small>Tagebuch</small>
      </div>
      <nav className="topnav">
        <a className="iconlink" href="/growth">Über {childName ?? "Kind"}</a>
        <a className="iconlink" href="/highlights">★ Rückblick</a>
        <a className="iconlink" href="/map">🗺️ Karte</a>
        <a className="iconlink" href="/search">🔍 Suche</a>
        <a className="iconlink" href="/settings/household">Haushalt</a>
        <a className="iconlink" href="/settings/security">2FA</a>
        <a className="iconlink" href="/export">Export</a>
        <form action={signOut}>
          <button className="iconlink" style={{ background: "none", border: 0, cursor: "pointer" }}>Abmelden</button>
        </form>
      </nav>
    </header>
  );
}

function EntryCard({
  entry,
  author,
  media,
  isOwn,
  comments,
  authors,
  userId,
  householdId,
  linkThumb,
  reactions,
  commentReactions,
  isHighlight,
}: {
  entry: Entry;
  author: MemberProfile;
  media: SignedMedia[];
  isOwn: boolean;
  comments: Comment[];
  authors: Record<string, MemberProfile>;
  userId: string;
  householdId: string;
  linkThumb?: string;
  reactions: Reaction[];
  commentReactions: CommentReaction[];
  isHighlight: boolean;
}) {
  return (
    <article id={`entry-${entry.id}`} className="entry">
      <div className="meta">
        <span className="ava" style={{ background: author.color }}>{initial(author.name)}</span>
        <span className="nm">{author.name}</span>
        {entry.is_private ? <span className="privbadge">🔒 Privat</span> : null}
        <span className="when">{fmtDate(entry.event_date)}</span>
        <HighlightStar entryId={entry.id} householdId={householdId} initial={isHighlight} />
        {isOwn ? <EntryMenu entryId={entry.id} /> : null}
      </div>
      {entry.title ? <h3>{entry.title}</h3> : null}
      {entry.place_name ? <p className="place">📍 {entry.place_name}</p> : null}
      {media.length > 0 ? <EntryMedia media={media} /> : null}
      {entry.body ? <p className="body">{entry.body}</p> : null}
      {entry.link ? (
        <a className="linkcard" href={entry.link.url} target="_blank" rel="noreferrer noopener nofollow">
          {linkThumb ? <img className="linkthumb" src={linkThumb} alt="" /> : null}
          <div className="linkbody">
            {entry.link.provider ? <span className="linkprovider">{entry.link.provider}</span> : null}
            <b className="linktitle">{entry.link.title ?? entry.link.url}</b>
            {entry.link.description ? <p className="linkdesc">{entry.link.description}</p> : null}
          </div>
        </a>
      ) : null}
      <ReactionBar targetType="entry" targetId={entry.id} householdId={householdId} initial={reactions} userId={userId} />
      <EntryComments
        entryId={entry.id}
        householdId={householdId}
        initialComments={comments}
        authors={authors}
        userId={userId}
        commentReactions={commentReactions}
      />
    </article>
  );
}

export default async function Home() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="page">
        <p className="eyebrow">Fundament</p>
        <h1 className="title">Benni-Tagebuch</h1>
        <p className="sub">
          Supabase ist noch nicht konfiguriert. Lege eine <code>.env.local</code> an
          (siehe <code>.env.example</code>) und starte den Dev-Server neu.
        </p>
      </main>
    );
  }

  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  await ensureProfile(supabase, user.id, user.email ?? undefined);
  const children = await getChildren(supabase, membership.household_id);
  const child = children[0];

  if (!child) {
    return (
      <>
        <TopBar />
        <main className="tl">
          <div className="empty">
            <h2 style={{ marginBottom: 8 }}>Willkommen! 👶</h2>
            <p>Lege zuerst ein Kind an, um Erinnerungen festzuhalten.</p>
            <p style={{ marginTop: 16 }}>
              <a className="btn btn-primary" href="/children/new">Kind anlegen</a>
            </p>
          </div>
        </main>
      </>
    );
  }

  const entries = await getEntriesForChild(supabase, membership.household_id, child.id);
  const authors = await getMemberProfiles(supabase, membership.household_id);
  const media = await getMediaForEntries(supabase, entries.map((e) => e.id));
  const mediaByEntry = await signMediaByEntry(supabase, media);
  const comments = await getCommentsForEntries(supabase, entries.map((e) => e.id));
  const commentsByEntry: Record<string, Comment[]> = {};
  for (const c of comments) (commentsByEntry[c.entry_id] ??= []).push(c);
  const reactions = await getReactionsForEntries(supabase, entries.map((e) => e.id));
  const reactionsByEntry: Record<string, Reaction[]> = {};
  for (const r of reactions) (reactionsByEntry[r.entry_id] ??= []).push(r);
  const commentReactions = await getReactionsForComments(supabase, comments.map((c) => c.id));
  // group comment reactions by the entry their comment belongs to, so each
  // EntryCard gets just the ones it needs.
  const commentToEntry = new Map(comments.map((c) => [c.id, c.entry_id]));
  const commentReactionsByEntry: Record<string, CommentReaction[]> = {};
  for (const r of commentReactions) {
    const entryId = commentToEntry.get(r.comment_id);
    if (entryId) (commentReactionsByEntry[entryId] ??= []).push(r);
  }
  const highlightedIds = new Set(await getHighlightedEntryIds(supabase, entries.map((e) => e.id)));
  const fallbackAuthor: MemberProfile = { name: "Elternteil", color: "#8a8a8a" };

  const today = new Date().toISOString().slice(0, 10);
  const age = ageLabel(child.birth_date, today);
  const birthLabel = child.birth_date ? fmtDate(child.birth_date) : null;
  let coverUrl: string | null = null;
  if (child.cover_key) {
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(child.cover_key, 3600);
    coverUrl = signed?.signedUrl ?? null;
  }

  // Sign the self-hosted link-preview thumbnails.
  const linkKeys = entries.map((e) => e.link?.thumbnail_key).filter((k): k is string => Boolean(k));
  const linkThumbByEntry: Record<string, string> = {};
  if (linkKeys.length > 0) {
    const { data: linkSigned } = await supabase.storage.from("media").createSignedUrls(linkKeys, 3600);
    const byKey = new Map<string, string>();
    for (const s of linkSigned ?? []) if (s.signedUrl && s.path) byKey.set(s.path, s.signedUrl);
    for (const e of entries) {
      const k = e.link?.thumbnail_key;
      if (k) {
        const u = byKey.get(k);
        if (u) linkThumbByEntry[e.id] = u;
      }
    }
  }

  // Group entries by calendar month (already sorted newest-first).
  const groups: { key: string; label: string; sub: string; entries: Entry[] }[] = [];
  for (const e of entries) {
    const key = monthKey(e.event_date);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: monthLabel(e.event_date), sub: ageLabel(child.birth_date, e.event_date), entries: [] };
      groups.push(group);
    }
    group.entries.push(e);
  }

  // "An diesem Tag": entries from the same calendar day in previous years.
  const onThisDay = entries.filter(
    (e) => e.event_date.slice(5, 10) === today.slice(5, 10) && e.event_date.slice(0, 4) < today.slice(0, 4),
  );

  return (
    <>
      <RefreshOnFocus />
      <TopBar childName={child.name} />
      <main className="tl">
        <ChildHero
          childId={child.id}
          householdId={membership.household_id}
          name={child.name}
          age={age}
          birthLabel={birthLabel}
          coverUrl={coverUrl}
          coverKey={child.cover_key}
        />
        {onThisDay.length > 0 ? (
          <section className="otd">
            <h2 className="otdhead">✨ An diesem Tag</h2>
            <div className="otdrow">
              {onThisDay.map((e) => {
                const years = Number(today.slice(0, 4)) - Number(e.event_date.slice(0, 4));
                const thumb = (mediaByEntry[e.id] ?? []).find((m) => m.kind === "image")?.url;
                const label = e.title || (e.body ? e.body.slice(0, 70) : "Erinnerung");
                return (
                  <a
                    key={e.id}
                    className="otdcard"
                    href={`#entry-${e.id}`}
                    style={thumb ? { backgroundImage: `url("${thumb}")` } : undefined}
                  >
                    <div className="otdgrad">
                      <span className="otdyears">vor {years} {years === 1 ? "Jahr" : "Jahren"}</span>
                      <b className="otdtitle">{label}</b>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}
        {entries.length === 0 ? (
          <div className="empty">
            <p>Noch keine Erinnerungen für {child.name}.</p>
            <p className="muted">Tippe unten auf „Hinzufügen", um die erste festzuhalten.</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <div className="msep">
                <h2>{group.label}</h2>
                <span>· {child.name}{group.sub ? ` · ${group.sub}` : ""}</span>
              </div>
              {group.entries.map((e) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  author={authors[e.author_id] ?? fallbackAuthor}
                  media={mediaByEntry[e.id] ?? []}
                  isOwn={e.author_id === user.id}
                  comments={commentsByEntry[e.id] ?? []}
                  authors={authors}
                  userId={user.id}
                  householdId={membership.household_id}
                  linkThumb={linkThumbByEntry[e.id]}
                  reactions={reactionsByEntry[e.id] ?? []}
                  commentReactions={commentReactionsByEntry[e.id] ?? []}
                  isHighlight={highlightedIds.has(e.id)}
                />
              ))}
            </section>
          ))
        )}
      </main>
      <a className="fab" href="/new">＋ Hinzufügen</a>
    </>
  );
}
