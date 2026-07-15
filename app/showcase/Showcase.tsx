"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import TopNav from "@/app/TopNav";
import type { AppNotification, MemberProfile } from "@/lib/data";

export type ShowcaseNode = {
  id: string;
  title: string;
  eventDate: string;
  dateLabel: string;
  age: string;
  url: string | null;
  isVideo: boolean;
};

type Labels = {
  title: string;
  hint: string;
  to2d: string;
  open: string;
  close: string;
  empty: string;
  reduced: string;
  unsupported: string;
};

const NODES_PER_TURN = 7;
const ANGLE_STEP = (Math.PI * 2) / NODES_PER_TURN;
const Y_STEP = 2.0;
const RADIUS = 6;
const CARD = 2.2;
const SPINE_X = -8.5;
// How far each date guide line reaches from the spine toward (and a little
// into) the helix, so one can read at a glance where a memory sits in time.
const GRID_LEN = 11;
// Every photo/poster preview is downscaled to this square size before it is
// uploaded as a GPU texture, so full-resolution photos can't exhaust the iOS
// texture-memory budget (which shows up as blank white discs).
const PREVIEW_PX = 384;

const MONTH_FMT = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("de-DE", { month: "short" }) : null;
function monthShort(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return MONTH_FMT && !Number.isNaN(d.getTime()) ? MONTH_FMT.format(d) : iso.slice(5, 7);
}

