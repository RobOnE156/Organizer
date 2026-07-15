import "server-only";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// v2 — re-trigger deploy

// TEMPORARY diagnostic for the image-transcode service. Auth-gated; returns
// JSON describing each step (auth → RLS select → storage download → sharp
// transcode) so we can see which one fails on the deployment. Remove once the
// preview route is confirmed working.
export async function GET() {
  const diag: Record<string, unknown> = {};
  try {
    diag.hasServiceRole = hasServiceRole();

    const user = await getUser();
    diag.authed = Boolean(user);
    if (!user) return json(diag);

    const supabase = await createClient();
    const { data: mrow, error: selErr } = await supabase
      .from("media")
      .select("id, storage_key, mime, kind")
      .eq("kind", "image")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    diag.selectError = selErr?.message ?? null;
    const m = mrow as { id: string; storage_key: string; mime: string | null; kind: string } | null;
    diag.foundImageMedia = Boolean(m);
    if (!m) return json(diag);
    diag.mime = m.mime;
    diag.storageKeyLen = (m.storage_key ?? "").length;

    const admin = createAdminClient();
    const { data: blob, error: dlErr } = await admin.storage.from("media").download(m.storage_key);
    diag.downloadError = dlErr?.message ?? null;
    if (!blob) return json(diag);
    const buf = Buffer.from(await blob.arrayBuffer());
    diag.downloadBytes = buf.length;
    diag.magicHex = buf.subarray(0, 4).toString("hex");
    diag.ftypBrand = buf.length >= 12 ? buf.subarray(4, 12).toString("latin1") : "";

    try {
      const meta = await sharp(buf).metadata();
      diag.sharpMeta = { format: meta.format, width: meta.width, height: meta.height, hasAlpha: meta.hasAlpha, space: meta.space };
      const out = await sharp(buf).rotate().resize(512, 512, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();
      diag.transcodeBytes = out.length;
      const st = await sharp(out).stats();
      diag.outStdev = st.channels.map((c) => Math.round(c.stdev));
      diag.outMean = st.channels.map((c) => Math.round(c.mean));
      diag.looksBlank = st.channels.every((c) => c.stdev < 5);
    } catch (e) {
      diag.sharpError = e instanceof Error ? e.message : String(e);
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
