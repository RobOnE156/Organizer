import type { Metadata } from "next";
import { getShareView } from "@/lib/share";
import { hasSupabaseEnv } from "@/lib/env";
import { translator, normalizeLang } from "@/lib/i18n";
import { ageLabel, fmtDate, monthKey, monthLabel } from "@/lib/timeline";
import Avatar from "@/app/Avatar";
import EntryMedia from "@/app/EntryMedia";
import type { Entry, SignedMedia, MemberProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

// A share link must never be indexed — it is a private, revocable view.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function ShareEntry({
  entry,
  author,
  media,
  otherCount,
  t,
}: {
  entry: Entry;
  author: MemberProfile;
  media: SignedMedia[];
  otherCount: number;
  t: ReturnType<typeof translator>;
}) {
  return (
    <article className="entry">
      <div className="meta">
        <Avatar name={author.name} color={author.color} url={author.avatarUrl} />
        <span className="nm">{author.name}</span>
        <span className="when">{fmtDate(entry.event_date)}</span>
      </div>
      {entry.title ? <h3>{entry.title}</h3> : null}
      {media.length > 0 ? <EntryMedia media={media} /> : null}
      {otherCount > 0 ? <p className="sharemedia-note">🎬 {t("share.media_in_diary", { n: otherCount })}</p> : null}
      {entry.body ? <p className="body">{entry.body}</p> : null}
      {entry.link ? (
        <a className="linkcard" href={entry.link.url} target="_blank" rel="noreferrer noopener nofollow">
          <div className="linkbody">
            {entry.link.provider ? <span className="linkprovider">{entry.link.provider}</span> : null}
            <b className="linktitle">{entry.link.title ?? entry.link.url}</b>
            {entry.link.description ? <p className="linkdesc">{entry.link.description}</p> : null}
          </div>
        </a>
      ) : null}
      {/* deliberately no reactions, comments, edit menu, location or map — read-only + privacy */}
    </article>
  );
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = hasSupabaseEnv() ? await getShareView(token) : null;
  const lang = normalizeLang(view?.language ?? "de");
  const t = translator(lang);

  if (!view || !view.ok) {
    const reason = view?.reason ?? "invalid";
    const body =
      reason === "expired"
        ? t("share.dead_expired")
        : reason === "revoked"
          ? t("share.dead_revoked")
          : reason === "unavailable"
            ? t("share.dead_unavailable")
            : reason === "unconfigured"
              ? t("share.dead_unconfigured")
              : t("share.dead_invalid");
    return (
      <main className="authwrap">
        <div className="card stack">
          <p className="eyebrow">{t("share.eyebrow")}</p>
          <h1 className="title">{t("share.dead_title")}</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            {body}
          </p>
        </div>
      </main>
    );
  }

  const name = view.childName ?? t("share.the_child");
  const age = view.birthDate ? ageLabel(view.birthDate, new Date().toISOString().slice(0, 10)) : null;

  // group by month with an age sub-label, exactly like the private timeline
  const groups: { key: string; label: string; sub: string; entries: Entry[] }[] = [];
  for (const e of view.entries) {
    const key = monthKey(e.event_date);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: monthLabel(e.event_date), sub: ageLabel(view.birthDate, e.event_date), entries: [] };
      groups.push(g);
    }
    g.entries.push(e);
  }

  const fallback: MemberProfile = { name: t("share.a_parent"), color: "#8a8a8a" };

  return (
    <main className="tl sharetl">
      <header className="sharehead">
        <p className="eyebrow">{t("share.eyebrow")}</p>
        <h1 className="title">
          {view.scope === "entry" ? t("share.title_memory", { name }) : t("share.title_named", { name })}
        </h1>
        {age ? <p className="sub">{t("share.age", { age })}</p> : null}
        <p className="sharenote">🔒 {t("share.readonly_note")}</p>
      </header>

      {view.entries.length === 0 ? (
        <div className="empty">
          <p>{t("share.empty")}</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            {view.scope === "timeline" ? (
              <div className="msep">
                <h2>{group.label}</h2>
                <span>· {name}{group.sub ? ` · ${group.sub}` : ""}</span>
              </div>
            ) : null}
            {group.entries.map((e) => (
              <ShareEntry
                key={e.id}
                entry={e}
                author={view.authors[e.author_id] ?? fallback}
                media={view.mediaByEntry[e.id] ?? []}
                otherCount={view.otherCountByEntry[e.id] ?? 0}
                t={t}
              />
            ))}
          </section>
        ))
      )}

      <footer className="sharefoot">
        <p className="muted">{t("share.footer")}</p>
      </footer>
    </main>
  );
}
