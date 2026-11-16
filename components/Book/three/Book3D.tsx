"use client";
// WebGL book: a cloth hardcover (design "C": lavender book cloth, the bird picture printed on the front,
// a paper label), rendered with React Three Fiber. Opening is staged like stop motion: the cover swings
// open, then six sheets turn one after another, bowing like paper, while the camera rises to look down
// on the spread. Geometry: geometry.ts / meshes.ts. Materials: materials.ts. Cover art: ../coverArt.ts.
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { useReducedMotion, type BookState } from "../useBookState";
import {
  BLOCK, blockTop, BOARD, CORNER_R, coverPose, D, FAB, FORE_CONCAVE, GUTTER_X, Q0, sheetCurve, SHEET_W, SHEETS, spineCloth, T, W,
} from "./geometry";
import { createRibbon, createSheet, updateRibbon, updateSheet } from "./meshes";
import { LABEL_CM, useBookMaterials, type BookMaterials } from "./materials";
import { PAGE_D, PAGE_LAYOUT, PX_CM } from "./paperTextures";

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

// ---- spine cloth: a gently rounded band between the boards; it flattens as the book opens ----
function SpineCloth({ anim, m }: { anim: Anim; m: BookMaterials }) {
  const geo = useMemo(() => createRibbon(spineCloth(0)), []);
  const last = useRef(-1);
  useFrame(() => {
    if (Math.abs(anim.cover - last.current) < 1e-6) return;
    last.current = anim.cover;
    updateRibbon(geo, spineCloth(anim.cover));
  });
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={[m.cloth, m.cloth, m.cloth]} castShadow receiveShadow />;
}

/** Rounded rectangle outline (cover plan, x across, y up the book = -z) with ~2.5mm corners. */
function roundedRect(w: number, d: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  s.lineTo(-w / 2 + r, d / 2); s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  return s;
}
/** A 3mm cloth-covered board lying flat (y from 0 to BOARD), corners rounded in plan, edges eased. */
function useBoardGeometry() {
  return useMemo(() => {
    const bevel = 0.04;
    const g = new THREE.ExtrudeGeometry(roundedRect(W - 2 * bevel, D - 2 * bevel, CORNER_R - bevel), {
      depth: BOARD - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6,
    });
    g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0); // extrusion runs up y; shape +y -> book top (-z)
    return g;
  }, []);
}
/** Flat rounded-rect plane facing up (+y) with 0..1 uv (u across, v = 1 at the head), for printed surfaces. */
function usePrintedPlane(w: number, d: number, r: number) {
  return useMemo(() => {
    const g = new THREE.ShapeGeometry(roundedRect(w, d, r), 8);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + d / 2) / d);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [w, d, r]);
}

/** Front cover: board + printed cloth front + paper label + endpaper inside. Modelled closed; turned by coverPose. */
function FrontCover({ anim, m }: { anim: Anim; m: BookMaterials }) {
  const outer = useRef<THREE.Group>(null);
  const board = useBoardGeometry(), face = usePrintedPlane(W, D, CORNER_R), endpaper = usePrintedPlane(W - 0.2, D - 0.2, CORNER_R);
  useFrame(() => {
    const g = outer.current; if (!g) return;
    const pose = coverPose(anim.cover);
    g.position.set(pose.F[0], pose.F[1], 0); g.rotation.z = pose.A;
  });
  // label: 15% from the left, 8% from the bottom of the cover (its soft shadow is baked into the cover art)
  const lx = -W / 2 + 0.15 * W + LABEL_CM[0] / 2, lz = D / 2 - 0.08 * D - LABEL_CM[1] / 2;
  return (
    <group ref={outer} position={[Q0[0], Q0[1], 0]}>
      <group position={[-Q0[0], -Q0[1], 0]}>
        <mesh geometry={board} material={m.cloth} position-y={T - BOARD} castShadow receiveShadow />
        <mesh geometry={face} material={m.cover} position-y={T + 0.003} receiveShadow />
        {/* endpaper on the inside of the board (faces down while closed, up when open) */}
        <mesh geometry={endpaper} material={m.inside} position-y={T - BOARD - 0.001} rotation-x={Math.PI} receiveShadow />
        <mesh material={m.label} position={[lx, T + 0.003 + 0.022, lz]} rotation-x={-Math.PI / 2} castShadow receiveShadow>
          <boxGeometry args={[LABEL_CM[0], LABEL_CM[1], 0.02]} />
        </mesh>
      </group>
    </group>
  );
}

