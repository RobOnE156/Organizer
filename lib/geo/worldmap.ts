// Offline world map: resolve a lat/lng to its country and render a stylized
// SVG basemap — all from a bundled public-domain countries GeoJSON, with no
// external calls. Server-only (the ~250 KB dataset never ships to the client;
// only the rendered SVG paths do).

import world from "./countries.geo.json";

type Position = [number, number];
type PolygonCoords = Position[][]; // [outerRing, ...holes]
type Geometry =
  | { type: "Polygon"; coordinates: PolygonCoords }
  | { type: "MultiPolygon"; coordinates: PolygonCoords[] };
type Feature = { id: string; properties: { name: string }; geometry: Geometry };

const features = (world as unknown as { features: Feature[] }).features;

function polygonsOf(geom: Geometry): PolygonCoords[] {
  return geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
}

// Per-feature bounding box for a fast reject before the ray-cast.
type BBox = { minX: number; minY: number; maxX: number; maxY: number };
const bboxes: BBox[] = features.map((f) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polygonsOf(f.geometry)) {
    for (const pt of poly[0] ?? []) {
      const x = pt[0];
      const y = pt[1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
});

function inRing(x: number, y: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const xi = a[0];
    const yi = a[1];
    const xj = b[0];
    const yj = b[1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function inPolygon(x: number, y: number, poly: PolygonCoords): boolean {
  if (!inRing(x, y, poly[0]!)) return false;
  for (let h = 1; h < poly.length; h++) {
    if (inRing(x, y, poly[h]!)) return false; // inside a hole
  }
  return true;
}

export type Country = { id: string; name: string };

// Country containing (lng, lat), or null (open sea / unmatched coastal point).
export function countryOfPoint(lng: number, lat: number): Country | null {
  for (let i = 0; i < features.length; i++) {
    const b = bboxes[i]!;
    if (lng < b.minX || lng > b.maxX || lat < b.minY || lat > b.maxY) continue;
    const f = features[i]!;
    for (const poly of polygonsOf(f.geometry)) {
      if (inPolygon(lng, lat, poly)) return { id: f.id, name: f.properties.name };
    }
  }
  return null;
}

export const MAP_W = 1000;
export const MAP_H = 500;
const projX = (lng: number): number => ((lng + 180) / 360) * MAP_W;
const projY = (lat: number): number => ((90 - lat) / 180) * MAP_H;

function pathOf(geom: Geometry): string {
  let d = "";
  for (const poly of polygonsOf(geom)) {
    for (const ring of poly) {
      for (let k = 0; k < ring.length; k++) {
        const pt = ring[k]!;
        d += (k === 0 ? "M" : "L") + projX(pt[0]).toFixed(1) + " " + projY(pt[1]).toFixed(1);
      }
      d += "Z";
    }
  }
  return d;
}

export type CountryPath = { id: string; name: string; d: string };

let cachedPaths: CountryPath[] | null = null;
export function countryPaths(): CountryPath[] {
  if (!cachedPaths) {
    cachedPaths = features.map((f) => ({ id: f.id, name: f.properties.name, d: pathOf(f.geometry) }));
  }
  return cachedPaths;
}

export function projectPoint(lng: number, lat: number): { x: number; y: number } {
  return { x: projX(lng), y: projY(lat) };
}
