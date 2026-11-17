"use client";
// WebGL book: a cloth hardcover (design "C": lavender book cloth, the bird picture printed on the front,
// a paper label), rendered with React Three Fiber. Opening is staged like stop motion: the cover swings
// open, then six sheets turn one after another, bowing like paper, while the camera rises to look down
// on the spread. Geometry: geometry.ts / meshes.ts. Materials: materials.ts. Cover art: ../coverArt.ts.
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { useReducedMotion } from "../useBookState";
import { useBook } from "../BookProvider";
import { WizardLeft, WizardRight } from "../WizardSpread";
import {
  BLOCK, blockTop, BOARD, CORNER_R, coverPose, D, FAB, FORE_CONCAVE, GUTTER_X, Q0, sheetCurve, SHEET_W, SHEETS, spineCloth, T, W,
} from "./geometry";
import { createRibbon, createSheet, updateRibbon, updateSheet } from "./meshes";
import { LABEL_CM, useBookMaterials, type BookMaterials } from "./materials";
import { PAGE_D, PAGE_H_PX, PAGE_PX, PX_CM } from "./paperTextures";
import { LeftPage, RightPage } from "../PageSpread";
import { cssVar } from "../coverArt";

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

// ---- page content: one real DOM box per page (PageSpread.tsx), laid on the open spread with CSS3DRenderer ----
// drei <Html> was tried in an earlier 3D version: its separate React root ends up empty under Strict Mode,
// so the DOM is rendered through a portal into the element given to CSS3DObject (keeps the Next router).
// The boxes sit flat on the pages: the right page is flat past the gutter; the left page (back of the
// last turned sheet) is flat from ~4cm out, and its content is centred, away from the curl.
interface CssLayer { renderer: CSS3DRenderer; left: HTMLDivElement; right: HTMLDivElement }
const LEFT_Y = (() => { const c = sheetCurve(SHEETS - 1, 1); return c.pts[c.pts.length - 1][1]; })();
const PAGE_LIFT = 0.06;
function PageBox({ el, x, y }: { el: HTMLDivElement; x: number; y: number }) {
  const obj = useMemo(() => {
    el.style.width = PAGE_PX + "px"; el.style.height = PAGE_H_PX + "px";
    const o = new CSS3DObject(el);
    o.position.set(x, y, (BLOCK.z0 + BLOCK.z1) / 2); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.setScalar(PX_CM);
    return o;
  }, [el, x, y]);
  return <primitive object={obj} />;
}

/** Shows the page content only once the book is fully open (hidden, inert and out of the tab order
 *  otherwise), and keeps --k = page px per screen px so text never drops below its minimum size. */
function PageControls({ anim, layer }: { anim: Anim; layer: CssLayer }) {
  const els = useMemo(() => [layer.left, layer.right], [layer]);
  const shown = useRef<boolean | null>(null), lastK = useRef(0);
  const camera = useThree(s => s.camera), size = useThree(s => s.size);
  const a = useMemo(() => new THREE.Vector3(), []), b = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const o = clamp01((anim.t - 0.9) / 0.1);
    for (const el of els) el.style.opacity = String(o);
    const vis = anim.t >= 0.999;
    if (vis !== shown.current) { shown.current = vis; for (const el of els) { el.inert = !vis; el.style.pointerEvents = vis ? "auto" : "none"; } }
    if (o > 0) {
      const y = FAB + blockTop(BLOCK.x1);
      a.set(GUTTER_X, y, 0).project(camera); b.set(GUTTER_X + SHEET_W, y, 0).project(camera);
      const px = Math.abs(b.x - a.x) / 2 * size.width, k = px > 1 ? PAGE_PX / px : 1;
      if (Math.abs(k - lastK.current) > 0.01) { lastK.current = k; for (const el of els) el.style.setProperty("--k", k.toFixed(3)); }
    }
  });
  return (
    <>
      <PageBox el={layer.left} x={GUTTER_X - SHEET_W / 2} y={LEFT_Y + PAGE_LIFT} />
      <PageBox el={layer.right} x={GUTTER_X + SHEET_W / 2} y={blockTop(BLOCK.x1) + PAGE_LIFT} />
    </>
  );
}

/** Lavender ribbon bookmark: from the gutter, out past the tail of the book; seen only when open. */
function Bookmark({ anim }: { anim: Anim }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: cssVar("--book-lav", "#C4B5DD"), roughness: 0.9, metalness: 0, transparent: true, opacity: 0, side: THREE.DoubleSide }), []);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => { const o = clamp01((anim.t - 0.9) / 0.1); mat.opacity = o; if (mesh.current) mesh.current.visible = o > 0; });
  useEffect(() => () => mat.dispose(), [mat]);
  const len = 4.2, z0 = BLOCK.z1 - 2.4;
  return (
    <mesh ref={mesh} material={mat} position={[GUTTER_X - 0.45, LEFT_Y + 0.02, z0 + len / 2]} rotation-x={-Math.PI / 2} rotation-z={0.03} receiveShadow>
      <planeGeometry args={[0.55, len]} />
    </mesh>
  );
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
      <Bookmark anim={anim} />
    </group>
  );
}

const SHADOW_COLOR = "#6E5A52"; // warm grey-brown, from the floor beside the skeins in the photo