/** Back board, cloth covered. */
function BackBoard({ m }: { m: BookMaterials }) {
  const board = useBoardGeometry();
  return <mesh geometry={board} material={m.cloth} castShadow receiveShadow />;
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

/** "Close" on the first page you see: the left page on wide screens; on phones, where the camera frames
 *  only the right page, its upper left corner (phones have no Esc key, so it must stay reachable). */
const CLOSE_PX: [number, number] = [30, 30];
function PageClose({ layer }: { layer: CssLayer }) {
  const desk = useThree(s => s.size.width) >= DESK_MIN;
  const obj = useMemo(() => {
    const o = new CSS3DObject(layer.close);
    if (desk) {
      const c = sheetCurve(SHEETS - 1, 1), n = c.pts.length - 1;
      const i = Math.round(n * (SHEET_W - 2.2) / SHEET_W), p = c.pts[i], a = c.heads[Math.min(i, c.heads.length - 1)];
      o.position.set(p[0], p[1] + 0.06, BLOCK.z0 + 1.3);
      // lie flat on the page, then follow its slope
      o.rotation.order = "ZYX"; o.rotation.set(-Math.PI / 2, 0, a - Math.PI);
    } else {
      const x = GUTTER_X + (PAGE_LAYOUT.pad + CLOSE_PX[0] / 2) * PX_CM, z = BLOCK.z0 + (28 + CLOSE_PX[1] / 2) * PX_CM;
      o.position.set(x, blockTop(x) + 0.08, z); o.rotation.set(-Math.PI / 2, 0, 0);
    }
    o.scale.setScalar(PX_CM);
    return o;
  }, [layer, desk]);
  return <primitive object={obj} />;
}

function BookModel({ anim, onOpen, layer, m }: { anim: Anim; onOpen: () => void; layer: CssLayer; m: BookMaterials }) {
  const block = useBlockGeometry();
  const [hover, setHover] = useState(false);
  useEffect(() => { document.body.style.cursor = hover ? "pointer" : ""; return () => { document.body.style.cursor = ""; }; }, [hover]);
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (anim.target === 0) onOpen(); };
  return (
    <group position-y={FAB} onClick={click} onPointerOver={() => setHover(anim.target === 0)} onPointerOut={() => setHover(false)}>
      <BackBoard m={m} />
      <mesh geometry={block} material={m.block} castShadow receiveShadow />
      <Sheet k={SHEETS} anim={anim} front={m.rightPage} back={m.pageBack} />
      {Array.from({ length: SHEETS }, (_, k) => (
        <Sheet key={k} k={k} anim={anim} front={m.pageFront} back={k === SHEETS - 1 ? m.leftPage : m.pageBack} />
      ))}
      <SpineCloth anim={anim} m={m} />
      <FrontCover anim={anim} m={m} />
      <PageControls anim={anim} layer={layer} />
      <PageClose layer={layer} />
    </group>
  );
}

// ---- camera ----
const FOV = 22;
// closed: the backdrop photo's camera height, so the book sits on the same table as the yarn. Measured
// from the granny square (a true square): corners at (1152,542) (1382,632) (1260,802) (1020,692) in
// hero-bg.webp -> seen from ~45 degrees above the table. The book is turned ~15 degrees on the table.
const CLOSED_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 45), THREE.MathUtils.degToRad(15));
// open: high and from the front, so the spread reads like a page
const OPEN_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 72), 0);
const fit = (hw: number, hh: number, aspect: number) => { const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2)); return Math.max(hh / t, hw / (t * aspect)); };

// The hero is laid out on a "stage" with the design comp's proportions (1871 x 841), centred on screen,
// width = min(screen width, screen height x 2.225 x 1.08) (see .hero-stage in globals.css). The book sits
// at a fixed spot on that stage: 25% of its width, its lower right corner just touching the backdrop's
// lavender motif (the backdrop is drawn at 0.732x, so the motif lands ~3% left of the comp's, and the
// comp's 58% / 56% would cover it).
const STAGE = { w: 1871, h: 841, crop: 1.08, cx: 0.54, cy: 0.505, bookW: 0.25 };
const DESK_MIN = 900; // below this the hero uses the phone layout
function photoSpot(vw: number, vh: number) {
  const sw = Math.min(vw, vh * STAGE.w / STAGE.h * STAGE.crop), sh = sw * STAGE.h / STAGE.w, x0 = (vw - sw) / 2, y0 = (vh - sh) / 2;
  return { x: x0 + STAGE.cx * sw, y: y0 + STAGE.cy * sh, w: STAGE.bookW * sw };
}

