"use client";
// WebGL paper book: a thick book in a hand-knit cover (see legacy/pic/book_ref.png), rendered with
// React Three Fiber. Opening is staged like stop motion: the cover swings open, then six sheets turn
// one after another, bowing like paper, while the camera rises to look down on the spread.
// Geometry: geometry.ts / meshes.ts. Materials: materials.ts. Open state: useBookState (shared with the CSS book).
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { useReducedMotion, type BookState } from "../useBookState";
import {
  BLOCK, blockTop, BOARD, BORDER_CORNER, BORDER_OUT, BORDER_R, BORDER_TUCK, BORDER_Y_BACK, BORDER_Y_FRONT, coverPose, D, FAB, FORE_CONCAVE, GUTTER_X, PANEL_SIZE, Q0, sheetCurve, SHEET_W, SHEETS, sleevePath, spineYarn, T, W,
} from "./geometry";
import { borderPath, createEdge, createRibbon, createSheet, flatTube, updateEdge, updateRibbon, updateSheet } from "./meshes";
import { chainTileCm } from "./knitMaps";
import { useBookMaterials, type BookMaterials } from "./materials";
import { LABEL_CM, PAGE_D, PAGE_LAYOUT, PX_CM } from "./paperTextures";

// ---- timeline (seconds) ----
const TOTAL = 1.6;
const COVER_END = 0.9;
const SHEET_START = 0.46, SHEET_STAGGER = 0.075, SHEET_DUR = 0.62;
// stop-motion feel: each sheet turns at a slightly different speed (fixed, so it is the same every time)
const SHEET_SPEED = [1.04, 0.93, 1.08, 0.97, 1.1, 0.91];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface Anim { t: number; target: number; cover: number; sheets: number[]; cam: number }
function derive(a: Anim) {
  const s = a.t * TOTAL;
  a.cover = ease(clamp01(s / COVER_END));
  a.sheets = SHEET_SPEED.map((f, k) => ease(clamp01((s - SHEET_START - k * SHEET_STAGGER) / (SHEET_DUR / f))));
  a.cam = ease(a.t);
}

// ---- knit sleeve: back, spine band and front (the band flattens as the book opens) ----
const YARN_Z = D / 2 + BORDER_OUT; // spine-edge yarn runs in line with the cover borders
function Sleeve({ anim, m }: { anim: Anim; m: BookMaterials }) {
  const geo = useMemo(() => {
    const p = sleevePath(0), y = spineYarn(0);
    return { ribbon: createRibbon(p), top: createEdge(y, -YARN_Z, BORDER_R), bottom: createEdge(y, YARN_Z, BORDER_R) };
  }, []);
  const caps = useRef<(THREE.Mesh | null)[]>([]);
  const last = useRef(-1);
  useFrame(() => {
    if (Math.abs(anim.cover - last.current) < 1e-6) return;
    last.current = anim.cover;
    const p = sleevePath(anim.cover), y = spineYarn(anim.cover);
    updateRibbon(geo.ribbon, p); updateEdge(geo.top, y, -YARN_Z, BORDER_R); updateEdge(geo.bottom, y, YARN_Z, BORDER_R);
    // round caps on the yarn ends (hidden under the borders, but never an open tube)
    const ends = [y[0].p, y[y.length - 1].p];
    caps.current.forEach((c, i) => { if (c) c.position.set(ends[i % 2][0], ends[i % 2][1], i < 2 ? -YARN_Z : YARN_Z); });
  });
  useEffect(() => () => { geo.ribbon.dispose(); geo.top.dispose(); geo.bottom.dispose(); }, [geo]);
  return (
    <>
      <mesh geometry={geo.ribbon} material={[m.cream, m.lavender, m.cream]} castShadow receiveShadow />
      <mesh geometry={geo.top} material={m.border} castShadow />
      <mesh geometry={geo.bottom} material={m.border} castShadow />
      {[0, 1, 2, 3].map(i => <mesh key={i} ref={el => { caps.current[i] = el; }} material={m.border}><sphereGeometry args={[BORDER_R, 16, 12]} /></mesh>)}
    </>
  );
}

