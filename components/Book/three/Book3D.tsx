"use client";
// WebGL book: a hardcover in a thin crochet sleeve, rendered with React Three Fiber.
// Geometry: geometry.ts / meshes.ts. Materials: materials.ts. Open/close state comes from useBookState.
import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OpenButton } from "../OpenButton";
import { useReducedMotion, type BookState } from "../useBookState";
import { BOARD, D, EDGE_R, FAB, FLAP, H, OPEN_ANGLE, PAGES, PIVOT, sleevePath, SPINE_RX, T, W } from "./geometry";
import { createEdge, createRibbon, updateEdge, updateRibbon } from "./meshes";
import { useBookMaterials, type BookMaterials } from "./materials";

const DURATION = 1.2; // seconds, as in the CSS book
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // ease-in-out cubic

/** Shared animation state, read by the meshes and the camera every frame. */
interface Anim { t: number; target: number; angle: number }

function Sleeve({ anim, m }: { anim: Anim; m: BookMaterials }) {
  const geo = useMemo(() => {
    const p = sleevePath(0);
    return { ribbon: createRibbon(p), top: createEdge(p, -D / 2, EDGE_R), bottom: createEdge(p, D / 2, EDGE_R) };
  }, []);
  const last = useRef(-1);
  useFrame(() => {
    if (Math.abs(anim.angle - last.current) < 1e-5) return; // only rebuild while the cover moves
    last.current = anim.angle;
    const p = sleevePath(anim.angle);
    updateRibbon(geo.ribbon, p); updateEdge(geo.top, p, -D / 2, EDGE_R); updateEdge(geo.bottom, p, D / 2, EDGE_R);
  });
  useEffect(() => () => { geo.ribbon.dispose(); geo.top.dispose(); geo.bottom.dispose(); }, [geo]);
  return (
    <>
      <mesh geometry={geo.ribbon} material={m.knit} castShadow receiveShadow />
      <mesh geometry={geo.top} material={m.edge} castShadow />
      <mesh geometry={geo.bottom} material={m.edge} castShadow />
    </>
  );
}

/** Straight crochet edge along a flap's free end, with rounded corners. */
function FlapEnd({ x, y, m }: { x: number; y: number; m: BookMaterials }) {
  return (
    <group position={[x, y, 0]}>
      <mesh material={m.edge} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[EDGE_R, EDGE_R, D, 12, 1, true]} /></mesh>
      <mesh material={m.edge} position-z={-D / 2}><sphereGeometry args={[EDGE_R, 12, 8]} /></mesh>
      <mesh material={m.edge} position-z={D / 2}><sphereGeometry args={[EDGE_R, 12, 8]} /></mesh>
    </group>
  );
}

function spineBoardGeometry() {
  const s = new THREE.Shape(), cx = -W / 2, cy = T / 2;
  s.moveTo(cx, T);
  s.absellipse(cx, cy, SPINE_RX, T / 2, Math.PI / 2, 1.5 * Math.PI, false, 0);
  s.lineTo(cx, T);
  const g = new THREE.ExtrudeGeometry(s, { depth: D - 0.02, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, -(D - 0.02) / 2);
  return g;
}

/** Everything that turns with the front cover, modelled in the closed position. */
function FrontCover({ anim, m }: { anim: Anim; m: BookMaterials }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.rotation.z = anim.angle; });
  const inset = 0.07 * W, pw = W - 2 * inset, ph = D - 2 * inset;
  return (
    <group position={[PIVOT[0], PIVOT[1], 0]} ref={ref}>
      <group position={[-PIVOT[0], -PIVOT[1], 0]}>
        {/* board */}
        <mesh material={m.board} position={[0, T - BOARD / 2, 0]} castShadow receiveShadow><boxGeometry args={[W, BOARD, D]} /></mesh>
        {/* endpaper with the stitch map (inside of the cover), left of the flap when open */}
        <mesh material={m.endpaper} position={[-FLAP / 2 + 0.15, T - BOARD - 0.004, 0]} rotation-x={Math.PI / 2} receiveShadow>
          <planeGeometry args={[W - FLAP + 0.3, D - 0.3]} />
        </mesh>
        {/* picture panel on the outside */}
        <mesh material={m.panel} position={[0, T + FAB + 0.012, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[pw, ph]} />
        </mesh>
        <FlapEnd x={W / 2 - FLAP} y={T - BOARD - H} m={m} />
      </group>
    </group>
  );
}

function BookModel({ anim, onOpen, m }: { anim: Anim; onOpen: () => void; m: BookMaterials }) {
  const spine = useMemo(spineBoardGeometry, []);
  const [hover, setHover] = useState(false);
  useEffect(() => { document.body.style.cursor = hover ? "pointer" : ""; return () => { document.body.style.cursor = ""; }; }, [hover]);
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (anim.target === 0) onOpen(); };
  const pw = PAGES.x1 - PAGES.x0, ph = PAGES.y1 - PAGES.y0, pd = PAGES.z1 - PAGES.z0;
  return (
    <group position-y={FAB} onClick={click} onPointerOver={() => setHover(anim.target === 0)} onPointerOut={() => setHover(false)}>
      <mesh material={m.board} position={[0, BOARD / 2, 0]} castShadow receiveShadow><boxGeometry args={[W, BOARD, D]} /></mesh>
      <mesh geometry={spine} material={m.board} />
      {/* page block: [+x fore edge, -x spine, +y top page, -y, +z bottom edge, -z top edge] */}
      <mesh position={[(PAGES.x0 + PAGES.x1) / 2, (PAGES.y0 + PAGES.y1) / 2, 0]} material={m.pages} castShadow receiveShadow>
        <boxGeometry args={[pw, ph, pd]} />
      </mesh>
      <FlapEnd x={W / 2 - FLAP} y={BOARD + H} m={m} />
      <Sleeve anim={anim} m={m} />
      <FrontCover anim={anim} m={m} />
    </group>
  );
}

