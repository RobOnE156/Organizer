import { getShareMedia } from "@/lib/share";

export const dynamic = "force-dynamic";

// EXIF-stripping image proxy for a read-only share link. Photos load through
// here (…/share/<token>/m?id=<mediaId>) so no location metadata leaves the
// server, and the storage URL is never exposed to the viewer.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = new URL(req.url).searchParams.get("id");
  const res = await getShareMedia(token, id);
  if (!res) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(res.bytes), {
    status: 200,
    headers: {
      "content-type": res.mime,
      "cache-control": "private, max-age=3600",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}
