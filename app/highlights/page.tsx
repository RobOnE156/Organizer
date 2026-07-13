import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getChildren,
  getEntriesForChild,
  getHighlightedEntryIds,
  getMediaForEntries,
  signMediaByEntry,
} from "@/lib/data";
import { ageLabel, fmtDate } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export default async function HighlightsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await enforceSecondFactor();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");

  const supabase = await createClient();
  const children = await getChildren(supabase, membership.household_id);
  const child = children[0];
  if (!child) redirect("/children/new");

  const entries = await getEntriesForChild(supabase, membership.household_id, child.id);
  const highlightedIds = new Set(await getHighlightedEntryIds(supabase, entries.map((e) => e.id)));
  const highlights = entries.filter((e) => highlightedIds.has(e.id)); // newest-first from the query
  const media = await getMediaForEntries(supabase, highlights.map((e) => e.id));
  const mediaByEntry = await signMediaByEntry(supabase, media);

  return (
    <main className="page">
      <p className="eyebrow">Rückblick</p>
      <h1 className="title">★ {child.name}s Höhepunkte</h1>
      <p className="sub">
        Die schönsten Erinnerungen an einem Ort. Tippe im Tagebuch bei einer Erinnerung auf den
        Stern (☆), um sie hier zu sammeln — beide Elternteile pflegen den Rückblick gemeinsam.
      </p>

      {highlights.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <p>Noch keine Höhepunkte markiert.</p>
          <p className="muted">
            Öffne das <a href="/">Tagebuch</a> und tippe bei einer besonderen Erinnerung oben rechts
            auf den Stern.
          </p>
        </div>
      ) : (
        <section className="hlgrid">
          {highlights.map((e) => {
            const thumb = (mediaByEntry[e.id] ?? []).find((m) => m.kind === "image")?.url;
            const label = e.title || (e.body ? e.body.slice(0, 80) : "Erinnerung");
            const age = ageLabel(child.birth_date, e.event_date);
            return (
              <a
                key={e.id}
                className={"hlcard" + (thumb ? "" : " noimg")}
                href={`/#entry-${e.id}`}
                style={thumb ? { backgroundImage: `url("${thumb}")` } : undefined}
              >
                <div className="hlgrad">
                  <b className="hltitle">{label}</b>
                  <span className="hlmeta">
                    {fmtDate(e.event_date)}
                    {age ? ` · ${age}` : ""}
                  </span>
                </div>
              </a>
            );
          })}
        </section>
      )}

      <p style={{ marginTop: 24 }}>
        <a href="/">← Zurück zum Tagebuch</a>
      </p>
    </main>
  );
}
