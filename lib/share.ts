import "server-only";
import crypto from "node:crypto";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { stripJpegExif } from "@/lib/jpeg-strip";
import {
  getMediaForEntries,
  getMemberProfiles,
  type Entry,
  type SignedMedia,
  type MemberProfile,
} from "@/lib/data";

// SERVER-ONLY. Resolves a read-only share token into the sanitised data a
// grandparent / family viewer is allowed to see. Uses the service-role admin
// client (an anonymous viewer has no session) but gates everything on the
// token: only the matching household's NON-PRIVATE, non-deleted entries are
// returned, and precise location (GPS + place) is stripped before it ever
// leaves the server — the diary's own map keeps the location; an outward share
// never does.

export type ShareViewReason = "ok" | "invalid" | "expired" | "revoked" | "unavailable" | "unconfigured";

export type ShareView = {
  ok: boolean;
  reason: ShareViewReason;
  scope: "timeline" | "entry";
  language: string;
  label: string | null;
  childName: string | null;
  birthDate: string | null;
  entries: Entry[];
  mediaByEntry: Record<string, SignedMedia[]>;
  // Count of non-image media (video/audio) per entry. These are NOT served
  // through a share (their container can embed GPS we can't strip here), so the
  // view shows a "view in the diary" placeholder instead.
  otherCountByEntry: Record<string, number>;
  authors: Record<string, MemberProfile>;
};

function sha256hex(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function empty(reason: ShareViewReason, over: Partial<ShareView> = {}): ShareView {
  return {
    ok: false,
    reason,
    scope: "timeline",
    language: "de",
    label: null,
    childName: null,
    birthDate: null,
    entries: [],
    mediaByEntry: {},
    otherCountByEntry: {},
    authors: {},
    ...over,
  };
}

export async function getShareView(token: string | undefined | null): Promise<ShareView> {
  if (!token) return empty("invalid");
  if (!hasServiceRole()) return empty("unconfigured");
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return empty("unconfigured");
  }

  const { data: linkRow } = await admin
    .from("share_links")
    .select("id, household_id, scope, entry_id, child_id, label, language, expires_at, revoked_at")
    .eq("token_hash", sha256hex(token))
    .maybeSingle();
  const link = linkRow as {
    id: string;
    household_id: string;
    scope: "timeline" | "entry";
    entry_id: string | null;
    child_id: string | null;
    label: string | null;
    language: string;
    expires_at: string | null;
    revoked_at: string | null;
  } | null;

  if (!link) return empty("invalid");
  const meta = { language: link.language, label: link.label, scope: link.scope };
  if (link.revoked_at) return empty("revoked", meta);
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return empty("expired", meta);

  // Child name + birth date (for age labels). Prefer the link's child; else the
  // household's first child.
  let childName: string | null = null;
  let birthDate: string | null = null;
  {
    const { data: kids } = await admin
      .from("children")
      .select("id, name, birth_date")
      .eq("household_id", link.household_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    const list = (kids as { id: string; name: string; birth_date: string | null }[] | null) ?? [];
    const chosen = (link.child_id && list.find((k) => k.id === link.child_id)) || list[0];
    if (chosen) {
      childName = chosen.name;
      birthDate = chosen.birth_date;
    }
  }

  // Non-private, non-deleted entries. timeline = all; entry = the one shared.
  let eq = admin
    .from("entries")
    .select("id, author_id, kind, title, body, event_date, is_private, place_name, link, lat, lng, created_at")
    .eq("household_id", link.household_id)
    .eq("is_private", false)
    .is("deleted_at", null);
  if (link.scope === "entry") eq = eq.eq("id", link.entry_id ?? "");
  const { data: entRows } = await eq
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false });
  const rawEntries = (entRows as unknown as Entry[] | null) ?? [];

  if (link.scope === "entry" && rawEntries.length === 0) {
    // the shared memory was deleted or made private since the link was made
    return empty("unavailable", { ...meta, childName, birthDate });
  }

  // Strip location — never leak GPS or place through an outward share.
  const entries: Entry[] = rawEntries.map((e) => ({ ...e, lat: null, lng: null, place_name: null }));

  const ids = entries.map((e) => e.id);
  const media = await getMediaForEntries(admin, ids);
  // Photos are served through a proxy that strips EXIF. Videos/audio are served
  // (signed URL) only when they were positively scrubbed of location at upload
  // (location_clean); anything not verifiably clean is only counted and shown
  // as a "view in the diary" placeholder. `key` is left empty on purpose: it
  // would otherwise disclose the household/entry UUIDs and original filename to
  // an anonymous viewer via the client component.
  const servableNonImages = media.filter((m) => m.kind !== "image" && m.location_clean);
  const signedByKey = new Map<string, string>();
  if (servableNonImages.length > 0) {
    // Sign the video/audio files and their posters (posters are canvas-made
    // JPEGs with no EXIF, so they are safe to serve directly).
    const keys: string[] = [];
    for (const m of servableNonImages) {
      keys.push(m.storage_key);
      if (m.poster_key) keys.push(m.poster_key);
    }
    const { data: signed } = await admin.storage.from("media").createSignedUrls(keys, 3600);
    for (const s of signed ?? []) if (s.signedUrl && s.path) signedByKey.set(s.path, s.signedUrl);
  }
  const mediaByEntry: Record<string, SignedMedia[]> = {};
  const otherCountByEntry: Record<string, number> = {};
  for (const m of media) {
    if (m.kind === "image") {
      (mediaByEntry[m.entry_id] ??= []).push({
        kind: "image",
        url: `/share/${encodeURIComponent(token)}/m?id=${m.id}`,
        key: "",
      });
    } else if (m.location_clean && signedByKey.has(m.storage_key)) {
      const poster = m.poster_key ? signedByKey.get(m.poster_key) : undefined;
      (mediaByEntry[m.entry_id] ??= []).push({ kind: m.kind, url: signedByKey.get(m.storage_key)!, key: "", poster });
    } else {
      otherCountByEntry[m.entry_id] = (otherCountByEntry[m.entry_id] ?? 0) + 1;
    }
  }
  const authors = await getMemberProfiles(admin, link.household_id);

  // best-effort "last viewed" stamp — never block the view on it
  try {
    await admin.from("share_links").update({ last_viewed_at: new Date().toISOString() }).eq("id", link.id);
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    reason: "ok",
    scope: link.scope,
    language: link.language,
    label: link.label,
    childName,
    birthDate,
    entries,
    mediaByEntry,
    otherCountByEntry,
    authors,
  };
}

