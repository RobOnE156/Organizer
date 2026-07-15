"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import NavDrawer from "@/app/NavDrawer";
import ViewToggle from "@/app/ViewToggle";

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
const CARD = 1.85;
const SPINE_X = -8.5;

const MONTH_FMT = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("de-DE", { month: "short" }) : null;
function monthShort(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return MONTH_FMT && !Number.isNaN(d.getTime()) ? MONTH_FMT.format(d) : iso.slice(5, 7);
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
  const { invalidate } = useThree();

  useEffect(() => {
    if (!node.url) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      node.url,
      (texture) => {
        if (!alive) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        setTex(texture);
        invalidate();
      },
      undefined,
      () => {
        /* keep the placeholder colour on error */
      },
    );
    return () => {
      alive = false;
    };
  }, [node.url, invalidate]);

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
        <meshBasicMaterial map={tex ?? null} color={tex ? "#ffffff" : "#c99a3f"} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

type Marker = { y: number; month: string; year: string; yearStart: boolean };

// A thin date axis to the left of the helix: a vertical line with a tick +
// month (and year) label at each period, aligned with the memories' heights.
function DateSpine({ height, markers }: { height: number; markers: Marker[] }) {
  return (
    <group position={[SPINE_X, 0, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.04, height + 1.4, 0.04]} />
        <meshBasicMaterial color="#4c4658" toneMapped={false} />
      </mesh>
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
    let prevMonth = "";
    let prevYear = "";
    sorted.forEach((n, i) => {
      const ym = n.eventDate.slice(0, 7);
      const year = n.eventDate.slice(0, 4);
      if (ym !== prevMonth) {
        markers.push({ y: i * Y_STEP, month: monthShort(n.eventDate), year, yearStart: year !== prevYear });
        prevMonth = ym;
        prevYear = year;
      }
    });
    return { positions, height, markers };
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
      <DateSpine height={h} markers={layout.markers} />
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
}: {
  nodes: ShowcaseNode[];
  childName: string;
  reduceMotion: boolean;
  labels: Labels;
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
      <div className="showcase-bar">
        <ViewToggle current="3d" className="menubtn showcase-menu viewtoggle" />
        <div className="showcase-titlewrap">
          <b>{labels.title}</b>
          <small className="muted">{labels.hint}</small>
        </div>
        <NavDrawer childName={childName} triggerClassName="menubtn showcase-menu" />
      </div>
      {nodes.length === 0 ? (
        <div className="showcase-empty">{labels.empty}</div>
      ) : (
        <Scene nodes={nodes} onSelect={setSelected} />
      )}
      {selected ? <DetailOverlay node={selected} labels={labels} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