// ---------- camera ----------
const FOV = 22;
const CLOSED_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(24));

function fitDistance(halfW: number, halfH: number, aspect: number) {
  const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  return Math.max(halfH / t, halfW / (t * aspect));
}

function CameraRig({ anim }: { anim: Anim }) {
  const { camera, size } = useThree();
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), up: new THREE.Vector3() }), []);
  useFrame(() => {
    const aspect = size.width / size.height, narrow = aspect < 0.85, e = ease(anim.t);
    // closed: 3/4 view from above, book filling a bit over half the stage (like the CSS book)
    const cTgt = new THREE.Vector3(0, FAB + T / 2, 0), cDist = fitDistance(12.5 / 0.74, 12.5 / 0.74, aspect);
    // open: straight down on the spread (phones: on the right page, as the CSS book does)
    const spreadL = PIVOT[0] - W - 1.2, spreadR = W / 2 + 0.4;
    const oTgt = narrow ? new THREE.Vector3((PAGES.x0 + PAGES.x1) / 2, FAB + PAGES.y1, 0) : new THREE.Vector3((spreadL + spreadR) / 2, FAB + T * 0.6, 0);
    const oDist = narrow ? fitDistance(W / 2 / 0.86, D / 2 / 0.7, aspect) : fitDistance((spreadR - spreadL) / 2 / 0.62, D / 2 / 0.74, aspect);
    // blend direction (elevation/azimuth), distance and target together
    const dir = CLOSED_DIR.clone().lerp(new THREE.Vector3(0, 1, 0.0001), e).normalize();
    tmp.tgt.copy(cTgt).lerp(oTgt, e);
    // pull back mid-way: the cover stands up towards the camera around 90 degrees
    const bump = 1 + 0.45 * Math.sin(Math.PI * e);
    tmp.pos.copy(tmp.tgt).addScaledVector(dir, THREE.MathUtils.lerp(cDist, oDist, e) * bump);
    tmp.up.set(0, 1, 0).lerp(new THREE.Vector3(0, 0, -1), e).normalize();
    camera.position.copy(tmp.pos); camera.up.copy(tmp.up); camera.lookAt(tmp.tgt);
  });
  return null;
}

function Scene({ open, setOpen, reduce }: { open: boolean; setOpen: (v: boolean) => void; reduce: boolean }) {
  const anim = useMemo<Anim>(() => ({ t: open ? 1 : 0, target: open ? 1 : 0, angle: 0 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const m = useBookMaterials();
  useEffect(() => { anim.target = open ? 1 : 0; if (reduce) anim.t = anim.target; }, [open, reduce, anim]);
  useEffect(() => {
    // test hook: ?debug lets screenshots freeze the animation at a given progress
    if (!location.search.includes("debug")) return;
    (window as unknown as { __book3d: object }).__book3d = { setProgress: (v: number) => { anim.t = v; anim.target = v; } };
  }, [anim]);
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05) / DURATION;
    anim.t = anim.target > anim.t ? Math.min(anim.target, anim.t + step) : Math.max(anim.target, anim.t - step);
    anim.angle = OPEN_ANGLE * ease(anim.t);
  }, -1); // before the meshes and camera read it
  return (
    <>
      <CameraRig anim={anim} />
      <hemisphereLight args={["#ffffff", "#e9ddd2", 0.7]} />
      <directionalLight position={[-18, 30, -8]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}>
        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 1, 90]} />
      </directionalLight>
      <directionalLight position={[22, 12, 18]} intensity={0.45} />
      <BookModel anim={anim} onOpen={() => setOpen(true)} m={m} />
      <ContactShadows position={[0, 0.001, 0]} scale={70} blur={2.6} far={8} opacity={0.42} resolution={1024} color="#3a2a22" frames={Infinity} />
    </>
  );
}

export default function Book3D({ open, setOpen, toggle, onFail }: BookState & { onFail: () => void }) {
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();
  return (
    <section className="bookstage" aria-label="소개">
      <div className={"stage3d" + (ready ? " ready" : "")} id="book">
        <Canvas
          dpr={[1, 2]}
          shadows={{ type: THREE.PCFShadowMap }}
          camera={{ fov: FOV, near: 1, far: 400, position: [0, 60, 80] }}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0;
            gl.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); onFail(); });
            requestAnimationFrame(() => setReady(true));
          }}
        >
          <Scene open={open} setOpen={setOpen} reduce={reduce} />
        </Canvas>
      </div>
      <OpenButton open={open} onToggle={toggle} />
    </section>
  );
}
