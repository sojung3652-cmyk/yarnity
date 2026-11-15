"use client";
// WebGL book: a hardcover in a thin crochet sleeve, rendered with React Three Fiber.
// Geometry: geometry.ts / meshes.ts. Materials: materials.ts. Open/close state comes from useBookState.
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OpenButton } from "../OpenButton";
import { useReducedMotion, type BookState } from "../useBookState";
import { BOARD, D, EDGE_R, FAB, FLAP, H, OPEN_ANGLE, PAGES, PIVOT, roundedRect, sleevePath, SPINE_RX, T, W } from "./geometry";
import { createEdge, createRibbon, loopTube, updateEdge, updateRibbon } from "./meshes";
import { PANEL, useBookMaterials, type BookMaterials } from "./materials";
import { drawEndpaper, LABEL_CM } from "./paperTextures";

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

const PANEL_Y = T + FAB + 0.012;

/** Yellow running stitch inside the picture panel: short floss dashes along an inset rounded rectangle. */
function RunningStitch({ m }: { m: BookMaterials }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dashes = useMemo(() => {
    const loop = roundedRect(PANEL[0] - 0.7, PANEL[1] - 0.7, 0.25, 6), out: { x: number; z: number; a: number }[] = [];
    const dash = 0.34, gap = 0.17; let carry = 0;
    for (let i = 0; i < loop.length; i++) {
      const [ax, az] = loop[i], [bx, bz] = loop[(i + 1) % loop.length], len = Math.hypot(bx - ax, bz - az);
      for (let s = carry; s < len; s += dash + gap) { const t = (s + dash / 2) / len; out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, a: Math.atan2(bz - az, bx - ax) }); }
      carry = (carry - len) % (dash + gap); if (carry < 0) carry += dash + gap;
    }
    return out;
  }, []);
  useEffect(() => {
    const o = new THREE.Object3D(), R = (i: number) => (Math.sin(i * 12.9898) * 43758.5453) % 1;
    dashes.forEach((d, i) => {
      o.position.set(d.x + R(i) * 0.02, PANEL_Y + 0.02, d.z + R(i + 7) * 0.02);
      o.rotation.set(0, -d.a, Math.PI / 2); o.updateMatrix(); ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [dashes]);
  return (
    <instancedMesh ref={ref} args={[undefined, m.thread, dashes.length]} castShadow>
      <capsuleGeometry args={[0.042, 0.28, 4, 8]} />
    </instancedMesh>
  );
}

/** Everything that turns with the front cover, modelled in the closed position. */
function FrontCover({ anim, m, reduce }: { anim: Anim; m: BookMaterials; reduce: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const joinGeo = useMemo(() => loopTube(roundedRect(PANEL[0] + 0.05, PANEL[1] + 0.05, 0.12), PANEL_Y, 0.075), []);
  const lastDraw = useRef(0);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = anim.angle;
    // the stitch map on the endpaper turns slowly, like the CSS book; only redraw when it can be seen
    const now = clock.elapsedTime;
    if (anim.angle > 1.3 && now - lastDraw.current > 1 / 30 && !reduce) {
      lastDraw.current = now; drawEndpaper(m.endpaperCanvas, now, false); m.endpaperTex.needsUpdate = true;
    }
  });
  useEffect(() => () => joinGeo.dispose(), [joinGeo]);
  // CSS label: left 15%, bottom 13% of the cover, rotated -1.2deg
  const lx = -W / 2 + 0.15 * W + LABEL_CM[0] / 2, lz = D / 2 - 0.13 * D - LABEL_CM[1] / 2;
  return (
    <group position={[PIVOT[0], PIVOT[1], 0]} ref={ref}>
      <group position={[-PIVOT[0], -PIVOT[1], 0]}>
        <mesh material={m.board} position={[0, T - BOARD / 2, 0]} castShadow receiveShadow><boxGeometry args={[W, BOARD, D]} /></mesh>
        {/* endpaper (inside of the cover), to the hinge side of the flap */}
        <mesh material={m.endpaper} position={[-FLAP / 2 + 0.15, T - BOARD - 0.004, 0]} rotation-x={Math.PI / 2} receiveShadow>
          <planeGeometry args={[W - FLAP + 0.3, D - 0.3]} />
        </mesh>
        {/* embroidered picture panel, its slip-stitch join, running stitch and cloth label */}
        <mesh material={m.panel} position={[0, PANEL_Y, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={PANEL} /></mesh>
        <mesh geometry={joinGeo} material={m.join} castShadow receiveShadow />
        <RunningStitch m={m} />
        <mesh material={m.label} position={[lx, PANEL_Y + 0.03, lz]} rotation={[-Math.PI / 2, 0, THREE.MathUtils.degToRad(1.2)]} castShadow receiveShadow>
          <boxGeometry args={[LABEL_CM[0], LABEL_CM[1], 0.04]} />
        </mesh>
        <FlapEnd x={W / 2 - FLAP} y={T - BOARD - H} m={m} />
      </group>
    </group>
  );
}

function BookModel({ anim, onOpen, m, reduce }: { anim: Anim; onOpen: () => void; m: BookMaterials; reduce: boolean }) {
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
      <FrontCover anim={anim} m={m} reduce={reduce} />
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
    (window as unknown as { __book3d: object }).__book3d = { setProgress: (v: number) => { anim.t = v; anim.target = v; }, progress: () => anim.t };
  }, [anim]);
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1) / DURATION; // real time, so slow devices do not stretch the 1.2s
    anim.t = anim.target > anim.t ? Math.min(anim.target, anim.t + step) : Math.max(anim.target, anim.t - step);
    anim.angle = OPEN_ANGLE * ease(anim.t);
  }, -1); // before the meshes and camera read it
  return (
    <>
      <CameraRig anim={anim} />
      {/* studio lighting without downloading an HDR: soft boxes rendered into a small environment map */}
      <Environment resolution={256} frames={1} background={false}>
        <Lightformer form="rect" intensity={2.4} color="#fff7ef" position={[-12, 14, 6]} scale={[18, 12, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#f3f0ff" position={[14, 6, 10]} scale={[14, 10, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.6} color="#ffffff" position={[0, 6, -16]} scale={[20, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={0.35} color="#fff3e6" position={[0, -8, 0]} scale={10} target={[0, 0, 0]} />
      </Environment>
      <hemisphereLight args={["#fffaf4", "#e9ddd2", 0.55]} />
      {/* key light from the top left (the same side the CSS book's shadows imply), weak fill opposite */}
      <directionalLight position={[-20, 26, 16]} intensity={1.7} color="#fff6ec" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={4}>
        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 1, 90]} />
      </directionalLight>
      <directionalLight position={[22, 12, 18]} intensity={0.3} color="#f1eeff" />
      <BookModel anim={anim} onOpen={() => setOpen(true)} m={m} reduce={reduce} />
      <ContactShadows position={[0, 0.001, 0]} scale={70} blur={2.6} far={8} opacity={0.5} resolution={1024} color="#3a2a22" frames={Infinity} />
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
            gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.12;
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