/** Chain border of one cover: a "ㄷ" round the head, fore edge and tail, open at the spine where its
 *  ends tuck under the spine cloth; rounded corners, fixed tube frame, capped ends. */
function Border({ y, m }: { y: number; m: BookMaterials }) {
  const { g, ends } = useMemo(() => {
    const pts = borderPath(W, D, BORDER_OUT, BORDER_CORNER, BORDER_TUCK);
    return { g: flatTube(pts, y, BORDER_R, chainTileCm()), ends: [pts[0], pts[pts.length - 1]] };
  }, [y]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <>
      <mesh geometry={g} material={m.border} castShadow receiveShadow />
      {ends.map(([x, z], i) => <mesh key={i} material={m.border} position={[x, y, z]}><sphereGeometry args={[BORDER_R, 16, 12]} /></mesh>)}
    </>
  );
}

/** Two small lavender stitches at each end of the label. */
function LabelStitches({ m }: { m: BookMaterials }) {
  const pos: [number, number][] = [];
  for (const sx of [-1, 1]) for (const sz of [-0.32, 0.32]) pos.push([sx * (LABEL_CM[0] / 2 - 0.32), sz * LABEL_CM[1] * 0.5]);
  return <>{pos.map(([x, z], i) => (
    <mesh key={i} material={m.thread} position={[x, 0.035, z]} rotation-x={Math.PI / 2}><capsuleGeometry args={[0.045, 0.32, 4, 8]} /></mesh>
  ))}</>;
}

/** Front cover: board + knit (picture, border, label). Modelled closed; turned by coverPose. */
function FrontCover({ anim, m }: { anim: Anim; m: BookMaterials }) {
  const outer = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = outer.current; if (!g) return;
    const pose = coverPose(anim.cover);
    g.position.set(pose.F[0], pose.F[1], 0); g.rotation.z = pose.A;
  });
  // label: lower left of the cover, as in the reference photo, slightly askew
  const lx = -W / 2 + 0.14 * W + LABEL_CM[0] / 2, lz = D / 2 - 0.15 * D - LABEL_CM[1] / 2;
  return (
    <group ref={outer} position={[Q0[0], Q0[1], 0]}>
      <group position={[-Q0[0], -Q0[1], 0]}>
        <mesh material={m.inside} position={[0, T - BOARD / 2, 0]} castShadow receiveShadow><boxGeometry args={[W, BOARD, D]} /></mesh>
        <mesh material={m.panel} position={[0, T + FAB + 0.004, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={PANEL_SIZE} /></mesh>
        <Border y={BORDER_Y_FRONT} m={m} />
        <group position={[lx, T + FAB + 0.03, lz]} rotation-y={THREE.MathUtils.degToRad(-3)}>
          <mesh material={m.label} rotation-x={-Math.PI / 2} castShadow receiveShadow><boxGeometry args={[LABEL_CM[0], LABEL_CM[1], 0.05]} /></mesh>
          <LabelStitches m={m} />
        </group>
      </group>
    </group>
  );
}

/** Page block: hundreds of sheets (edge texture), top curling into the gutter, fore edge slightly hollow. */
function useBlockGeometry() {
  return useMemo(() => {
    const w = BLOCK.x1 - BLOCK.x0, h = blockTop(BLOCK.x1) - BLOCK.y0, d = BLOCK.z1 - BLOCK.z0;
    const g = new THREE.BoxGeometry(w, h, d, 24, 1, 24);
    g.translate((BLOCK.x0 + BLOCK.x1) / 2, BLOCK.y0 + h / 2, (BLOCK.z0 + BLOCK.z1) / 2);
    const p = g.attributes.position as THREE.BufferAttribute, top = BLOCK.y0 + h - 1e-4;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i); const z = p.getZ(i);
      if (y > top) y = blockTop(x);
      if (x > BLOCK.x1 - 1e-4) x -= FORE_CONCAVE * (1 - Math.pow(z / (d / 2), 2));
      p.setXY(i, x, y);
    }
    g.computeVertexNormals();
    return g;
  }, []);
}

