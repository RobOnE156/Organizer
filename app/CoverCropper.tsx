"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const COVER_ASPECT = 2.5; // hero banner ratio (width : height)
const OUT_W = 1600;
const OUT_H = Math.round(OUT_W / COVER_ASPECT); // 640

// Pure geometry: given the image's top-left offset (px, relative to the crop
// frame) and its scale, which source rectangle of the ORIGINAL image fills the
// frame? Exported so it can be tested without a browser.
export function cropRect(frameW: number, frameH: number, scale: number, offsetX: number, offsetY: number) {
  return { sx: -offsetX / scale, sy: -offsetY / scale, sw: frameW / scale, sh: frameH / scale };
}

export default function CoverCropper({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [url] = useState(() => URL.createObjectURL(file));
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [minScale, setMinScale] = useState(1);
  const [maxScale, setMaxScale] = useState(4);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  // load the picked image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  // measure the crop frame once it is laid out
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    setFrame({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  // fit the image to cover the frame, centred
  useEffect(() => {
    if (!nat || frame.w === 0 || frame.h === 0) return;
    const ms = Math.max(frame.w / nat.w, frame.h / nat.h);
    setMinScale(ms);
    setMaxScale(ms * 4);
    setScale(ms);
    setOffset({ x: (frame.w - nat.w * ms) / 2, y: (frame.h - nat.h * ms) / 2 });
  }, [nat, frame]);

  function clamp(o: { x: number; y: number }, s: number) {
    if (!nat) return o;
    const iw = nat.w * s;
    const ih = nat.h * s;
    return {
      x: Math.min(0, Math.max(frame.w - iw, o.x)),
      y: Math.min(0, Math.max(frame.h - ih, o.y)),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }, scale));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  function zoomTo(next: number) {
    if (!nat) return;
    const s = Math.min(maxScale, Math.max(minScale, next));
    // keep the frame centre fixed while zooming
    const cx = frame.w / 2;
    const cy = frame.h / 2;
    const ratio = s / scale;
    const nx = cx - (cx - offset.x) * ratio;
    const ny = cy - (cy - offset.y) * ratio;
    setScale(s);
    setOffset(clamp({ x: nx, y: ny }, s));
  }

  async function confirm() {
    if (!nat || !imgRef.current) return;
    setBusy(true);
    const { sx, sy, sw, sh } = cropRect(frame.w, frame.h, scale, offset.x, offset.y);
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
    canvas.toBlob(
      (blob) => {
        if (blob) onDone(blob);
        else setBusy(false);
      },
      "image/jpeg",
      0.9,
    );
  }

  const step = maxScale > minScale ? (maxScale - minScale) / 100 : 0.01;

  return createPortal(
    <div className="cropwrap" role="dialog" aria-modal="true" aria-label="Titelbild zuschneiden">
      <div className="cropcard">
        <p className="eyebrow" style={{ marginBottom: 8 }}>Titelbild zuschneiden</p>
        <div
          ref={frameRef}
          className="cropframe"
          style={{ aspectRatio: String(COVER_ASPECT) }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => zoomTo(scale * (e.deltaY < 0 ? 1.08 : 0.92))}
        >
          {nat ? (
            <img
              src={url}
              alt=""
              draggable={false}
              style={{ position: "absolute", left: offset.x, top: offset.y, width: nat.w * scale, height: nat.h * scale }}
            />
          ) : (
            <div className="cropload">Lädt …</div>
          )}
          <div className="cropgrid" aria-hidden />
        </div>
        <input
          type="range"
          min={minScale}
          max={maxScale}
          step={step}
          value={scale}
          onChange={(e) => zoomTo(parseFloat(e.target.value))}
          aria-label="Zoom"
          style={{ width: "100%" }}
        />
        <p className="muted" style={{ fontSize: ".78rem", margin: "4px 0 12px" }}>
          Ziehen zum Verschieben · Slider oder Mausrad zum Zoomen
        </p>
        <div className="row">
          <button className="btn btn-primary" onClick={confirm} disabled={busy || !nat}>
            {busy ? "…" : "Übernehmen"}
          </button>
          <button className="btn" onClick={onCancel} disabled={busy}>Abbrechen</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