// Serve a single shared photo with its EXIF (incl. GPS) stripped. Gated on the
// same token: the media must belong to a NON-PRIVATE, non-deleted entry in the
// link's household (and, for an entry-scoped link, the shared entry). Returns
// null — a plain 404 — for anything that doesn't check out.
export async function getShareMedia(
  token: string | undefined | null,
  mediaId: string | undefined | null,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  if (!token || !mediaId) return null;
  if (!hasServiceRole()) return null;
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const { data: linkRow } = await admin
    .from("share_links")
    .select("household_id, scope, entry_id, revoked_at, expires_at")
    .eq("token_hash", sha256hex(token))
    .maybeSingle();
  const link = linkRow as {
    household_id: string;
    scope: "timeline" | "entry";
    entry_id: string | null;
    revoked_at: string | null;
    expires_at: string | null;
  } | null;
  if (!link || link.revoked_at) return null;
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return null;

  const { data: mRow } = await admin
    .from("media")
    .select("entry_id, storage_key, mime, kind")
    .eq("id", mediaId)
    .is("deleted_at", null)
    .maybeSingle();
  const m = mRow as { entry_id: string; storage_key: string; mime: string | null; kind: string } | null;
  if (!m || m.kind !== "image") return null;
  if (link.scope === "entry" && m.entry_id !== link.entry_id) return null;

  const { data: eRow } = await admin
    .from("entries")
    .select("household_id, is_private, deleted_at")
    .eq("id", m.entry_id)
    .maybeSingle();
  const e = eRow as { household_id: string; is_private: boolean; deleted_at: string | null } | null;
  if (!e || e.household_id !== link.household_id || e.is_private || e.deleted_at) return null;

  // Only serve images we can positively scrub. JPEGs get EXIF stripped; if the
  // stripper can't fully parse the file, or it's a non-JPEG we can't strip
  // (HEIC/PNG/WebP may still carry GPS), we refuse (404) rather than leak.
  const mime = (m.mime || "").toLowerCase();
  if (!/jpe?g/.test(mime)) return null;
  const { data: blob, error } = await admin.storage.from("media").download(m.storage_key);
  if (error || !blob) return null;
  const raw = new Uint8Array(await blob.arrayBuffer());
  const bytes = stripJpegExif(raw);
  if (!bytes) return null;
  return { bytes, mime: "image/jpeg" };
}
