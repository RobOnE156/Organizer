// Read GPS coordinates from a photo's EXIF, entirely in the browser (the
// original File never leaves the device for this). Used when creating/editing
// an entry so the private world map can show where memories happened.
import exifr from "exifr";

export type Gps = { lat: number; lng: number };

// Read GPS from a single image blob/file (e.g. an original downloaded from
// storage during backfill). Never throws — and never hangs: a stubborn HEIC
// that exifr struggles with is capped so it can't stall a save.
export async function gpsFromBlob(blob: Blob): Promise<Gps | null> {
  try {
    const g = await Promise.race([
      exifr.gps(blob),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    if (g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)) {
      return { lat: g.latitude, lng: g.longitude };
    }
  } catch {
    // unreadable / no EXIF — that's fine
  }
  return null;
}

// Return the coordinates of the first selected image that carries GPS EXIF,
// or null if none do. Never throws — unreadable/again-stripped EXIF is normal.
// Scans at most a handful of photos so a big batch can't slow the save.
export async function firstPhotoGps(files: File[]): Promise<Gps | null> {
  let scanned = 0;
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    const g = await gpsFromBlob(f);
    if (g) return g;
    if (++scanned >= 6) break;
  }
  return null;
}
