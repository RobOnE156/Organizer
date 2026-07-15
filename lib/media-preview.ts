import "server-only";
import sharp, { type Sharp } from "sharp";
import decodeHeic from "heic-decode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

// Server-side image preview/transcode service.
//
// Photos are stored as-uploaded — sometimes HEIC (iOS), which renders in an
// <img> on Apple devices but cannot be drawn into a <canvas>/WebGL texture and
// won't open at all on most non-Apple browsers. This endpoint decodes any
// supported format (HEIC included), crops/resizes it, and always returns a
// small JPEG. So the 3D showcase — and any browser — can show the real image,
// and previews stay small. The private storage key is never exposed.

export type PreviewFit = "cover" | "inside";

const MIN_W = 64;
const MAX_W = 1600;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resizeToJpeg(pipe: Sharp, w: number, fit: PreviewFit): Promise<Buffer> {
  const sized =
    fit === "cover"
      ? pipe.resize(w, w, { fit: "cover", position: "attention" })
      : pipe.resize(w, w, { fit: "inside", withoutEnlargement: true });
  return sized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

async function transcode(input: Buffer, w: number, fit: PreviewFit): Promise<Buffer> {
  try {
    // Fast path: sharp/libvips handles jpeg/png/webp/avif (and HEIC where the
    // build supports it). .rotate() applies EXIF orientation.
    return await resizeToJpeg(sharp(input).rotate(), w, fit);
  } catch {
    // Fallback for HEIC that this libvips can't read: decode via libheif (WASM)
    // to raw RGBA, then hand the pixels to sharp for the resize + JPEG encode.
    const { width, height, data } = await decodeHeic({ buffer: input });
    const raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    return await resizeToJpeg(sharp(raw, { raw: { width, height, channels: 4 } }), w, fit);
  }
}

export async function getMediaPreview(
  id: string,
  opts: { width: number; poster: boolean; fit: PreviewFit },
): Promise<{ bytes: Buffer } | null> {
  if (!UUID_RE.test(id) || !hasServiceRole()) return null;

  // Authorisation: select through the caller's session so RLS returns the row
  // only if they belong to the owning household (and meet any AAL requirement).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // poster_key (migration 0029) may not exist yet on every database; tolerate
  // its absence with a cascading fallback, exactly like getMediaForEntries.
  // Without this, selecting a missing column errors → null → 404 for EVERY
  // preview (which shows up as blank/white discs).
  const runSel = (cols: string) =>
    supabase.from("media").select(cols).eq("id", id).is("deleted_at", null).maybeSingle();
  let res = await runSel("storage_key, poster_key, kind");
  if (res.error) res = await runSel("storage_key, kind");
  const m = res.data as { storage_key: string | null; poster_key?: string | null; kind: string } | null;
  if (!m) return null;

  const key = opts.poster ? m.poster_key ?? null : m.storage_key;
  if (!key) return null;

  // The download itself uses the service-role client (the SSR client can't
  // stream storage objects); access was already proven above via RLS.
  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage.from("media").download(key);
  if (error || !blob) return null;

  const input = Buffer.from(await blob.arrayBuffer());
  const w = Math.min(MAX_W, Math.max(MIN_W, Math.round(opts.width || 512)));
  try {
    const bytes = await transcode(input, w, opts.fit);
    return { bytes };
  } catch {
    return null; // undecodable — caller falls back to a title card
  }
}
