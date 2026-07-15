import { getMediaPreview, type PreviewFit } from "@/lib/media-preview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Authenticated image preview: transcodes any stored photo (HEIC included) to a
// small JPEG so it renders reliably everywhere — the 3D showcase textures, and
// any browser. …/media/<id>/preview?w=512  (add &poster=1 for a video's frame,
// &fit=inside to keep the whole photo instead of a square crop).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = new URL(req.url).searchParams;
  const width = Number(sp.get("w")) || 512;
  const poster = sp.get("poster") === "1";
  const fit: PreviewFit = sp.get("fit") === "inside" ? "inside" : "cover";

  const res = await getMediaPreview(id, { width, poster, fit });
  if (!res) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(res.bytes), {
    status: 200,
    headers: {
      "content-type": "image/jpeg",
      // Content is immutable per (id, w, poster, fit); cache hard in the
      // browser. Private: it is authorised per request, never shared/CDN.
      "cache-control": "private, max-age=31536000, immutable",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}
