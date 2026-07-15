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
  // Photos are served through a proxy that strips EXIF (older uploads still
  // carry GPS in the file itself); videos/audio keep direct signed URLs.
  const nonImages = media.filter((m) => m.kind !== "image");
  const urlByKey = new Map<string, string>();
  if (nonImages.length > 0) {
    const { data: signed } = await admin.storage.from("media").createSignedUrls(
      nonImages.map((m) => m.storage_key),
      3600,
    );
    for (const s of signed ?? []) if (s.signedUrl && s.path) urlByKey.set(s.path, s.signedUrl);
  }
  const mediaByEntry: Record<string, SignedMedia[]> = {};
  for (const m of media) {
    const url =
      m.kind === "image"
        ? `/share/${encodeURIComponent(token)}/m?id=${m.id}`
        : urlByKey.get(m.storage_key);
    if (!url) continue;
    (mediaByEntry[m.entry_id] ??= []).push({ kind: m.kind, url, key: m.storage_key });
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

  const { data: blob, error } = await admin.storage.from("media").download(m.storage_key);
  if (error || !blob) return null;
  const raw = new Uint8Array(await blob.arrayBuffer());
  const mime = m.mime || "image/jpeg";
  const bytes = /jpe?g/i.test(mime) ? stripJpegExif(raw) : raw;
  return { bytes, mime };
}