/** One sheet (two faces) that turns with progress p, or the static page under them. */
function Sheet({ k, anim, front, back }: { k: number; anim: Anim; front: THREE.Material; back: THREE.Material }) {
  const geo = useMemo(() => createSheet(PAGE_D), []);
  const last = useRef(-1), fm = useRef<THREE.Mesh>(null), bm = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = k < SHEETS ? anim.sheets[k] : 0;
    if (Math.abs(p - last.current) < 1e-6) return;
    last.current = p;
    const c = sheetCurve(k, p); updateSheet(geo, c.pts, c.heads);
    // resting sheets lie 0.12mm apart: letting them shadow each other only produced speckles
    const moving = p > 0 && p < 1;
    if (fm.current) fm.current.castShadow = moving; if (bm.current) bm.current.castShadow = moving;
  });
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <>
      <mesh ref={fm} geometry={geo} material={front} receiveShadow />
      <mesh ref={bm} geometry={geo} material={back} receiveShadow />
    </>
  );
}

// ---- the real "Start Creating" button, laid on the right page with CSS3DRenderer ----
// The printed page carries the text; the button is DOM so it can be clicked and focused. drei <Html>
// was tried in the previous 3D version: its separate React root ends up empty under Strict Mode, so the
// DOM is rendered through a portal into the element given to CSS3DObject (keeps the Next router context).
interface CssLayer { renderer: CSS3DRenderer; start: HTMLDivElement; mine: HTMLDivElement; close: HTMLDivElement }
type Rect = { x: number; y: number; w: number; h: number };
/** A DOM element laid on the right page at a rect of the page layout (CSS px). */
function PageLink({ el, rect }: { el: HTMLDivElement; rect: Rect }) {
  const obj = useMemo(() => {
    const o = new CSS3DObject(el);
    const x = GUTTER_X + (rect.x + rect.w / 2) * PX_CM, z = BLOCK.z0 + (rect.y + rect.h / 2) * PX_CM;
    o.position.set(x, blockTop(x) + 0.08, z); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.setScalar(PX_CM);
    return o;
  }, [el, rect]);
  return <primitive object={obj} />;
}

/** Fades the page's DOM controls in at the end of opening; hidden and inert otherwise. */
function PageControls({ anim, layer }: { anim: Anim; layer: CssLayer }) {
  const els = useMemo(() => [layer.start, layer.mine, layer.close], [layer]);
  const shown = useRef<boolean | null>(null);
  useFrame(() => {
    const o = clamp01((anim.t - 0.85) / 0.15);
    for (const el of els) el.style.opacity = String(o);
    const vis = o > 0.5;
    if (vis !== shown.current) { shown.current = vis; for (const el of els) { el.inert = !vis; el.style.pointerEvents = vis ? "auto" : "none"; } }
  });
  return (
    <>
      <PageLink el={layer.start} rect={PAGE_LAYOUT.button} />
      <PageLink el={layer.mine} rect={PAGE_LAYOUT.mine} />
    </>
  );
}

/** "Close" on the first (left) page: lies on the turned sheet near its upper outer corner. */
const CLOSE_PX: [number, number] = [96, 30];
function PageClose({ layer }: { layer: CssLayer }) {
  const obj = useMemo(() => {
    const o = new CSS3DObject(layer.close), c = sheetCurve(SHEETS - 1, 1), n = c.pts.length - 1;
    const i = Math.round(n * (SHEET_W - 2.2) / SHEET_W), p = c.pts[i], a = c.heads[Math.min(i, c.heads.length - 1)];
    o.position.set(p[0], p[1] + 0.06, BLOCK.z0 + 1.3);
    // lie flat on the page, then follow its slope (the left side rests on the tilted cover)
    o.rotation.order = "ZYX"; o.rotation.set(-Math.PI / 2, 0, a - Math.PI);
    o.scale.setScalar(PX_CM);
    return o;
  }, [layer]);
  return <primitive object={obj} />;
}