// closed book's bounding box (book frame, lifted by FAB)
const BOX = (() => {
  const ex = W / 2, ez = D / 2, y0 = FAB - FAB, y1 = FAB + T + FAB;
  const out: THREE.Vector3[] = [];
  for (const x of [-ex, ex]) for (const y of [y0, y1]) for (const z of [-ez, ez]) out.push(new THREE.Vector3(x, y, z));
  return out;
})();

/** Phones: the book sits centred, 62% of the screen wide, at 46% of the height (logo above, button below). */
function phoneSpot(vw: number, vh: number) { return { x: vw / 2, y: vh * 0.46, w: vw * 0.62 }; }

/** Camera distance and lens shift that put the closed book at its spot (in the photo, or the phone layout). */
function closedAnchor(vw: number, vh: number, tgt: THREE.Vector3, spot: { x: number; y: number; w: number }) {
  const cam = new THREE.PerspectiveCamera(FOV, vw / vh, 1, 1000);
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
  const anchor = useMemo(() => closedAnchor(size.width, size.height, cTgt, desk ? photoSpot(size.width, size.height) : phoneSpot(size.width, size.height)), [desk, size.width, size.height, cTgt]);
  const v = useMemo(() => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), dir: new THREE.Vector3() }), []);
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera, aspect = size.width / size.height, e = anim.cam;
    const cDist = anchor.d;
    const leftEdge = GUTTER_X - (BLOCK.x1 - BLOCK.x0) - 0.6, rightEdge = BLOCK.x1 + 0.4;
    const oTgt = !desk ? new THREE.Vector3((GUTTER_X + BLOCK.x1) / 2, FAB + BLOCK.y1, 0) : new THREE.Vector3((leftEdge + rightEdge) / 2, FAB + T * 0.6, 0.6);
    const oDist = !desk ? fit((BLOCK.x1 - GUTTER_X) / 2 / 0.92, D / 2 / 0.7, aspect) : fit((rightEdge - leftEdge) / 2 / 0.52, D / 2 / 0.64, aspect); // open spread ~52% of the width
    v.dir.copy(CLOSED_DIR).lerp(OPEN_DIR, e).normalize();
    v.tgt.copy(cTgt).lerp(oTgt, e);
    const bump = 1 + 0.35 * Math.sin(Math.PI * e); // the cover swings towards the camera mid-way
    v.pos.copy(v.tgt).addScaledVector(v.dir, THREE.MathUtils.lerp(cDist, oDist, e) * bump);
    cam.position.copy(v.pos); cam.up.set(0, 1, 0); cam.lookAt(v.tgt);
    // lens shift: closed, the book sits at its spot in the photo; it glides to the centre as it opens
    cam.setViewOffset(size.width, size.height, anchor.shiftX * (1 - e), anchor.shiftY * (1 - e), size.width, size.height);
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
      {/* key light = the backdrop photo's light: from the upper left and behind, so shadows fall soft and short
          to the lower right on screen, like the hook's and the granny square's in the photo; weak fill opposite */}
      <directionalLight position={[-26, 42, -14]} intensity={1.5} color="#fff4e6" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={18} shadow-blurSamples={24}>
        <orthographicCamera attach="shadow-camera" args={[-26, 26, 26, -26, 1, 100]} />
      </directionalLight>
      <directionalLight position={[22, 12, 18]} intensity={0.35} color="#f1eeff" />
      <BookModel anim={anim} onOpen={() => setOpen(true)} layer={layer} m={m} />
      {/* the desk: invisible except for the book's cast shadow (the canvas is transparent over the photo) */}
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial transparent opacity={0.2} color="#4a3128" />
      </mesh>
      {/* contact shadow where the book touches the desk */}
      <ContactShadows position={[0, 0.002, 0]} scale={80} blur={2.4} far={4} opacity={0.38} resolution={1024} color="#5a3e33" frames={Infinity} />
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
      {createPortal(<button type="button" className="page3d-close" style={{ width: CLOSE_PX[0], height: CLOSE_PX[1] }} onClick={() => setOpen(false)} aria-label="Close the book">‹</button>, layer.close)}
      {/* the printed page text, for screen readers */}
      <div className="sr" lang="en">
        <p>Yarnity / Intelligent Crochet</p>
        <p>Your creativity. Our intelligence. Every stitch, together.</p>
        <p>Generate your patterns with AI. Track every stitch. Bring your ideas to life.</p>
      </div>
    </div>
  );
}
