"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";
import type { SignedMedia } from "@/lib/data";

// The media grid for one entry. Images and videos open in a fullscreen
// lightbox (and can be browsed through); audio stays an inline player.
export default function EntryMedia({ media }: { media: SignedMedia[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const viewable = media.filter((m) => m.kind === "image" || m.kind === "video");

  return (
    <>
      <div className="mediagrid">
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
