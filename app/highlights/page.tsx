import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getChildren,
  getEntriesForChild,
  getHighlightedEntryIds,
  getMediaForEntries,
  getShellPrefs,
  signMediaByEntry,
} from "@/lib/data";
import { ageLabel, fmtDate } from "@/lib/timeline";
import { translator } from "@/lib/i18n";

import PageHeader from "@/app/PageHeader";
import PageFooter from "@/app/PageFooter";

export const dynamic = "force-dynamic";

export default async function HighlightsPage() {
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

  const entries = await getEntriesForChild(supabase, membership.household_id, child.id);
  const highlightedIds = new Set(await getHighlightedEntryIds(supabase, entries.map((e) => e.id)));
  const highlights = entries.filter((e) => highlightedIds.has(e.id)); // newest-first from the query
  const media = await getMediaForEntries(supabase, highlights.map((e) => e.id));
  const mediaByEntry = await signMediaByEntry(supabase, media);

  return (
    <>
      <PageHeader />
      <main className="page">
      <p className="eyebrow">{t("hl.eyebrow")}</p>
      <h1 className="title">{t("hl.title", { name: child.name })}</h1>
      <p className="sub">{t("hl.sub")}</p>

      {highlights.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <p>{t("hl.empty")}</p>
          <p className="muted">{t("hl.empty_hint")}</p>
        </div>
      ) : (
        <section className="hlgrid">
          {highlights.map((e) => {
            const thumb = (mediaByEntry[e.id] ?? []).find((m) => m.kind === "image")?.url;
            const label = e.title || (e.body ? e.body.slice(0, 80) : t("home.memory"));
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
    </main>
      <PageFooter />
    </>
  );
}
