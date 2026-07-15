import "server-only";
import sharp from "sharp";
import decodeHeic from "heic-decode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// v3 — HEIC test

// TEMPORARY diagnostic. Auth-gated; reports whether the HEIC decode path works
// on the deployment. Remove once previews are confirmed working.
export async function GET() {
  const diag: Record<string, unknown> = {};
  try {
    diag.hasServiceRole = hasServiceRole();
    const user = await getUser();
    diag.authed = Boolean(user);
    if (!user) return json(diag);

    const supabase = await createClient();
    // List images + their mime types so we can see how many are HEIC.
    const { data: rows } = await supabase
      .from("media")
      .select("id, storage_key, mime")
      .eq("kind", "image")
      .is("deleted_at", null)
      .limit(200);
    const imgs = (rows as { id: string; storage_key: string; mime: string | null }[] | null) ?? [];
    diag.imageCount = imgs.length;
    const byMime: Record<string, number> = {};
    for (const r of imgs) byMime[(r.mime || "unknown").toLowerCase()] = (byMime[(r.mime || "unknown").toLowerCase()] ?? 0) + 1;
    diag.mimeCounts = byMime;

    // Pick a NON-jpeg image (most likely HEIC) to exercise the hard path.
    const heic = imgs.find((r) => !/jpe?g/i.test(r.mime || "")) ?? null;
    diag.foundNonJpeg = Boolean(heic);
    if (!heic) return json(diag);
    diag.testMime = heic.mime;
    diag.testPreviewUrl = `/media/${heic.id}/preview?w=512`;

    const admin = createAdminClient();
    const { data: blob, error: dlErr } = await admin.storage.from("media").download(heic.storage_key);
    diag.downloadError = dlErr?.message ?? null;
    if (!blob) return json(diag);
    const buf = Buffer.from(await blob.arrayBuffer());
    diag.downloadBytes = buf.length;
    diag.magicHex = buf.subarray(0, 4).toString("hex");
    diag.ftypBrand = buf.length >= 12 ? buf.subarray(4, 12).toString("latin1") : "";

    // Path A: sharp directly (does this libvips read HEIC?).
    try {
      const out = await sharp(buf).rotate().resize(512, 512, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
      const st = await sharp(out).stats();
      diag.sharpDirect = { ok: true, bytes: out.length, stdev: st.channels.map((c) => Math.round(c.stdev)) };
    } catch (e) {
      diag.sharpDirect = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    // Path B: libheif (WASM) → raw RGBA → sharp (the fallback our route uses).
    try {
      const { width, height, data } = await decodeHeic({ buffer: buf });
      const raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      const out = await sharp(raw, { raw: { width, height, channels: 4 } }).resize(512, 512, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
      const st = await sharp(out).stats();
      diag.heicDecode = { ok: true, srcWH: `${width}x${height}`, bytes: out.length, stdev: st.channels.map((c) => Math.round(c.stdev)) };
    } catch (e) {
      diag.heicDecode = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    return json(diag);
  } catch (e) {
    diag.fatal = e instanceof Error ? e.message : String(e);
    return json(diag);
  }
}

function json(o: Record<string, unknown>): Response {
  return new Response(JSON.stringify(o, null, 2), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