function BookModel({ anim, onOpen, layer, m }: { anim: Anim; onOpen: () => void; layer: CssLayer; m: BookMaterials }) {
  const block = useBlockGeometry();
  const [hover, setHover] = useState(false);
  useEffect(() => { document.body.style.cursor = hover ? "pointer" : ""; return () => { document.body.style.cursor = ""; }; }, [hover]);
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (anim.target === 0) onOpen(); };
  return (
    <group position-y={FAB} onClick={click} onPointerOver={() => setHover(anim.target === 0)} onPointerOut={() => setHover(false)}>
      <mesh material={m.inside} position={[0, BOARD / 2, 0]} castShadow receiveShadow><boxGeometry args={[W, BOARD, D]} /></mesh>
      <Border y={BORDER_Y_BACK} m={m} />
      <mesh geometry={block} material={m.block} castShadow receiveShadow />
      <Sheet k={SHEETS} anim={anim} front={m.rightPage} back={m.pageBack} />
      {Array.from({ length: SHEETS }, (_, k) => (
        <Sheet key={k} k={k} anim={anim} front={m.pageFront} back={k === SHEETS - 1 ? m.leftPage : m.pageBack} />
      ))}
      <Sleeve anim={anim} m={m} />
      <FrontCover anim={anim} m={m} />
      <PageControls anim={anim} layer={layer} />
      <PageClose layer={layer} />
    </group>
  );
}

// ---- camera ----
const FOV = 22;
// closed: ~33 degrees above the table, book turned ~25 degrees (matches the design comp)
const CLOSED_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 33), THREE.MathUtils.degToRad(25));
// open: high and from the front, so the spread reads like a page
const OPEN_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 72), 0);
const fit = (hw: number, hh: number, aspect: number) => { const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2)); return Math.max(hh / t, hw / (t * aspect)); };

// Where the book sits in the desk photo (legacy/pic/main_background_refer.png, 1808 x 870):
// centre at (1075, 490) (a little lower than the comp's 460); 22% of the photo wide (the comp had 27%, trimmed for more air). The photo is drawn with object-fit: cover and
// object-position: right center, so the same scale/offset maps that spot onto the screen.
const PHOTO = { w: 1808, h: 870, cx: 1075, cy: 490, bookW: 0.22 };
const DESK_MIN = 900; // below this the hero uses the (pending) phone layout
function photoSpot(vw: number, vh: number) {
  const s = Math.max(vw / PHOTO.w, vh / PHOTO.h), offX = vw - PHOTO.w * s, offY = (vh - PHOTO.h * s) / 2;
  return { x: offX + PHOTO.cx * s, y: offY + PHOTO.cy * s, w: PHOTO.bookW * PHOTO.w * s };
}

// closed book's bounding box (book frame, lifted by FAB)
const BOX = (() => {
  const ex = W / 2 + BORDER_OUT + BORDER_R, ez = D / 2 + BORDER_OUT + BORDER_R, y0 = FAB + BORDER_Y_BACK - BORDER_R, y1 = FAB + BORDER_Y_FRONT + BORDER_R;
  const out: THREE.Vector3[] = [];
  for (const x of [-ex, ex]) for (const y of [y0, y1]) for (const z of [-ez, ez]) out.push(new THREE.Vector3(x, y, z));
  return out;
})();

