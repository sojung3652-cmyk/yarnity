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
import { useBook, type BookView, type WizStep } from "../BookProvider";
import { paintPage } from "./pagePaint";
import { REF_W, WizardSpread } from "../WizardSpread";
import { AiTab } from "@/components/AiTab";
import {
  BLOCK, blockTop, BOARD, CORNER_R, coverPose, D, FAB, FORE_CONCAVE, GUTTER_X, Q0, sheetCurve, SHEET_W, SHEETS, spineCloth, T, W,
} from "./geometry";
import { createRibbon, createSheet, updateRibbon, updateSheet } from "./meshes";
import { LABEL_CM, useBookMaterials, type BookMaterials } from "./materials";
import { PAGE_D, PAGE_H_PX, PAGE_PX, PX_CM } from "./paperTextures";
import { LeftPage, RightPage } from "../PageSpread";
import { cssVar } from "../coverArt";
import { useMobile } from "@/components/mobile/useMobile";
import { MobileBookWizard } from "@/components/mobile/MobileBookWizard";
import { MobileBookPages } from "@/components/mobile/MobileBookPages";
import { BOOK_PAGES, bookPageOf } from "@/components/mobile/bookPages";
import { useSheet } from "@/components/mobile/sheetStore";
import { usePathname } from "next/navigation";

// ---- timeline (seconds) ----
const TOTAL = 1.6;
const COVER_END = 0.9;
const SHEET_START = 0.46, SHEET_STAGGER = 0.075, SHEET_DUR = 0.62;
// stop-motion feel: each sheet turns at a slightly different speed (fixed, so it is the same every time)
const SHEET_SPEED = [1.04, 0.93, 1.08, 0.97, 1.1, 0.91];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// wizard: the open book grows and the camera moves straight above it (0.9s, together with the first turn)
const WIZ_TOTAL = 0.9;

// a page turn between two spreads (menu <-> wizard steps)
const TURN = 0.7;

// t: opening (0 closed .. 1 open). w: open menu (0) .. wizard pose (1). turn: the leaf turning between
// spreads (leafP: 0 = lying on the right, 1 = on the left).
interface Turn { f: number; dur: number; fwd: boolean; started: boolean; done: () => void }
interface Anim { t: number; target: number; cover: number; sheets: number[]; cam: number; w: number; wTarget: number; wcam: number; turn: Turn | null; leafP: number;
  /** phones (< 768px) only: how much taller the open book grows, so its right page fills the screen's height
   *  (the book is stretched head to tail by 1 + (sz - 1) x cam as it opens; the page DOM box is made taller,
   *  not stretched, so the type keeps its shape) */
  sz?: number }
function derive(a: Anim) {
  const s = a.t * TOTAL;
  a.cover = ease(clamp01(s / COVER_END));
  a.sheets = SHEET_SPEED.map((f, k) => ease(clamp01((s - SHEET_START - k * SHEET_STAGGER) / (SHEET_DUR / f))));
  a.cam = ease(a.t);
  a.wcam = ease(a.w);
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
interface CssLayer {
  renderer: CSS3DRenderer; left: HTMLDivElement; right: HTMLDivElement;
  /** wizard pages: plain screen-aligned boxes (no CSS 3D transform), laid exactly over the pages */
  flatLeft: HTMLDivElement; flatRight: HTMLDivElement;
  /** called by the camera rig each frame after the camera moved */
  afterCamera?: () => void;
  /** a page turn is running: the page DOM is hidden and inert (the leaf carries pictures of it) */
  turning?: boolean;
}
const LEFT_Y = (() => { const c = sheetCurve(SHEETS - 1, 1); return c.pts[c.pts.length - 1][1]; })();
const PAGE_LIFT = 0.06;
function PageBox({ el, x, y, sz = 1 }: { el: HTMLDivElement; x: number; y: number; sz?: number }) {
  const obj = useMemo(() => {
    // sz > 1 (phones): the book is stretched head to tail by sz, so the box is sz times taller and scaled
    // back by 1 / sz along its height - the page is longer, its type is not stretched
    el.style.width = PAGE_PX + "px"; el.style.height = Math.round(PAGE_H_PX * sz) + "px";
    el.style.setProperty("--sz", String(sz)); // the menu page keeps its spacing (mobile.css)
    const o = new CSS3DObject(el);
    o.position.set(x, y, (BLOCK.z0 + BLOCK.z1) / 2); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.set(PX_CM, PX_CM / sz, PX_CM);
    return o;
  }, [el, x, y, sz]);
  return <primitive object={obj} />;
}

/** Shows the page content only once the book is fully open (hidden, inert and out of the tab order
 *  otherwise), and keeps --k = page px per screen px so text never drops below its minimum size. */
function PageControls({ anim, layer, sz }: { anim: Anim; layer: CssLayer; sz?: number }) {
  const els = useMemo(() => [layer.left, layer.right], [layer]);
  const shown = useRef<boolean | null>(null), lastK = useRef(0);
  const camera = useThree(s => s.camera), size = useThree(s => s.size);
  const a = useMemo(() => new THREE.Vector3(), []), b = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    // the menu shows once the book is open and the camera is back from the wizard pose (never mid-turn)
    const home = anim.w <= 0.001 && !layer.turning, o = home ? clamp01((anim.t - 0.9) / 0.1) : 0;
    for (const el of els) el.style.opacity = String(o);
    const vis = anim.t >= 0.999 && home;
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
      <PageBox el={layer.left} x={GUTTER_X - SHEET_W / 2} y={LEFT_Y + PAGE_LIFT} sz={sz} />
      <PageBox el={layer.right} x={GUTTER_X + SHEET_W / 2} y={blockTop(BLOCK.x1) + PAGE_LIFT} sz={sz} />
    </>
  );
}

