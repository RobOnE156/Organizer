"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";

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

// One textured card, billboarded to face the viewer. Its texture is loaded
// lazily and disposed on unmount so the GPU budget stays bounded.
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
        /* leave the placeholder colour on error */
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
        <planeGeometry args={[CARD + 0.14, CARD + 0.14]} />
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
        <planeGeometry args={[CARD, CARD]} />
        <meshBasicMaterial map={tex ?? null} color={tex ? "#ffffff" : "#c99a3f"} toneMapped={false} />
      </mesh>
    </Billboard>
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
    const yearLabels: { year: string; pos: THREE.Vector3 }[] = [];
    let prevYear = "";
    sorted.forEach((n, i) => {
      const year = n.eventDate.slice(0, 4);
      if (year !== prevYear) {
        const p = positions[i]!;
        yearLabels.push({ year, pos: new THREE.Vector3(p.x * 1.55, p.y, p.z * 1.55) });
        prevYear = year;
      }
    });
    return { positions, height, yearLabels };
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
      {layout.yearLabels.map((yl) => (
        <Html key={yl.year} position={yl.pos} center distanceFactor={20} zIndexRange={[0, 0]}>
          <span className="showcase-year">{yl.year}</span>
        </Html>
      ))}
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

function DetailOverlay({ node, labels, onClose }: { node: ShowcaseNode; labels: Labels; onClose: () => void }) {
  return (
    <div className="showcase-detail" onClick={onClose}>
      <div className="showcase-detailcard" onClick={(e) => e.stopPropagation()}>
        <button className="showcase-close" onClick={onClose} aria-label={labels.close}>
          ✕
        </button>
        {node.url ? <img src={node.url} alt="" /> : <div className="showcase-noimg">🎬</div>}
        <div className="showcase-detailmeta">
          {node.title ? <b>{node.title}</b> : null}
          <small>
            {node.dateLabel}
            {node.age ? ` · ${node.age}` : ""}
          </small>
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
        <a className="footlink" href="/">
          ← {labels.to2d}
        </a>
        <div className="showcase-titlewrap">
          <b>{labels.title}</b>
          <small className="muted">{labels.hint}</small>
        </div>
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
