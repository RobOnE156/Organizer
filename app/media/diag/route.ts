import "server-only";
import sharp from "sharp";
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

    const admin = createAdminClient();
    // Transcode EVERY image (cover 512) and report each output's variance, so
    // we can see which ones come out blank/uniform (the white discs).
    const results = [];
    for (const r of imgs) {
      const row: Record<string, unknown> = { id: r.id.slice(0, 8), mime: r.mime };
      try {
        const { data: blob, error: dlErr } = await admin.storage.from("media").download(r.storage_key);
        if (dlErr || !blob) {
          row.error = "download:" + (dlErr?.message ?? "none");
          results.push(row);
          continue;
        }
        const buf = Buffer.from(await blob.arrayBuffer());
        row.bytes = buf.length;
        row.magic = buf.subarray(0, 4).toString("hex");
        const meta = await sharp(buf).metadata();
        row.wh = `${meta.width}x${meta.height}`;
        const out = await sharp(buf).rotate().resize(512, 512, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();
        const st = await sharp(out).stats();
        row.stdev = st.channels.map((c) => Math.round(c.stdev));
        row.blank = st.channels.every((c) => c.stdev < 5);
      } catch (e) {
        row.transcodeError = e instanceof Error ? e.message : String(e);
      }
      results.push(row);
    }
    diag.perImage = results;
    diag.blankCount = results.filter((r) => r.blank).length;
    diag.errorCount = results.filter((r) => r.error || r.transcodeError).length;

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
