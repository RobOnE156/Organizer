"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Lightbox from "./Lightbox";
import { createClient } from "@/lib/supabase/client";
import { averageColor } from "@/lib/color";
import type { SignedMedia } from "@/lib/data";

// The media grid for one entry. Images and videos open in a fullscreen
// lightbox (and can be browsed through); audio stays an inline player. The
// card also gets a soft "ambient light" glow in the dominant colour of the
// first photo (extracted client-side from a downloaded copy — no CORS).
export default function EntryMedia({ media }: { media: SignedMedia[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [glow, setGlow] = useState<string | null>(null);
  const viewable = media.filter((m) => m.kind === "image" || m.kind === "video");

  useEffect(() => {
    const first = media.find((m) => m.kind === "image");
    if (!first) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const supabase = createClient();
        const { data: blob } = await supabase.storage.from("media").download(first.key);
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = objectUrl as string;
        });
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 24, 24);
        const color = averageColor(ctx.getImageData(0, 0, 24, 24).data);
        if (color && !cancelled) setGlow(color);
      } catch {
        /* no glow if the image can't be read */
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [media]);

  return (
    <>
      <div
        className={"mediagrid" + (glow ? " glow" : "")}
        style={glow ? ({ "--glow": glow } as CSSProperties) : undefined}
      >
        {media.map((m, i) => {
          if (m.kind === "audio") {
            return <audio key={i} controls preload="metadata" src={m.url} style={{ width: "100%" }} />;
          }
          const vi = viewable.indexOf(m);
          return (
            <button
              key={i}
              type="button"
              className="mediatile"
              aria-label="Vergrößern"
              onClick={() => setOpenIndex(vi)}
            >
              {m.kind === "video" ? (
                <>
                  <video src={m.url} muted playsInline preload="metadata" />
                  <span className="playbadge" aria-hidden>▶</span>
                </>
              ) : (
                <img src={m.url} alt="" loading="lazy" />
              )}
            </button>
          );
        })}
      </div>
      {openIndex !== null ? (
        <Lightbox items={viewable} index={openIndex} onClose={() => setOpenIndex(null)} onIndex={setOpenIndex} />
      ) : null}
    </>
  );
}