/** Wizard pages as flat DOM: once the camera looks straight down on the book (wizard pose reached),
 *  each page is a rectangle on screen, so its DOM box is placed there with left/top/width/height
 *  (whole pixels) and laid out at the original /new page width, zoomed to fit (WizardSpread.tsx):
 *  no CSS 3D transform, so the text is as sharp as any page text. Hidden while the camera moves. */
function FlatPages({ anim, layer }: { anim: Anim; layer: CssLayer }) {
  const camera = useThree(s => s.camera), size = useThree(s => s.size);
  const shown = useRef<boolean | null>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const els = [layer.flatLeft, layer.flatRight];
    const place = (el: HTMLDivElement, cx: number, y: number) => {
      const p = (x: number, z: number) => { v.set(x, FAB + y, z).project(camera); return [(v.x + 1) / 2 * size.width, (1 - v.y) / 2 * size.height]; };
      const [x0, y0] = p(cx - SHEET_W / 2, BLOCK.z0), [x1, y1] = p(cx + SHEET_W / 2, BLOCK.z1);
      const l = Math.round(Math.min(x0, x1)), t = Math.round(Math.min(y0, y1)), w = Math.round(Math.abs(x1 - x0)), h = Math.round(Math.abs(y1 - y0));
      const z = w / REF_W;
      Object.assign(el.style, { left: l + "px", top: t + "px", width: w + "px", height: h + "px" });
      el.style.setProperty("--z", z.toFixed(4)); el.style.setProperty("--hz", (h / z).toFixed(2));
    };
    layer.afterCamera = () => {
      const vis = anim.t >= 0.999 && anim.w >= 0.999 && !layer.turning;
      if (vis !== shown.current) { shown.current = vis; for (const el of els) { el.classList.toggle("is-shown", vis); el.inert = !vis; } }
      if (!vis) return;
      place(layer.flatLeft, GUTTER_X - SHEET_W / 2, LEFT_Y + PAGE_LIFT);
      place(layer.flatRight, GUTTER_X + SHEET_W / 2, blockTop(BLOCK.x1) + PAGE_LIFT);
    };
    return () => { layer.afterCamera = undefined; };
  }, [anim, layer, camera, size, v]);
  return null;
}

/** The leaf that turns between spreads: one sheet on the gutter, bowing as it turns (sheetCurve: the
 *  spine side leads, the fore edge lags), its two faces printed with pictures of the pages
 *  (front = a right page, back = a left page; the same uv and un-mirroring as the spread's own pages).
 *  Lifted 0.12mm so it never fights with the page it lands on. Only there while a turn runs. */
