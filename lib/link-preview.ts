// Server-only link preview fetcher with SSRF protection. Used to turn a pasted
// URL into a static preview card (Spotify/YouTube via oEmbed, others via Open
// Graph). Never import this from client code — it uses node:dns/net.
//
// SSRF defenses: http(s) only; the host must not be localhost/*.local/*.internal
// or resolve to a private/loopback/link-local IP; redirects are followed
// manually and every hop is re-validated; requests time out and bodies are
// capped. Note: this checks DNS at request time, so it is not fully hardened
// against DNS-rebinding — acceptable here (two trusted parents paste their own
// links), but documented.

import { lookup } from "node:dns/promises";
import net from "node:net";

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map((n) => parseInt(n, 10));
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  const l = ip.toLowerCase();
  if (l === "::1" || l === "::") return true;
  if (l.startsWith("fe80") || l.startsWith("fc") || l.startsWith("fd")) return true;
  if (l.startsWith("::ffff:")) {
    const v4 = l.slice(7);
    if (net.isIPv4(v4)) return isPrivateIp(v4);
  }
  return false;
}

export async function assertPublicHost(hostname: string): Promise<void> {
  const low = hostname.toLowerCase().replace(/\.$/, "");
  if (!low || low === "localhost" || low.endsWith(".local") || low.endsWith(".internal") || low.endsWith(".localhost")) {
    throw new Error("blocked host");
  }
  if (net.isIP(low)) {
    if (isPrivateIp(low)) throw new Error("blocked ip");
    return;
  }
  const records = await lookup(low, { all: true });
  if (records.length === 0) throw new Error("no dns");
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error("blocked resolved ip");
  }
}

async function safeFetch(rawUrl: string, accept: string): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop < 4; hop++) {
    const u = new URL(current);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad scheme");
    await assertPublicHost(u.hostname);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": "BenniTagebuch/1.0 (+link-preview)", accept },
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("redirect without location");
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ");
}

export function metaContent(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const wanted = key.toLowerCase();
  for (const tag of tags) {
    const propM = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i);
    if (propM && (propM[1] ?? "").toLowerCase() === wanted) {
      const contentM = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
      if (contentM && contentM[1] != null) {
        const v = decodeEntities(contentM[1]).trim();
        if (v) return v;
      }
    }
  }
  return null;
}

export function htmlTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!m || m[1] == null) return null;
  const v = decodeEntities(m[1]).trim();
  return v || null;
}

export function absolutize(u: string, base: URL): string | null {
  try {
    return new URL(u, base).toString();
  } catch {
    return null;
  }
}

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, 500) : null;
}

function providerFromHost(host: string): string {
  const h = host.replace(/^www\./, "");
  if (host === "open.spotify.com") return "Spotify";
  if (host === "youtu.be" || h === "youtube.com") return "YouTube";
  return h;
}

export function oembedEndpoint(host: string, url: URL): string | null {
  if (host === "open.spotify.com") {
    return "https://open.spotify.com/oembed?url=" + encodeURIComponent(url.toString());
  }
  if (["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
    return "https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url.toString());
  }
  return null;
}

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  provider: string | null;
  thumbnailUrl: string | null;
};

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const provider = providerFromHost(host);
  const bare: LinkPreview = { url: url.toString(), title: null, description: null, provider, thumbnailUrl: null };

  try {
    const oembed = oembedEndpoint(host, url);
    if (oembed) {
      const res = await safeFetch(oembed, "application/json");
      if (res.ok) {
        const j = (await res.json()) as Record<string, unknown>;
        return {
          url: url.toString(),
          title: cleanStr(j.title),
          description: cleanStr(j.author_name),
          provider: cleanStr(j.provider_name) ?? provider,
          thumbnailUrl: cleanStr(j.thumbnail_url),
        };
      }
    }

    const res = await safeFetch(url.toString(), "text/html,application/xhtml+xml");
    const ctype = res.headers.get("content-type") ?? "";
    if (!res.ok || !ctype.includes("html")) return bare;
    if (Number(res.headers.get("content-length") ?? "0") > 3_000_000) return bare;
    const html = (await res.text()).slice(0, 600_000);
    const img = metaContent(html, "og:image") ?? metaContent(html, "twitter:image");
    return {
      url: url.toString(),
      title: metaContent(html, "og:title") ?? htmlTitle(html),
      description: metaContent(html, "og:description") ?? metaContent(html, "description"),
      provider: metaContent(html, "og:site_name") ?? provider,
      thumbnailUrl: img ? absolutize(img, url) : null,
    };
  } catch {
    return bare;
  }
}

// Fetch a preview image (SSRF-checked, size-capped) so we can self-host it and
// avoid a third-party request when the card is later viewed.
export async function fetchImageBytes(rawUrl: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const res = await safeFetch(rawUrl, "image/*");
    if (!res.ok) return null;
    const ctype = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    if (!ctype.startsWith("image/")) return null;
    if (Number(res.headers.get("content-length") ?? "0") > 5_000_000) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 5_000_000) return null;
    return { bytes: buf, contentType: ctype };
  } catch {
    return null;
  }
}