// ---- camera ----
const FOV = 22;
// closed: the backdrop photo's camera height, so the book sits on the same table as the yarn. Measured
// from the granny square (a true square): corners at (1152,542) (1382,632) (1260,802) (1020,692) in
// hero-bg.webp -> seen from ~45 degrees above the table. The book is turned ~15 degrees on the table.
const CLOSED_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 45), THREE.MathUtils.degToRad(15));
// open: nearly straight down (86 degrees), like the design comp (legacy/pic/book_refer.png), so the pages
// read flat; not exactly 90, where lookAt with up = +y degenerates
const OPEN_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 86), 0);
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
    const oDist = !desk ? fit((BLOCK.x1 - GUTTER_X) / 2 / 0.92, D / 2 / 0.7, aspect) : fit((rightEdge - leftEdge) / 2 / Math.min(0.68, 1320 / size.width), D / 2 / 0.88, aspect); // open spread: 68% of the width (max 1320px), at most 88% of the height
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

function Scene({ open, instant, onOpen, reduce, layer }: { open: boolean; instant: boolean; onOpen: () => void; reduce: boolean; layer: CssLayer }) {
  const anim = useMemo<Anim>(() => { const a: Anim = { t: 0, target: 0, cover: 0, sheets: [], cam: 0 }; derive(a); return a; }, []);
  const m = useBookMaterials();
  const invalidate = useThree(s => s.invalidate), gl = useThree(s => s.gl), camera = useThree(s => s.camera), sceneRef = useThree(s => s.scene);
  const [shadowK] = useState(() => { const v = parseFloat(cssVar("--book-shadow", "1")); return Number.isFinite(v) ? v : 1; });
  // instant: refresh, typed address, or arriving from a page without the book -> no opening motion
  useEffect(() => { anim.target = open ? 1 : 0; if (reduce || instant) { anim.t = anim.target; derive(anim); } invalidate(); }, [open, instant, reduce, anim, invalidate]);
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
      {/* Light matched to the photo's objects: a broad, soft studio light from above (a big white softbox in
          the environment + sky/ground fill), with only a weak directional light from the upper left for
          direction and self-shadowing inside the book. Low contrast between the cover and the page edges. */}
      <Environment resolution={256} frames={1} background={false}>
        <Lightformer form="rect" intensity={2.4} color="#fffaf3" position={[-4, 30, 2]} rotation-x={Math.PI / 2} scale={[46, 40, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#fff6ee" position={[-16, 14, 10]} scale={[24, 16, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.7} color="#ffffff" position={[14, 10, 14]} scale={[22, 12, 1]} target={[0, 0, 0]} />
      </Environment>
      <hemisphereLight args={["#fffaf4", "#eadcd2", 1.05]} />
      <directionalLight position={[-22, 52, -22]} intensity={0.7} color="#fff4e6" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={32} shadow-blurSamples={32}>
        <orthographicCamera attach="shadow-camera" args={[-26, 26, 26, -26, 1, 100]} />
      </directionalLight>
      <BookModel anim={anim} onOpen={onOpen} layer={layer} m={m} />
      {/* the book's shadow on the desk, in two layers like the photo's skeins: a narrow dark contact line where
          it touches, and a broad very soft shadow spreading to the lower right. Warm grey-brown (sampled
          beside the skeins), not black; darkness follows --book-shadow */}
      {/* broad soft layer: the key light's shadow map, falling to the lower right (follows the book as it opens) */}
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial transparent opacity={0.38 * shadowK} color={SHADOW_COLOR} />
      </mesh>
      {/* narrow dark contact line where the book touches the desk */}
      <ContactShadows position={[0, 0.002, 0]} scale={60} blur={1.6} far={2.2} opacity={0.55 * shadowK} resolution={1024} color={SHADOW_COLOR} frames={Infinity} />
    </>
  );
}

export default function Book3D({ onFail }: { onFail: () => void }) {
  const b = useBook(), open = b.view === "home" || b.view === "wizard";
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();
  const cssHost = useRef<HTMLDivElement>(null);
  const [layer] = useState<CssLayer>(() => {
    const mk = (id: string) => { const el = document.createElement("div"); el.id = id; el.style.opacity = "0"; el.inert = true; return el; };
    const renderer = new CSS3DRenderer(); renderer.domElement.className = "css3d-layer";
    return { renderer, left: mk("bookLeft"), right: mk("bookRight") };
  });
  useEffect(() => { cssHost.current!.appendChild(layer.renderer.domElement); return () => { layer.renderer.domElement.remove(); }; }, [layer]);
  return (
    <div className={"book3d" + (ready ? " ready" : "") + (open ? " is-open" : "")} id="book">
      <Canvas
        dpr={[1, 2]}
        // home: a click on the empty desk around the book closes it. R3F calls this when a click hits none of
        // the objects with handlers (the book's meshes have one; the page content is DOM above the canvas)
        onPointerMissed={() => { if (b.view === "home") b.close(); }} // never in the wizard: a stray click must not leave it
        frameloop="demand"
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ fov: FOV, near: 20, far: 600, position: [0, 60, 80] }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.12; // outputColorSpace stays sRGB (default); exposure set so the lit cloth reads close to its hex (--book-lav)
          gl.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); onFail(); });
          requestAnimationFrame(() => setReady(true));
        }}
      >
        <Scene open={open} instant={b.instant} onOpen={b.open} reduce={reduce} layer={layer} />
      </Canvas>
      {/* film grain over the book and the photo (not over any text: the page DOM and the hero copy sit above) */}
      <div className="book-grain" aria-hidden="true" />
      <div ref={cssHost} />
      {/* the page DOM: the menu spread at home, the wizard spread on /new */}
      {createPortal(b.view === "wizard" ? <WizardLeft /> : <LeftPage />, layer.left)}
      {createPortal(b.view === "wizard" ? <WizardRight /> : <RightPage onClose={b.close} />, layer.right)}
    </div>
  );
}