function Leaf({ anim, mat }: { anim: Anim; mat: { front: THREE.Material; back: THREE.Material } }) {
  const geo = useMemo(() => createSheet(PAGE_D), []);
  const g = useRef<THREE.Group>(null), last = useRef(-1);
  useFrame(() => {
    const on = !!anim.turn; if (g.current) g.current.visible = on;
    if (!on || Math.abs(anim.leafP - last.current) < 1e-6) return;
    last.current = anim.leafP;
    const c = sheetCurve(SHEETS - 1, anim.leafP); updateSheet(geo, c.pts, c.heads);
  });
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group ref={g} position-y={0.012} visible={false}>
      <mesh geometry={geo} material={mat.front} castShadow receiveShadow />
      <mesh geometry={geo} material={mat.back} castShadow receiveShadow />
    </group>
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

function BookModel({ anim, onOpen, layer, m, leaf, sz }: { anim: Anim; onOpen: () => void; layer: CssLayer; m: BookMaterials; leaf: { front: THREE.Material; back: THREE.Material }; sz?: number }) {
  const grp = useRef<THREE.Group>(null);
  useFrame(() => { if (grp.current) grp.current.scale.z = 1 + ((anim.sz ?? 1) - 1) * anim.cam; });
  const block = useBlockGeometry();
  const [hover, setHover] = useState(false);
  useEffect(() => { document.body.style.cursor = hover ? "pointer" : ""; return () => { document.body.style.cursor = ""; }; }, [hover]);
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (anim.target === 0) onOpen(); };
  return (
    <group ref={grp} position-y={FAB} onClick={click} onPointerOver={() => setHover(anim.target === 0)} onPointerOut={() => setHover(false)}>
      <BackBoard m={m} />
      <mesh geometry={block} material={m.block} castShadow receiveShadow />
      <Sheet k={SHEETS} anim={anim} front={m.rightPage} back={m.pageBack} />
      {Array.from({ length: SHEETS }, (_, k) => (
        <Sheet key={k} k={k} anim={anim} front={m.pageFront} back={k === SHEETS - 1 ? m.leftPage : m.pageBack} />
      ))}
      <SpineCloth anim={anim} m={m} />
      <FrontCover anim={anim} m={m} />
      <PageControls anim={anim} layer={layer} sz={sz} />
      <FlatPages anim={anim} layer={layer} />
      <Leaf anim={anim} mat={leaf} />
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
const STRAIGHT_DOWN = new THREE.Vector3(0, 1, 0), HEAD_UP = new THREE.Vector3(0, 0, -1);
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

// ---- phones under 768px (the mobile flow, components/mobile/MobileStage.tsx); 768px and up never use these ----
export const PHONE_MAX = 767.98;
// closed: as the web's phone layout (phoneSpot: 62% wide at 46% of the height, seen from 45 degrees, turned
// 15 degrees on the desk); one tap comes closer and opens it, as on the web. Open: the book grows head to
// tail until its right page fills the height (Scene: sz), from 36px (the left page shows 36px at the left
// edge) to 14px before the right edge, 40px below the top (the AI tab sticks up from the page's head there), above the
// 90px kept free at the bottom for the floating menu.
const PHONE = { leftShow: 36, rightGap: 14, bottomKeep: 90, topGap: 40 };
/** phones: how much taller the open book is, so the right page fills the free height (>= 1) */
const phoneStretch = (vw: number, vh: number) => Math.max(1, (SHEET_W * (vh - PHONE.topGap - PHONE.bottomKeep) / (vw - PHONE.leftShow - PHONE.rightGap)) / D);

/** Phones: the book sits centred, 62% of the screen wide, at 46% of the height (logo above, button below). */
function phoneSpot(vw: number, vh: number) { return { x: vw / 2, y: vh * 0.46, w: vw * 0.62 }; }

/** Camera distance and lens shift that put the closed book at its spot (in the photo, or the phone layout). */
function closedAnchor(vw: number, vh: number, tgt: THREE.Vector3, spot: { x: number; y: number; w: number }, dir = CLOSED_DIR) {
  const cam = new THREE.PerspectiveCamera(FOV, vw / vh, 1, 1000);
  const project = (d: number) => {
    cam.position.copy(tgt).addScaledVector(dir, d); cam.up.set(0, 1, 0); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of BOX) { const q = p.clone().project(cam); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    return { w: (x1 - x0) / 2 * vw, cx: ((x0 + x1) / 2 + 1) / 2 * vw, cy: (1 - (y0 + y1) / 2) / 2 * vh };
  };
  let d = 100;
  for (let i = 0; i < 4; i++) d *= project(d).w / spot.w; // projected width ~ 1/d: converges in a few steps
  const p = project(d);
  return { d, shiftX: p.cx - spot.x, shiftY: p.cy - spot.y };
}

function CameraRig({ anim, layer, wizard }: { anim: Anim; layer: CssLayer; wizard: boolean }) {
  const { camera, size, scene } = useThree();
  useEffect(() => { layer.renderer.setSize(size.width, size.height); }, [layer, size]);
  const cTgt = useMemo(() => new THREE.Vector3(0, FAB + T / 2, 0), []);
  const desk = size.width >= DESK_MIN, phone = size.width <= PHONE_MAX;
  const anchor = useMemo(() => closedAnchor(size.width, size.height, cTgt, desk ? photoSpot(size.width, size.height) : phoneSpot(size.width, size.height)), [desk, size.width, size.height, cTgt]);
  // phones: the closed book's framing at the current zoom (recomputed only while zooming), and the desk photo
  // scaled with it around the same point so the book does not slide on the desk

  const v = useMemo(() => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), dir: new THREE.Vector3(), up: new THREE.Vector3(), wTgt: new THREE.Vector3() }), []);
  // wizard: the top nav stays visible, so the book is fitted (and centred) in the space under it
  const [navH, setNavH] = useState(0);
  useEffect(() => { setNavH(wizard ? Math.round(document.querySelector(".nav")?.getBoundingClientRect().bottom ?? 0) : 0); }, [size, wizard]);
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera, aspect = size.width / size.height, e = anim.cam, we = anim.wcam;
    const cAnchor = anchor;
    const cDist = cAnchor.d;
    const leftEdge = GUTTER_X - (BLOCK.x1 - BLOCK.x0) - 0.6, rightEdge = BLOCK.x1 + 0.4;
    const oTgt = !desk ? new THREE.Vector3((GUTTER_X + BLOCK.x1) / 2, FAB + BLOCK.y1, 0) : new THREE.Vector3((leftEdge + rightEdge) / 2, FAB + T * 0.6, 0.6);
    const pw = (size.width - PHONE.leftShow - PHONE.rightGap) / size.width, ph = (size.height - PHONE.bottomKeep - PHONE.topGap) / size.height;
    const oDist = phone ? fit((BLOCK.x1 - GUTTER_X) / 2 / pw, D * (anim.sz ?? 1) / 2 / ph, aspect) : !desk ? fit((BLOCK.x1 - GUTTER_X) / 2 / 0.92, D / 2 / 0.7, aspect) : fit((rightEdge - leftEdge) / 2 / Math.min(0.68, 1320 / size.width), D / 2 / 0.88, aspect); // open spread: 68% of the width (max 1320px), at most 88% of the height
    // wizard pose: straight down, so the pages read flat and square; as big as fits: cover to cover up to
    // 96% of the screen wide (max 1700px), whole in the height (no nav in the wizard, like home; 8px room)
    // fitted to the whole open book, cover to cover: the front cover lies left of the spine cloth
    // (spine at -W/2, the flat spine cloth ~T wide, then the board), the back board ends at W/2
    const room = Math.max(200, size.height - navH - 16);
    const coverL = -W / 2 - T - W - 0.3, coverR = W / 2 + 0.3;
    const wDist = fit((coverR - coverL) / 2 / Math.min(0.96, 1700 / size.width), D / 2 / (room / size.height), aspect);
    v.wTgt.set((coverL + coverR) / 2, FAB + T * 0.6, 0);
    v.dir.copy(CLOSED_DIR).lerp(OPEN_DIR, e).lerp(STRAIGHT_DOWN, we).normalize();
    v.tgt.copy(cTgt).lerp(oTgt, e).lerp(v.wTgt, we);
    const bump = 1 + 0.35 * Math.sin(Math.PI * e); // the cover swings towards the camera mid-way
    v.pos.copy(v.tgt).addScaledVector(v.dir, THREE.MathUtils.lerp(THREE.MathUtils.lerp(cDist, oDist, e) * bump, wDist, we));
    // up: +y for the tilted views; the book's head (-z) when looking straight down (lookAt degenerates with +y there)
    v.up.set(0, 1, 0).lerp(HEAD_UP, we).normalize();
    cam.position.copy(v.pos); cam.up.copy(v.up); cam.lookAt(v.tgt);
    // lens shift: closed, the book sits at its spot in the photo; it glides to the centre as it opens;
    // in the wizard it moves down by half the nav, to the middle of the space under it
    // phones, open: the right page's centre moves right of the screen's centre (the left page's 36px show) and
    // up (the bottom 90px kept free)
    const oShiftX = phone ? -(PHONE.leftShow - PHONE.rightGap) / 2 : 0, oShiftY = phone ? (PHONE.bottomKeep - PHONE.topGap) / 2 : 0;
    cam.setViewOffset(size.width, size.height, cAnchor.shiftX * (1 - e) + oShiftX * e, cAnchor.shiftY * (1 - e) + oShiftY * e - (navH / 2) * we, size.width, size.height);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(); scene.updateMatrixWorld();
    layer.renderer.render(scene, camera); // the DOM page buttons follow the same camera
    layer.afterCamera?.(); // ... and the wizard's flat pages
  });
  return null;
}