// Build a small in-scene preview for a memory that has no photo/poster (a
// written note, or a video without a captured frame). Instead of a blank
// coloured disc we paint the title (and a type glyph) onto a canvas so the
// content is actually previewable. Kept square; the circle geometry crops it.
function makeLabelTexture(node: ShowcaseNode): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const S = 320;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const g = cv.getContext("2d");
  if (!g) return null;

  // mode: a real note/link (no media), a video (no usable frame), or a photo
  // whose bitmap we couldn't turn into a texture (e.g. an iOS HEIC).
  const mode = node.isVideo ? "video" : node.url ? "photo" : "note";
  const base = mode === "video" ? "#4a4160" : mode === "photo" ? "#3c414d" : "#b98a34";
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  // soft top-light so the disc has depth
  const grad = g.createRadialGradient(S / 2, S * 0.36, S * 0.08, S / 2, S / 2, S * 0.72);
  grad.addColorStop(0, "rgba(255,255,255,0.16)");
  grad.addColorStop(1, "rgba(0,0,0,0.22)");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);

  g.textAlign = "center";
  g.textBaseline = "middle";

  if (mode === "video") {
    // play triangle
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.beginPath();
    g.moveTo(S * 0.44, S * 0.24);
    g.lineTo(S * 0.44, S * 0.42);
    g.lineTo(S * 0.62, S * 0.33);
    g.closePath();
    g.fill();
  } else if (mode === "photo") {
    // small framed-image glyph
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 3;
    g.strokeRect(S * 0.4, S * 0.21, S * 0.2, S * 0.15);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.beginPath();
    g.arc(S * 0.45, S * 0.26, S * 0.014, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(S * 0.41, S * 0.355);
    g.lineTo(S * 0.47, S * 0.3);
    g.lineTo(S * 0.52, S * 0.33);
    g.lineTo(S * 0.57, S * 0.29);
    g.lineTo(S * 0.59, S * 0.355);
    g.closePath();
    g.fill();
  } else {
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = "600 46px system-ui, -apple-system, sans-serif";
    g.fillText("✎", S / 2, S * 0.28);
  }

  // wrapped title (or the date, if untitled), centred within the circle
  const title = (node.title || "").trim();
  const words = (title || node.dateLabel).split(/\s+/).filter(Boolean);
  g.font = "700 34px system-ui, -apple-system, sans-serif";
  g.fillStyle = "rgba(255,255,255,0.96)";
  const maxW = S * 0.72;
  const MAX_LINES = 4;
  const lines: string[] = [];
  let line = "";
  let truncated = false;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line) {
      if (lines.length + 1 >= MAX_LINES) {
        truncated = true;
        break;
      }
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const last = lines.length - 1;
  if (truncated && last >= 0) lines[last] = (lines[last] ?? "") + "…";
  const lh = 40;
  const startY = S * 0.56 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => g.fillText(ln, S / 2, startY + i * lh));

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// One round, billboarded photo. Texture is loaded lazily and disposed on
// unmount so the GPU budget stays bounded.
function PhotoCard({
  node,
  position,
  onSelect,
}: {
  node: ShowcaseNode;
  position: THREE.Vector3;
  onSelect: (n: ShowcaseNode) => void;
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const { invalidate, gl } = useThree();

  // For memories without a photo/poster, paint the title onto the disc so it
  // previews real content instead of showing a flat colour.
  const labelTex = useMemo(
    () => (node.url ? null : makeLabelTexture(node)),
    // node identity is stable per card; title/date/type drive the label
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.url, node.title, node.isVideo, node.dateLabel],
  );
  useEffect(() => () => labelTex?.dispose(), [labelTex]);

  useEffect(() => {
    if (!node.url) return;
    let alive = true;
    // Decode the (possibly huge, full-resolution) photo, then draw a centred
    // square crop into a small fixed canvas *before* handing it to the GPU.
    // Full-res iPhone photos are ~48 MB of VRAM each; a handful blow the iOS
    // texture budget and the upload silently fails, leaving a blank white
    // disc. Bounding every preview to PREVIEW_PX² keeps the budget sane and
    // does the round-crop in one step. Full quality is loaded on tap.
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    let done = false;
    const draw = () => {
      if (!alive || done) return;
      try {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (!iw || !ih) return;
        const cv = document.createElement("canvas");
        cv.width = PREVIEW_PX;
        cv.height = PREVIEW_PX;
        const g = cv.getContext("2d");
        if (!g) return;
        const side = Math.min(iw, ih);
        g.drawImage(img, (iw - side) / 2, (ih - side) / 2, side, side, 0, 0, PREVIEW_PX, PREVIEW_PX);
        // Some sources draw an (almost) uniform disc into a texture even though
        // the browser happily shows them in an <img>: an iOS HEIC photo, a
        // video poster that captured a black frame, or a cross-origin image
        // without CORS (whose canvas is tainted). Detect that and fall back to
        // the title card, so a memory never renders as an empty black/white
        // circle. The full image still opens on tap.
        let hasContent = false;
        try {
          const d = g.getImageData(0, 0, PREVIEW_PX, PREVIEW_PX).data;
          let min = 255;
          let max = 0;
          for (let p = 0; p < d.length; p += 356) {
            const alpha = d[p + 3] ?? 0;
            const lum = alpha === 0 ? 0 : 0.299 * (d[p] ?? 0) + 0.587 * (d[p + 1] ?? 0) + 0.114 * (d[p + 2] ?? 0);
            if (lum < min) min = lum;
            if (lum > max) max = lum;
          }
          hasContent = max - min >= 12;
        } catch {
          hasContent = false; // tainted canvas (missing CORS) — treat as blank
        }
        const texture = hasContent ? new THREE.CanvasTexture(cv) : makeLabelTexture(node);
        if (!texture) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = gl.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        done = true;
        setTex(texture);
        invalidate();
      } catch {
        /* keep the placeholder colour on any decode/upload failure */
      }
    };
    // On iOS Safari `onload` can fire before a large photo is actually
    // decoded, so drawImage paints a blank (white) canvas. decode() waits for
    // the real bitmap; onload stays as a fallback for browsers without it.
    img.onload = draw;
    img.onerror = () => {
      /* keep the placeholder colour on error */
    };
    img.src = node.url;
    if (typeof img.decode === "function") {
      img.decode().then(draw).catch(() => {
        /* decode may reject (e.g. some formats) — onload fallback covers it */
      });
    }
    return () => {
      alive = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [node.url, invalidate, gl]);

  useEffect(() => () => tex?.dispose(), [tex]);

  return (
    <Billboard position={position}>
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[CARD / 2 + 0.08, 56]} />
        <meshBasicMaterial color="#f4eee9" toneMapped={false} />
      </mesh>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
        onPointerOver={() => {
          if (typeof document !== "undefined") document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (typeof document !== "undefined") document.body.style.cursor = "auto";
        }}
      >
        <circleGeometry args={[CARD / 2, 56]} />
        <meshBasicMaterial
          map={tex ?? labelTex ?? null}
          color={tex || labelTex ? "#ffffff" : node.isVideo ? "#5b5170" : "#c99a3f"}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

type Marker = { y: number; month: string; year: string; yearStart: boolean };
// One guide line per memory. `level` controls emphasis: year start > month
// start > ordinary memory.
type GuideLine = { y: number; level: "year" | "month" | "day" };

const LINE_STYLE = {
  year: { color: "#edc472", opacity: 0.9, thickness: 0.06 },
  month: { color: "#d2cbe4", opacity: 0.82, thickness: 0.05 },
  day: { color: "#b7b1c8", opacity: 0.58, thickness: 0.034 },
} as const;

// A thin date axis to the left of the helix: a vertical line, a horizontal
// guide reaching toward the helix for *every* memory (so each one maps onto a
// height), plus a tick + month/year label at each period.
function DateSpine({ height, lines, markers }: { height: number; lines: GuideLine[]; markers: Marker[] }) {
  return (
    <group position={[SPINE_X, 0, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.04, height + 1.4, 0.04]} />
        <meshBasicMaterial color="#4c4658" toneMapped={false} />
      </mesh>
      {lines.map((l, i) => {
        const s = LINE_STYLE[l.level];
        return (
          <mesh key={i} position={[GRID_LEN / 2, l.y, 0]}>
            <boxGeometry args={[GRID_LEN, s.thickness, 0.012]} />
            <meshBasicMaterial color={s.color} transparent opacity={s.opacity} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      {markers.map((m) => (
        <group key={m.month + m.y} position={[0, m.y, 0]}>
          <mesh position={[0.28, 0, 0]}>
            <boxGeometry args={[0.56, m.yearStart ? 0.08 : 0.035, 0.035]} />
            <meshBasicMaterial color={m.yearStart ? "#e0b45f" : "#8a8398"} toneMapped={false} />
          </mesh>
          <Html position={[0.85, 0, 0]} center distanceFactor={26} zIndexRange={[0, 0]}>
            <span className={"showcase-tick" + (m.yearStart ? " year" : "")}>
              {m.yearStart ? <b>{m.year}</b> : null}
              {m.month}
            </span>
          </Html>
        </group>
      ))}
    </group>
  );
}

function Scene({ nodes, onSelect }: { nodes: ShowcaseNode[]; onSelect: (n: ShowcaseNode) => void }) {
  const sorted = useMemo(
    () => [...nodes].sort((a, b) => (a.eventDate < b.eventDate ? -1 : a.eventDate > b.eventDate ? 1 : 0)),
    [nodes],
  );

  const layout = useMemo(() => {
    const positions = sorted.map((_, i) => {
      const a = i * ANGLE_STEP;
      return new THREE.Vector3(Math.cos(a) * RADIUS, i * Y_STEP, Math.sin(a) * RADIUS);
    });
    const height = Math.max(1, (sorted.length - 1) * Y_STEP);
    const markers: Marker[] = [];
    const lines: GuideLine[] = [];
    let prevMonth = "";
    let prevYear = "";
    sorted.forEach((n, i) => {
      const ym = n.eventDate.slice(0, 7);
      const year = n.eventDate.slice(0, 4);
      const monthStart = ym !== prevMonth;
      const yearStart = year !== prevYear;
      // every memory gets a connector line to the time axis
      lines.push({ y: i * Y_STEP, level: yearStart ? "year" : monthStart ? "month" : "day" });
      if (monthStart) {
        markers.push({ y: i * Y_STEP, month: monthShort(n.eventDate), year, yearStart });
        prevMonth = ym;
        prevYear = year;
      }
    });
    return { positions, height, markers, lines };
  }, [sorted]);

  const h = layout.height;
  const camY = h / 2;
  // An elevated 3/4 angle so the coil reads in 3D (near cards larger, the
  // spiral receding into fog) instead of a flat, head-on zig-zag.
  const camPos: [number, number, number] = [Math.max(9, h * 0.32), camY + Math.max(3, h * 0.14), Math.max(16, h * 0.52)];

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: camPos, fov: 50 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0e0b13"]} />
      <fog attach="fog" args={["#0e0b13", h * 0.45 + 12, h * 1.7 + 40]} />
      <ambientLight intensity={1} />
      {sorted.map((n, i) => (
        <PhotoCard key={n.id} node={n} position={layout.positions[i]!} onSelect={onSelect} />
      ))}
      <DateSpine height={h} lines={layout.lines} markers={layout.markers} />
      <OrbitControls
        makeDefault
        target={[0, camY, 0]}
        enablePan={false}
        enableDamping={false}
        minDistance={3.2}
        maxDistance={h + 40}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI - 0.15}
      />
    </Canvas>
  );
}

// An atmospheric detail view: the photo sits on a soft glow made from a
// blurred copy of itself, and pops in gently.
function DetailOverlay({ node, labels, onClose }: { node: ShowcaseNode; labels: Labels; onClose: () => void }) {
  return (
    <div className="showcase-detail" onClick={onClose}>
      <div className="showcase-stage" onClick={(e) => e.stopPropagation()}>
        {node.url ? <img className="showcase-glow" src={node.url} alt="" aria-hidden /> : null}
        <button className="showcase-close" onClick={onClose} aria-label={labels.close}>
          ✕
        </button>
        {node.url ? (
          <img className="showcase-photo" src={node.url} alt="" />
        ) : (
          <div className="showcase-noimg">🎬</div>
        )}
        <div className="showcase-caption">
          {node.title ? <b>{node.title}</b> : null}
          <span>
            {node.dateLabel}
            {node.age ? ` · ${node.age}` : ""}
          </span>
          <a className="btn btn-primary" href={`/#entry-${node.id}`}>
            {labels.open}
          </a>
        </div>
      </div>
    </div>
  );
}

function Fallback({ labels, reduced }: { labels: Labels; reduced: boolean }) {
  return (
    <main className="authwrap">
      <div className="card stack" style={{ textAlign: "center" }}>
        <p className="eyebrow">3D</p>
        <h1 className="title">{labels.title}</h1>
        <p className="sub" style={{ marginBottom: 0 }}>
          {reduced ? labels.reduced : labels.unsupported}
        </p>
        <a className="btn btn-primary" href="/">
          {labels.to2d}
        </a>
      </div>
    </main>
  );
}

export default function Showcase({
  nodes,
  childName,
  reduceMotion,
  labels,
  notifications = [],
  authors = {},
}: {
  nodes: ShowcaseNode[];
  childName: string;
  reduceMotion: boolean;
  labels: Labels;
  notifications?: AppNotification[];
  authors?: Record<string, MemberProfile>;
}) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<ShowcaseNode | null>(null);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  if (reduceMotion || webgl === false) return <Fallback labels={labels} reduced={reduceMotion} />;
  if (webgl === null) return <div className="showcase-wrap" />;

  return (
    <div className="showcase-wrap">
      {/* Exactly the same top bar as the 2D timeline (its toggle shows "2D"). */}
      <TopNav childName={childName} notifications={notifications} authors={authors} view="3d" />
      {nodes.length === 0 ? (
        <div className="showcase-empty">{labels.empty}</div>
      ) : (
        <Scene nodes={nodes} onSelect={setSelected} />
      )}
      {selected ? <DetailOverlay node={selected} labels={labels} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
