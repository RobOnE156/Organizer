import { redirect } from "next/navigation";
import { getUser, getMembership, enforceSecondFactor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getChildren, getShellPrefs } from "@/lib/data";
import { countryOfPoint, countryPaths, MAP_W, MAP_H } from "@/lib/geo/worldmap";
import { translator } from "@/lib/i18n";
import GeoBackfill from "./GeoBackfill";

export const dynamic = "force-dynamic";

type GeoRow = { id: string; lat: number | null; lng: number | null };

export default async function MapPage() {
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

  // Entries that carry GPS (RLS-scoped: a co-parent's private location never
  // surfaces). The lat/lng columns arrive with migration 0015 — if it hasn't
  // run yet the query errors and we simply show the empty state.
  const { data } = await supabase
    .from("entries")
    .select("id, lat, lng")
    .eq("household_id", membership.household_id)
    .is("deleted_at", null)
    .not("lat", "is", null);
  const rows = (data as GeoRow[] | null) ?? [];

  // Resolve each point to a country, offline.
  const counts = new Map<string, { name: string; count: number }>();
  let located = 0;
  for (const r of rows) {
    if (r.lat == null || r.lng == null) continue;
    const c = countryOfPoint(r.lng, r.lat);
    if (!c) continue;
    located += 1;
    const e = counts.get(c.id);
    if (e) e.count += 1;
    else counts.set(c.id, { name: c.name, count: 1 });
  }
  const visited = new Set(counts.keys());
  const list = Array.from(counts.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
  const paths = countryPaths();

  return (
    <main className="page">
      <p className="eyebrow">{t("map.eyebrow")}</p>
      <h1 className="title">{t("map.title", { name: child.name })}</h1>
      <p className="sub">{t("map.sub")}</p>

      {rows.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <p>{t("map.empty")}</p>
          <p className="muted">{t("map.empty_hint")}</p>
        </div>
      ) : (
        <>
          <div className="mapwrap">
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="worldmap" role="img" aria-label={t("map.aria", { n: visited.size })}>
              {paths.map((p) => (
                <path key={p.id} d={p.d} className={visited.has(p.id) ? "cty on" : "cty"}>
                  <title>{p.name}</title>
                </path>
              ))}
            </svg>
          </div>

          <p className="mapcount">
            <b>{visited.size}</b> {visited.size === 1 ? t("map.country_one") : t("map.country_many")}
            {located > 0 ? (
              <span className="muted"> · {located === 1 ? t("map.located_one", { n: located }) : t("map.located_many", { n: located })}</span>
            ) : null}
          </p>

          {list.length > 0 ? (
            <ul className="ctylist">
              {list.map((c) => (
                <li key={c.id}>
                  <b>{c.name}</b>
                  <span>{c.count === 1 ? t("map.memory_one", { n: c.count }) : t("map.memory_many", { n: c.count })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>{t("map.no_country")}</p>
          )}
        </>
      )}

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--faint)" }}>
        <h2 className="shead" style={{ marginTop: 0 }}>{t("map.backfill_title")}</h2>
        <p className="muted" style={{ fontSize: ".88rem", marginTop: 0 }}>{t("map.backfill_sub")}</p>
        <GeoBackfill householdId={membership.household_id} userId={user.id} />
      </div>

      <p style={{ marginTop: 24 }}>
        <a href="/">{t("back.diary")}</a>
      </p>
    </main>
  );
}