// ---- spreads and the turns between them ----
/** phones only - `page`: a screen shown as the open book's right page (components/mobile/bookPages.ts);
 *  `sheet`: which sheet of a 도안 만들기 step (components/mobile/sheetStore.ts) */
export interface Spread { view: BookView; step: WizStep; page?: string; sheet?: number }
const spreadKey = (s: Spread) => (s.page ? "p" + s.page : s.view === "wizard" ? "w" + s.step + (s.sheet != null ? "-" + s.sheet : "") : s.view);
const isSpread = (s: Spread) => s.view === "home" || s.view === "wizard";
const order = (s: Spread) => (s.page ? BOOK_PAGES[s.page] : s.view === "wizard" ? (s.sheet != null ? s.step * 2 + s.sheet : s.step) : 0); // menu, the four steps (phones: then 도안집, 도안, 따라 뜨기)
const frames = (n: number) => new Promise<void>(res => { const f = () => (--n <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
/** Texture width of a page picture: the page's size on screen x pixel ratio, so a texel is about a screen
 *  pixel (a 2x bigger picture, minified, came out blurred and lighter than the live text). */
function leafRes(layer: CssLayer, wiz: boolean) {
  const w = wiz ? layer.flatRight.getBoundingClientRect().width : PAGE_PX / (parseFloat(layer.left.style.getPropertyValue("--k")) || 1);
  return Math.round(Math.min(2048, Math.max(512, (w || 640) * Math.min(2, devicePixelRatio || 1))));
}

// The page DOM is a flat box from the gutter out, but the paper it lies on curls down into the gutter, so
// along the paper (texture u) the page is a little longer than across the box. The pictures are warped
// column by column so every point lands under the same spot of the live page (else the text doubled up
// for a moment when the DOM faded back in). Curves: the right page (the sheet under the turning ones) and
// the left page (the last turned sheet), as the spread's meshes use them.
const RIGHT_CURVE = sheetCurve(SHEETS, 0).pts, LEFT_CURVE = sheetCurve(SHEETS - 1, 1).pts;
// Only the page's content (a transparent picture) is warped and darkened; it is then laid on the very
// paper canvas the page shows the rest of the time. Warping / re-drawing the paper too gave its grain a
// different, stretched pattern, and the paper visibly broke up into pixels the moment the picture went on.
function warpToPaper(src: HTMLCanvasElement, side: "left" | "right", paper: CanvasImageSource) {
  const W = src.width, H = src.height, ink = document.createElement("canvas"); ink.width = W; ink.height = H;
  const ctx = ink.getContext("2d")!, pts = side === "right" ? RIGHT_CURVE : LEFT_CURVE, n = pts.length - 1;
  // where along the box (0..1, as the box is drawn on screen) the paper point x lies
  const at = (x: number) => Math.min(1, Math.max(0, side === "right" ? (x - GUTTER_X) / SHEET_W : (x - (GUTTER_X - SHEET_W)) / SHEET_W));
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, s0 = at(pts[i][0]) * W, s1 = at(pts[i + 1][0]) * W;
    // right: texture u reads canvas u. left: un-mirrored on the back face, texture u reads canvas 1 - u
    const d0 = side === "right" ? u0 * W : (1 - u1) * W, d1 = side === "right" ? u1 * W : (1 - u0) * W;
    const sa = Math.min(s0, s1), sw = Math.max(0.5, Math.abs(s1 - s0));
    // whole-pixel column edges: no seams and no overlap (an overlap doubled the alpha of the text there)
    const a = Math.round(d0), b = Math.round(d1);
    if (b > a) ctx.drawImage(src, sa, 0, sw, H, a, 0, b - a, H);
  }
  inkForLight(ctx, W, H);
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const o = out.getContext("2d")!; o.drawImage(paper, 0, 0, W, H); o.drawImage(ink, 0, 0);
  return out;
}

/** The book's light (soft environment + tone mapping) lifts dark colours on the paper a little: ink came out
 *  ~30 levels lighter than the same text as DOM. Darken what is darker than the paper by that much
 *  (v -> paper * (v / paper)^1.5), leave the paper itself as it is, so picture and live page match. */
const PAPER = [251, 243, 234]; // #FBF3EA, paperTextures.ts
function inkForLight(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue; // transparent: the paper shows through
    for (let c = 0; c < 3; c++) {
      const r = d[i + c] / PAPER[c];
      if (r < 0.9) d[i + c] = PAPER[c] * Math.pow(r, 1.5);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Pictures of the two pages of a spread as it is now (pagePaint.ts), at the page's own layout size. */
async function paintSpread(layer: CssLayer, s: Spread, paper: { l: CanvasImageSource; r: CanvasImageSource }, phone?: boolean, sz = 1) {
  const wiz = s.view === "wizard" && !phone, res = leafRes(layer, wiz);
  const [L, R] = wiz ? [layer.flatLeft, layer.flatRight] : [layer.left, layer.right];
  const box = wiz ? (() => { const h = REF_W * PAGE_H_PX / PAGE_PX; return { w: REF_W, h, vars: { "--z": "1", "--hz": h.toFixed(2) } }; })()
    : phone
      // phones: the pages are laid out at screen pixels (mobile.css .mbw zooms by --k), and the painter does not
      // follow CSS zoom: paint the page at its on-screen size with --k = 1 instead (same layout, same lines)
      ? (() => { const k = parseFloat(layer.left.style.getPropertyValue("--k")) || 1, w = Math.round(PAGE_PX / k);
          return { w, h: Math.round(PAGE_H_PX * sz / k), vars: { "--k": "1", "--mbw-w": w + "px" } }; })()
      : { w: PAGE_PX, h: Math.round(PAGE_H_PX * sz), vars: { "--k": layer.left.style.getPropertyValue("--k") || "1" } };
  const one = async (host: HTMLElement, side: "left" | "right") => {
    const src = host.firstElementChild as HTMLElement | null;
    const pp = side === "left" ? paper.l : paper.r;
    if (src) return warpToPaper(await paintPage(src, box, side, res, false), side, pp);
    const cv = document.createElement("canvas"); cv.width = res; cv.height = Math.round(res * box.h / box.w);
    cv.getContext("2d")!.drawImage(pp, 0, 0, cv.width, cv.height); return cv;
  };
  const [l, r] = await Promise.all([one(L, "left"), one(R, "right")]);
  return { l, r };
}

/** Moves the book between the spread it shows and the one the address wants. Menu <-> wizard and step to
 *  step turn a leaf (0.7s; 0.9s with the book growing / shrinking between the menu and the wizard pose).
 *  The current pages are painted, the DOM is hidden, the new spread is rendered and painted, then the leaf
 *  turns: forward its front is the old right page and its back the new left page, the page it lands on
 *  keeps the old left page until covered and the revealed one is the new right page; backward mirrored.
 *  The DOM fades back in (0.12s) when the leaf has landed. One turn at a time: a change asked for during a
 *  turn starts when it ends. Reduced motion: no turn, a 0.15s fade. Opening / closing, a refresh, a typed
 *  address or pages without the book: no turn. */
function useSpreads({ want, shown, setShown, instant, reduce, anim, layer, m, leaf, phone }: {
  want: Spread; shown: Spread; setShown: (s: Spread) => void; instant: boolean; reduce: boolean; anim: Anim; layer: CssLayer; m: BookMaterials; leaf: { front: THREE.MeshStandardMaterial; back: THREE.MeshStandardMaterial };
  /** phones: the wizard is on the right page of the open book (no wizard pose, no flat pages) */
  phone?: boolean;
}) {
  const invalidate = useThree(s => s.invalidate), gl = useThree(s => s.gl);
  const busy = useRef(false), [round, setRound] = useState(0);
  useEffect(() => {
    if (busy.current) return;
    const same = spreadKey(want) === spreadKey(shown), turn = !same && isSpread(want) && isSpread(shown) && !instant;
    const poseTo = (s: Spread) => { anim.target = isSpread(s) ? 1 : 0; anim.wTarget = s.view === "wizard" && !phone ? 1 : 0; };
    if (!turn) {
      if (!same) setShown(want);
      poseTo(want);
      if (reduce || instant) { anim.t = anim.target; anim.w = anim.wTarget; derive(anim); }
      invalidate(); return;
    }
    if (reduce) { // no turn: hide, swap, and let the pages fade in (0.15s)
      layer.turning = true; setShown(want); poseTo(want); anim.t = anim.target; anim.w = anim.wTarget; derive(anim); invalidate();
      frames(2).then(() => { layer.turning = false; invalidate(); });
      return;
    }
    busy.current = true;
    const fwd = order(want) > order(shown), dur = want.view !== shown.view ? WIZ_TOTAL : TURN;
    const texOf = (cv: HTMLCanvasElement, left: boolean) => {
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = gl.capabilities.getMaxAnisotropy();
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      // the picture is made at the page's screen size: sample it directly (a mipmap level blurred small type)
      t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
      if (left) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } // back face: un-mirror, as materials.ts does
      return t;
    };
    const keep = { r: m.rightPage.map, l: m.leftPage.map };
    // the plain paper canvases (materials.ts): the pictures are laid on exactly these
    const paperOf = { l: keep.l!.image as CanvasImageSource, r: keep.r!.image as CanvasImageSource };
    let made: THREE.Texture[] = [], landed: { l: THREE.Texture; r: THREE.Texture } | null = null;
    const end = () => {
      // landed: the paper shows the pictures of the new pages and the page DOM fades in over them (the same
      // picture under the same text: no blank paper, no flicker). The plain paper comes back once the fade
      // is done; until then the next turn waits.
      if (landed) { m.leftPage.map = landed.l; m.rightPage.map = landed.r; }
      anim.turn = null; layer.turning = false; invalidate();
      setTimeout(() => {
        if ((window as unknown as { __book3dKeepPictures?: boolean }).__book3dKeepPictures) return; // ?debug: compare picture vs DOM
        m.rightPage.map = keep.r; m.leftPage.map = keep.l;
        made.forEach(t => t.dispose()); made = [];
        busy.current = false; invalidate();
        setRound(r => r + 1); // a change asked for during the turn goes next
      }, 260);
      // focus: the new step's first field (or the menu's first action) once the pages are back
      frames(3).then(() => {
        // a field to type in first (the name is on the right page), then a choice, then a button
        const hosts = want.view === "wizard" && !phone ? [layer.flatLeft, layer.flatRight] : [layer.right];
        const qs = ['.nb-turn input:not([type="color"]), .nb-turn textarea', '.nb-turn [role="radio"][tabindex="0"]', ".nb-turn button, .pg-link"];
        const el = qs.map(q => hosts.map(h => h.querySelector<HTMLElement>(q)).find(Boolean)).find(Boolean) ?? document.getElementById("nbTitle");
        el?.focus({ preventScroll: true });
      });
    };
    (async () => {
      try {
        const old = await paintSpread(layer, shown, paperOf, phone, anim.sz);
        const oL = texOf(old.l, true), oR = texOf(old.r, false); made = [oL, oR];
        // the paper takes the pictures of the pages first, then the DOM goes: no blank page in between
        m.leftPage.map = oL; m.rightPage.map = oR; invalidate();
        await frames(1);
        layer.turning = true; invalidate();
        setShown(want);
        await frames(3); // the new spread rendered (and its layout effects settled), still hidden
        const neu = await paintSpread(layer, want, paperOf, phone, anim.sz);
        const nL = texOf(neu.l, true), nR = texOf(neu.r, false);
        made.push(nL, nR); landed = { l: nL, r: nR };
        // under the leaf: forward, the old left page (until covered) and the new right page (revealed)
        m.leftPage.map = fwd ? oL : nL; m.rightPage.map = fwd ? nR : oR;
        leaf.front.map = fwd ? oR : nR; leaf.back.map = fwd ? nL : oL;
        anim.leafP = fwd ? 0 : 1;
        poseTo(want); // the book grows / shrinks together with the turn
        anim.turn = { f: 0, dur, fwd, started: false, done: end };
        invalidate();
      } catch (e) {
        console.warn("[Book3D] page turn skipped:", e);
        setShown(want); poseTo(want); end();
      }
    })();
  }, [want, shown, setShown, instant, reduce, anim, layer, m, leaf, gl, invalidate, round, phone]);
}

function Scene({ want, shown, setShown, instant, onOpen, reduce, layer }: { want: Spread; shown: Spread; setShown: (s: Spread) => void; instant: boolean; onOpen: () => void; reduce: boolean; layer: CssLayer }) {
  const anim = useMemo<Anim>(() => { const a: Anim = { t: 0, target: 0, cover: 0, sheets: [], cam: 0, w: 0, wTarget: 0, wcam: 0, turn: null, leafP: 0 }; derive(a); return a; }, []);
  const m = useBookMaterials();
  const invalidate = useThree(s => s.invalidate), gl = useThree(s => s.gl), camera = useThree(s => s.camera), sceneRef = useThree(s => s.scene);
  const [shadowK] = useState(() => { const v = parseFloat(cssVar("--book-shadow", "1")); return Number.isFinite(v) ? v : 1; });
  // the leaf's two faces: a right page (front) and a left page (back), as the spread's own pages
  const leaf = useMemo(() => ({ front: m.rightPage.clone(), back: m.leftPage.clone() }), [m]);
  useEffect(() => () => { leaf.front.dispose(); leaf.back.dispose(); }, [leaf]);
  const phoneW = useThree(s => s.size.width) <= PHONE_MAX;
  useSpreads({ want, shown, setShown, instant, reduce, anim, layer, m, leaf, phone: phoneW });
  useEffect(() => {
    // test hook: ?debug lets screenshots freeze the animation at a given progress
    if (!location.search.includes("debug")) return;
    (window as unknown as { __book3d: object }).__book3d = {
      setProgress: (v: number) => { anim.t = v; anim.target = v; invalidate(); }, progress: () => anim.t, frames: () => gl.info.render.frame,
      turn: () => (anim.turn ? +anim.turn.f.toFixed(3) : null), // page turn progress, null when none
      // freeze a running turn at f (0..1) for a screenshot; resume() lets it finish
      holdTurn: (f: number) => { if (anim.turn) { anim.turn.f = f; anim.leafP = anim.turn.fwd ? ease(f) : 1 - ease(f); (anim as unknown as { hold: boolean }).hold = true; invalidate(); } },
      resume: () => { (anim as unknown as { hold: boolean }).hold = false; invalidate(); },
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
    const wStep = Math.min(dt, 0.1) / WIZ_TOTAL;
    anim.w = anim.wTarget > anim.w ? Math.min(anim.wTarget, anim.w + wStep) : Math.max(anim.wTarget, anim.w - wStep);
    derive(anim);
    const tr = anim.turn, held = !!(anim as unknown as { hold?: boolean }).hold; // held: ?debug screenshots only
    if (tr && !held) {
      // the first frame of a turn has no real dt (the canvas was idle): start from 0
      const d = tr.started ? Math.min(dt, 0.1) : 0; tr.started = true;
      tr.f = Math.min(1, tr.f + d / tr.dur);
      anim.leafP = tr.fwd ? ease(tr.f) : 1 - ease(tr.f);
      if (tr.f >= 1) { tr.done(); return; }
    }
    if (anim.t !== anim.target || anim.w !== anim.wTarget || (anim.turn && !held)) invalidate(); // frameloop="demand": render only while moving
  }, -1);
  // phones: the open book grows head to tail to the screen's height (sz)
  const vw = useThree(s => s.size.width), vh = useThree(s => s.size.height), phone = vw <= PHONE_MAX;
  const sz = phone ? +phoneStretch(vw, vh).toFixed(3) : 1;
  useEffect(() => { anim.sz = sz; invalidate(); }, [anim, sz, invalidate]);
  return (
    <>
      <CameraRig anim={anim} layer={layer} wizard={want.view === "wizard"} />
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
      {/* phones: the light comes from the upper right, as in the desk photo (bg_desk.webp), so the shadow falls
          to the lower left; a 1024 shadow map */}
      <directionalLight position={phone ? [22, 52, -22] : [-22, 52, -22]} intensity={0.7} color="#fff4e6" castShadow shadow-mapSize={phone ? [1024, 1024] : [2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={32} shadow-blurSamples={32}>
        <orthographicCamera attach="shadow-camera" args={[-26, 26, 26, -26, 1, 100]} />
      </directionalLight>
      <BookModel anim={anim} onOpen={onOpen} layer={layer} m={m} leaf={leaf} sz={sz} />
      {/* the book's shadow on the desk, in two layers like the photo's skeins: a narrow dark contact line where
          it touches, and a broad very soft shadow spreading to the lower right. Warm grey-brown (sampled
          beside the skeins), not black; darkness follows --book-shadow */}
      {/* broad soft layer: the key light's shadow map, falling to the lower right (follows the book as it opens) */}
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial transparent opacity={(phone ? 0.5 : 0.38) * shadowK} color={SHADOW_COLOR} />
      </mesh>
      {/* narrow dark contact line where the book touches the desk */}
      <ContactShadows position={[0, 0.002, 0]} scale={60} blur={1.6} far={2.2} opacity={(phone ? 0.7 : 0.55) * shadowK} resolution={1024} color={SHADOW_COLOR} frames={Infinity} />
    </>
  );
}

export default function Book3D({ onFail }: { onFail: () => void }) {
  const b = useBook(), open = b.view === "home" || b.view === "wizard", phone = !!useMobile();
  // want: the spread the address asks for; shown: the one whose DOM is in the book (they differ during a turn)
  // phones: 도안집, 도안 and 따라 뜨기 keep the book open, as its right page
  const path = usePathname(), page = phone ? bookPageOf(path) : null;
  const sheet = useSheet(b.step), wizSheet = phone && b.view === "wizard" ? sheet : undefined;
  const want = useMemo<Spread>(() => (page ? { view: "home", step: b.step, page } : { view: b.view, step: b.step, sheet: wizSheet }), [b.view, b.step, page, wizSheet]);
  const [shown, setShown] = useState<Spread>(want);
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();
  const cssHost = useRef<HTMLDivElement>(null), flatHost = useRef<HTMLDivElement>(null);
  const [layer] = useState<CssLayer>(() => {
    const mk = (id: string) => { const el = document.createElement("div"); el.id = id; el.style.opacity = "0"; el.inert = true; return el; };
    const renderer = new CSS3DRenderer(); renderer.domElement.className = "css3d-layer";
    const flat = (id: string) => { const el = document.createElement("div"); el.id = id; el.className = "book-flat-page"; el.inert = true; return el; };
    return { renderer, left: mk("bookLeft"), right: mk("bookRight"), flatLeft: flat("wizLeft"), flatRight: flat("wizRight") };
  });
  useEffect(() => {
    cssHost.current!.appendChild(layer.renderer.domElement);
    flatHost.current!.append(layer.flatLeft, layer.flatRight);
    return () => { layer.renderer.domElement.remove(); layer.flatLeft.remove(); layer.flatRight.remove(); };
  }, [layer]);
  return (
    <div className={"book3d" + (ready ? " ready" : "") + (open || page ? " is-open" : "")} id="book">
      <Canvas
        // phones: a little under 2x, so a phone's GPU is less likely to take the context back (see onCreated)
        dpr={phone ? [1, 1.6] : [1, 2]}
        // open (menu or wizard: it is one book): a click on the empty desk around the book closes it. R3F calls
        // this when a click hits none of the objects with handlers (the book's meshes have one; the page
        // content is DOM above the canvas). The wizard's draft is saved on every change, so nothing is lost.
        onPointerMissed={() => { if (!page && (b.view === "home" || b.view === "wizard")) b.close(); }}
        frameloop="demand"
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ fov: FOV, near: 20, far: 600, position: [0, 60, 80] }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
        onCreated={({ gl, invalidate }) => {
          gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.12; // outputColorSpace stays sRGB (default); exposure set so the lit cloth reads close to its hex (--book-lav)
          // A lost context is often given back: Android WebViews (KakaoTalk on a Pixel, 2026-11) take it while
          // the page loads and return it. three.js re-uploads everything on restore, so wait for that and
          // redraw; only a context still gone after 3s drops to the CSS book. Do not "simplify" back to an
          // immediate onFail: that left those phones on the flat CSS book for good.
          let lost: ReturnType<typeof setTimeout> | undefined;
          gl.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); clearTimeout(lost); lost = setTimeout(onFail, 3000); });
          gl.domElement.addEventListener("webglcontextrestored", () => { clearTimeout(lost); invalidate(); });
          requestAnimationFrame(() => setReady(true));
        }}
      >
        <Scene want={want} shown={shown} setShown={setShown} instant={b.instant} onOpen={b.open} reduce={reduce} layer={layer} />
      </Canvas>
      {/* film grain over the book and the photo (not over any text: the page DOM and the hero copy sit above) */}
      <div className="book-grain" aria-hidden="true" />
      <div ref={cssHost} />
      <div ref={flatHost} className="book-flat" />
      {/* the page DOM: the menu spread (CSS 3D, on the tilted pages; always there, so it can be painted for
          a turn), and the wizard spread while it is shown (flat boxes over the pages, the camera straight above) */}
      {createPortal(<LeftPage />, layer.left)}
      {/* phones: the wizard step is the right page itself (components/mobile/MobileBookWizard.tsx) */}
      {createPortal(<>{phone && shown.page ? <MobileBookPages page={shown.page} /> : phone && shown.view === "wizard" ? <MobileBookWizard sheet={shown.sheet} /> : <RightPage onClose={b.close} />}<AiTab variant="menu" /></>, layer.right)}
      {shown.view === "wizard" && !phone && <WizardSpread step={shown.step} left={layer.flatLeft} right={layer.flatRight} />}
    </div>
  );
}
