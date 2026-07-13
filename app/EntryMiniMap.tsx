import { miniMap } from "@/lib/geo/worldmap";

// A compact, offline detail map for one entry: the surrounding region with the
// containing country highlighted and a marker at the exact spot. Tapping it
// opens the full world map. Rendered server-side (no client JS, no tiles).
export default function EntryMiniMap({ lat, lng }: { lat: number; lng: number }) {
  const m = miniMap(lng, lat);
  const label = m.country ? `Ort auf der Karte: ${m.country.name}` : "Ort auf der Karte";
  return (
    <a className="entrymap" href="/map" aria-label={label} title={m.country?.name ?? "Ort"}>
      <svg viewBox={m.viewBox} className="emap" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
        {m.paths.map((p) => (
          <path key={p.id} d={p.d} className={m.country && p.id === m.country.id ? "cty on" : "cty"} />
        ))}
        <circle cx={m.marker.x} cy={m.marker.y} r={3.4} className="pinhalo" />
        <circle cx={m.marker.x} cy={m.marker.y} r={1.7} className="pin" />
      </svg>
      {m.country ? <span className="emaploc">📍 {m.country.name}</span> : null}
    </a>
  );
}
