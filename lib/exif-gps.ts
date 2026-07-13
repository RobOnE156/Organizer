// Read GPS coordinates from a photo's EXIF, entirely in the browser (the
// original File never leaves the device for this). Used when creating/editing
// an entry so the private world map can show where memories happened.
import exifr from "exifr";

export type Gps = { lat: number; lng: number };

// Read GPS from a single image blob/file (e.g. an original downloaded from
// storage during backfill). Never throws.
export async function gpsFromBlob(blob: Blob): Promise<Gps | null> {
  try {
    const g = await exifr.gps(blob);
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
export async function firstPhotoGps(files: File[]): Promise<Gps | null> {
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    const g = await gpsFromBlob(f);
    if (g) return g;
  }
  return null;
}