/** Camera distance and lens shift that put the closed book at its spot in the photo. */
function closedAnchor(vw: number, vh: number, tgt: THREE.Vector3) {
  const cam = new THREE.PerspectiveCamera(FOV, vw / vh, 1, 1000), spot = photoSpot(vw, vh);
  const project = (d: number) => {
    cam.position.copy(tgt).addScaledVector(CLOSED_DIR, d); cam.up.set(0, 1, 0); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of BOX) { const q = p.clone().project(cam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    return { w: (x1 - x0) / 2 * vw, cx: ((x0 + x1) / 2 + 1) / 2 * vw, cy: (1 - (y0 + y1) / 2) / 2 * vh };
  };
  let d = 100;
  for (let i = 0; i < 4; i++) d *= project(d).w / spot.w; // projected width ~ 1/d: converges in a few steps
  const p = project(d);
  return { d, shiftX: p.cx - spot.x, shiftY: p.cy - spot.y };
}

function CameraRig({ anim, layer }: { anim: Anim; layer: CssLayer }) {
  const { camera, size, scene } = useThree();
  useEffect(() => { layer.renderer.setSize(size.width, size.height); }, [layer, size]);
  const cTgt = useMemo(() => new THREE.Vector3(0, FAB + T / 2, 0), []);
  const desk = size.width >= DESK_MIN;
  const anchor = useMemo(() => (desk ? closedAnchor(size.width, size.height, cTgt) : null), [desk, size.width, size.height, cTgt]);
  const v = useMemo(() => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), dir: new THREE.Vector3() }), []);
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera, aspect = size.width / size.height, e = anim.cam;
    const cDist = anchor ? anchor.d : fit(14 / 0.8, 14 / 0.8, aspect);
    const leftEdge = GUTTER_X - (BLOCK.x1 - BLOCK.x0) - 0.6, rightEdge = BLOCK.x1 + 0.4;
    const oTgt = !desk ? new THREE.Vector3((GUTTER_X + BLOCK.x1) / 2, FAB + BLOCK.y1, 0) : new THREE.Vector3((leftEdge + rightEdge) / 2, FAB + T * 0.6, 0.6);
    const oDist = !desk ? fit((BLOCK.x1 - GUTTER_X) / 2 / 0.92, D / 2 / 0.7, aspect) : fit((rightEdge - leftEdge) / 2 / 0.52, D / 2 / 0.64, aspect); // open spread ~52% of the width
    v.dir.copy(CLOSED_DIR).lerp(OPEN_DIR, e).normalize();
    v.tgt.copy(cTgt).lerp(oTgt, e);
    const bump = 1 + 0.35 * Math.sin(Math.PI * e); // the cover swings towards the camera mid-way
    v.pos.copy(v.tgt).addScaledVector(v.dir, THREE.MathUtils.lerp(cDist, oDist, e) * bump);
    cam.position.copy(v.pos); cam.up.set(0, 1, 0); cam.lookAt(v.tgt);
    // lens shift: closed, the book sits at its spot in the photo; it glides to the centre as it opens
    if (anchor) cam.setViewOffset(size.width, size.height, anchor.shiftX * (1 - e), anchor.shiftY * (1 - e), size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(); scene.updateMatrixWorld();
    layer.renderer.render(scene, camera); // the DOM page buttons follow the same camera
  });
  return null;
}

