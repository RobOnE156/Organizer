"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/app/LanguageProvider";
import type { SignedMedia } from "@/lib/data";

// Fullscreen media viewer: blurred/darkened backdrop, keyboard + swipe
// navigation across all photos/videos of one entry.
export default function Lightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: SignedMedia[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const { t } = useT();
  const count = items.length;
  const go = useCallback(
    (delta: number) => {
      if (count > 0) onIndex((index + delta + count) % count);
    },
    [index, count, onIndex],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const touch = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    if (t) touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose(); // swipe down closes
  }

  const cur = items[index];
  if (!cur) return null;

  return createPortal(
    <div
      className="lb"
      role="dialog"
      aria-modal="true"
      aria-label={t("lb.view")}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button className="lb-x" type="button" aria-label={t("nav.close")} onClick={onClose}>
        ✕
      </button>
      {count > 1 ? (
        <span className="lb-count" onClick={(e) => e.stopPropagation()}>
          {index + 1} / {count}
        </span>
      ) : null}
      {count > 1 ? (
        <button
          className="lb-nav lb-prev"
          type="button"
          aria-label={t("lb.prev")}
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
        >
          ‹
        </button>
      ) : null}
      <div className="lb-stage" onClick={(e) => e.stopPropagation()}>
        {cur.kind === "video" ? (
          <video src={cur.url} controls playsInline preload="metadata" />
        ) : (
          <img src={cur.url} alt="" />
        )}
      </div>
      {count > 1 ? (
        <button
          className="lb-nav lb-next"
          type="button"
          aria-label={t("lb.next")}
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
        >
          ›
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
