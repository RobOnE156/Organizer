import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  ensureProfile,
  getChildren,
  getEntriesForChild,
  getMediaForEntries,
  getMemberProfiles,
  signMediaByEntry,
  type Entry,
  type MemberProfile,
  type SignedMedia,
} from "@/lib/data";
import { ageLabel, fmtDate, initial, monthKey, monthLabel } from "@/lib/timeline";
import { signOut } from "@/app/auth-actions";
import EntryMenu from "@/app/EntryMenu";
import EntryMedia from "@/app/EntryMedia";
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
}: {
  entry: Entry;
  author: MemberProfile;
  media: SignedMedia[];
  isOwn: boolean;
}) {
  return (
    <article className="entry">
      <div className="meta">
        <span className="ava" style={{ background: author.color }}>{initial(author.name)}</span>
        <span className="nm">{author.name}</span>
        {entry.is_private ? <span className="privbadge">🔒 Privat</span> : null}
        <span className="when">{fmtDate(entry.event_date)}</span>
        {isOwn ? <EntryMenu entryId={entry.id} /> : null}
      </div>
      {entry.title ? <h3>{entry.title}</h3> : null}
      {entry.place_name ? <p className="place">📍 {entry.place_name}</p> : null}
      {media.length > 0 ? <EntryMedia media={media} /> : null}
      {entry.body ? <p className="body">{entry.body}</p> : null}
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
  const fallbackAuthor: MemberProfile = { name: "Elternteil", color: "#8a8a8a" };

  const today = new Date().toISOString().slice(0, 10);
  const age = ageLabel(child.birth_date, today);
  const birthLabel = child.birth_date ? fmtDate(child.birth_date) : null;
  let coverUrl: string | null = null;
  if (child.cover_key) {
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(child.cover_key, 3600);
    coverUrl = signed?.signedUrl ?? null;
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