function Scene({ open, setOpen, reduce, layer }: { open: boolean; setOpen: (v: boolean) => void; reduce: boolean; layer: CssLayer }) {
  const anim = useMemo<Anim>(() => { const a: Anim = { t: 0, target: 0, cover: 0, sheets: [], cam: 0 }; derive(a); return a; }, []);
  const m = useBookMaterials();
  const invalidate = useThree(s => s.invalidate), gl = useThree(s => s.gl), camera = useThree(s => s.camera), sceneRef = useThree(s => s.scene);
  useEffect(() => { anim.target = open ? 1 : 0; if (reduce) anim.t = anim.target; invalidate(); }, [open, reduce, anim, invalidate]);
  useEffect(() => {
    // test hook: ?debug lets screenshots freeze the animation at a given progress
    if (!location.search.includes("debug")) return;
    (window as unknown as { __book3d: object }).__book3d = {
      setProgress: (v: number) => { anim.t = v; anim.target = v; invalidate(); }, progress: () => anim.t, frames: () => gl.info.render.frame,
      scene: () => sceneRef, // for isolating meshes while debugging
      glInfo: () => { const c = gl.getContext(); const cam = camera as THREE.PerspectiveCamera; return { depthBits: c.getParameter(c.DEPTH_BITS), near: cam.near, far: cam.far, view: cam.view?.enabled ?? false }; },
      // which meshes a ray through screen point (CSS px) hits, nearest first, with uv
      pick: (sx: number, sy: number) => {
        const r = gl.domElement.getBoundingClientRect(), rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2((sx - r.left) / r.width * 2 - 1, -((sy - r.top) / r.height * 2 - 1)), camera);
        return rc.intersectObjects(sceneRef.children, true).slice(0, 4).map(h => ({ type: (h.object as THREE.Mesh).geometry.type, verts: (h.object as THREE.Mesh).geometry.attributes.position.count, d: +h.distance.toFixed(3), uv: h.uv ? [+h.uv.x.toFixed(4), +h.uv.y.toFixed(4)] : null, point: h.point.toArray().map(v => +v.toFixed(3)) }));
      },
      // screen position (CSS px) of a point in the book frame, for zoomed screenshots
      project: (x: number, y: number, z: number) => {
        const v = new THREE.Vector3(x, y + FAB, z).project(camera), r = gl.domElement.getBoundingClientRect();
        return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height];
      },
    };
  }, [anim, invalidate, gl, camera, sceneRef]);
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1) / TOTAL; // real time, capped, so slow devices do not stretch 1.6s
    anim.t = anim.target > anim.t ? Math.min(anim.target, anim.t + step) : Math.max(anim.target, anim.t - step);
    derive(anim);
    if (anim.t !== anim.target) invalidate(); // frameloop="demand": render only while moving
  }, -1);
  return (
    <>
      <CameraRig anim={anim} layer={layer} />
      {/* soft studio light without an HDR download: soft boxes baked into a small environment map */}
      <Environment resolution={256} frames={1} background={false}>
        <Lightformer form="rect" intensity={3} color="#fff8f0" position={[-12, 16, 8]} scale={[20, 14, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#f6f2ff" position={[14, 8, 12]} scale={[16, 10, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 8, -18]} scale={[24, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={0.5} color="#fff3e6" position={[0, -8, 0]} scale={12} target={[0, 0, 0]} />
      </Environment>
      <hemisphereLight args={["#fffaf4", "#eadfd4", 0.8]} />
      {/* key light = the photo's sunlight: high, from the upper left and behind; weak fill opposite */}
      <directionalLight position={[-26, 30, -14]} intensity={1.5} color="#fff4e6" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={5}>
        <orthographicCamera attach="shadow-camera" args={[-34, 34, 34, -34, 1, 100]} />
      </directionalLight>
      <directionalLight position={[22, 12, 18]} intensity={0.35} color="#f1eeff" />
      <BookModel anim={anim} onOpen={() => setOpen(true)} layer={layer} m={m} />
      <ContactShadows position={[0, 0.001, 0]} scale={80} blur={3.2} far={8} opacity={0.32} resolution={1024} color="#6a5046" frames={Infinity} />
    </>
  );
}

export default function Book3D({ open, setOpen, onFail }: BookState & { onFail: () => void }) {
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();
  const cssHost = useRef<HTMLDivElement>(null);
  const [layer] = useState<CssLayer>(() => {
    const mk = (id: string) => { const el = document.createElement("div"); el.id = id; el.style.opacity = "0"; el.inert = true; return el; };
    const renderer = new CSS3DRenderer(); renderer.domElement.className = "css3d-layer";
    return { renderer, start: mk("bookRight"), mine: mk("bookMine"), close: mk("bookClose") };
  });
  useEffect(() => { cssHost.current!.appendChild(layer.renderer.domElement); return () => { layer.renderer.domElement.remove(); }; }, [layer]);
  return (
    <div className={"book3d" + (ready ? " ready" : "") + (open ? " is-open" : "")} id="book">
      <Canvas
        dpr={[1, 2]}
        frameloop="demand"
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ fov: FOV, near: 20, far: 600, position: [0, 60, 80] }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.3;
          gl.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); onFail(); });
          requestAnimationFrame(() => setReady(true));
        }}
      >
        <Scene open={open} setOpen={setOpen} reduce={reduce} layer={layer} />
      </Canvas>
      <div ref={cssHost} />
      {createPortal(<Link className="btn btn-primary page3d-btn" href="/new">도안 만들기</Link>, layer.start)}
      {createPortal(<Link className="page3d-link" href="/mine" style={{ width: PAGE_LAYOUT.mine.w, height: PAGE_LAYOUT.mine.h }}>내 작품 →</Link>, layer.mine)}
      {createPortal(<button type="button" className="page3d-close" style={{ width: CLOSE_PX[0], height: CLOSE_PX[1] }} onClick={() => setOpen(false)}>‹ Close</button>, layer.close)}
      {/* the printed page text, for screen readers */}
      <div className="sr" lang="en">
        <p>Yarnity / Intelligent Crochet</p>
        <p>Your creativity. Our intelligence. Every stitch, together.</p>
        <p>Generate your patterns with AI. Track every stitch. Bring your ideas to life.</p>
      </div>
    </div>
  );
}
