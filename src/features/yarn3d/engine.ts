// Yarn engine: a pattern as one strand of twisted yarn in 3D, for every item 도안 만들기 makes.
// Ported from docs/yarn-engine-prototype.html (three.js r128, global script) to three r187, React-free.
// Taken over: buildYarn, fuzzLines, yarnMat, fiberTex, ENV, makeItem with its parts (round, rows, oval,
// tube, wall, perim, linkFrac, linkNear, ring), relax, buildHolo, updateHolo, buildItemYarn, buildKnit,
// sizeInfo, tickItem, playDraw and the material presets PRE. Left out: the demo scenes (knitRows,
// chainPath, strandPath) and ktube (no item is knitted in the round).
// Changes from the prototype:
//  - makeItem draws the pattern's own counts (YarnShape, from lib/pattern's plan; fromPattern.ts): the
//    prototype's made-up 9 rounds, rows(18,19), 16 x 80, oval(12,7)... are gone; each course has its own colour
//  - rect bottoms worked in the round from a chain (the app's patterns: 8 increases a round at the corners)
//    use oval's code on a rectangle (rectPath) instead of the stadium, so the corners stay square
//  - flat pieces worked back and forth or in a tube have a known shape: no relaxing; they are laid at the
//    pattern's real size, and past a stitch budget every k-th stitch and row is drawn (`skip`, same size and
//    proportions, only the yarn is less dense)
//  - flat bottoms stay flat: the bottom's points are held at height 0 while relaxing (the prototype's flat
//    circle, 6 increases a round, waved a little at the edge)
//  - colour management: r187 converts hex colours to linear by itself, so the prototype's
//    convertSRGBToLinear() calls are dropped (they would convert twice and darken the yarn). Where the
//    prototype handed a hex to three r128 *unconverted* (lights, line colours, the shadow tint, the white
//    fuzz), r128 used the number as linear; lin() does the same here so the colours match the prototype.
//  - lights: r155+ has no legacy light scale, so the prototype's intensities are multiplied by PI to light
//    the same. NoToneMapping stays (ACES greys the colours).
//  - it draws only when something changes (the shape settling, the camera moving, the order animation),
//    so it never runs alongside the book's own canvas for nothing; detail drops with the stitch count, on
//    phones and on the book's page (`detail: "page"`)
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { stitchOf } from "@/lib/knit";

export type YarnMaterial = "cotton" | "wool" | "mohair" | "linen" | "silk" | "chenille" | "raffia" | "cord" | "fur" | "metal"
  | "cashmere" | "alpaca" | "angora" | "sleep" | "boucle" | "scrub" | "tshirt" | "ribbon" | "jute";
export type YarnStrap = "none" | "two" | "long";
/** what is drawn, in the pattern's own counts (stitches per course, bottom first) */
export type YarnShape =
  | { kind: "round"; counts: number[]; flat: number }                       // magic ring; `flat` = rounds that lie flat (the bottom)
  | { kind: "oval"; chain: number; bottom: number[]; body: number[] }        // around a base chain, then a body (wall)
  | { kind: "rect"; chain: number; bottom: number[]; body: number[] }
  | { kind: "rows"; W: number; H: number; wCm: number; hCm: number; knit: boolean; stitch?: string } // back and forth (knit: its stitch pattern, lib/knit.ts)
  | { kind: "tube"; W: number; H: number; circCm: number; hCm: number }    // in the round, no bottom
  // a painted picture (직접 그리기 · 자유롭게): W x H stitches, row-major from the bottom, -1 = a hole, else the
  // colour's index in `colors`; it stands up facing you (two of it, front and back, for pieces 2)
  | { kind: "grid"; W: number; H: number; wCm: number; hCm: number; cells: number[]; pieces?: 1 | 2 };
export interface YarnPattern {
  shape: YarnShape;
  /** one colour per course, bottom first (a shorter list: its last colour goes on) */
  colors: string[];
  yarnMm: number;
  hookMm: number;
  strap: YarnStrap;
  /** handle length (cm), for the strap's height */
  strapCm: number;
  material: YarnMaterial;
  /** "fabric": frame a knitted piece close up (the 무늬 page) instead of the whole piece */
  focus?: "fabric";
  /** the reader's own hairiness (Kim: 털 양, 털 길이 turned while looking): 1 is the material's own; 0 none */
  fuzzK?: number;
  hairK?: number;
  /** how the opening is finished (Kim: a pouch is not an open tub): "pinch" - the two long sides meet along
   *  the top, as a zipped pouch lies; "cinch" - drawn in a little, a bucket bag's gathered top */
  top?: "pinch" | "cinch";
  /** a closed, stuffed piece (a drawn shape that ends on its centre line): it keeps its shape, no slump */
  firm?: boolean;
  /** how many strands side by side a strap is (1-5; 3 when missing) */
  strapW?: number;
  /** things sewn on to try in the 3D only (Kim: 단추, 라벨, 지퍼), with where and how big (Kim): `buttonAt` /
   *  `labelAt` = [across the front -1..1, up 0..1, size in cm]; `zipOpen` 0 closed .. 1 open; the button's colour */
  extras?: { button?: boolean; label?: boolean; zipper?: boolean; buttonAt?: [number, number, number]; labelAt?: [number, number, number]; zipOpen?: number; buttonColor?: string };
  /** a bag's flap (덮개): worked from the back of the opening, over the top and down the front (Kim: it has to show) */
  flap?: { cm: number; shape: "half" | "square" | "triangle" };
  /** the crochet stitch's height against single crochet (긴뜨기 ~1.6, 한길긴뜨기 ~2.2) */
  stitchH?: number;
}
export interface YarnInfo { round: boolean; widthCm: number; depthCm: number; heightCm: number | null; fit: string; skip: { stitch: number; row: number } | null }
export interface YarnViewer {
  setPattern(p: YarnPattern): void;
  setMaterial(m: YarnMaterial): void;
  setView(v: "yarn" | "holo"): void;
  playDraw(): void;
  /** nearer (f < 1) or further (f > 1) */
  zoom(f: number): void;
  /** the first angle again, the whole piece in view */
  home(): void;
  /** look from the front, the side, straight above or down into it */
  look(v: YarnLook): void;
  /** what dragging does: turn it, move it across the screen, or zoom */
  setTool(t: YarnTool): void;
  /** 재기: the piece's width and height (or depth) as lines on the screen (opts.onRuler) */
  setRuler(on: boolean): void;
  dispose(): void;
}
export type YarnLook = "front" | "side" | "top" | "inside";
export type YarnTool = "rotate" | "pan" | "zoom";
/** a measuring line on the screen, in the canvas's own pixels */
export interface YarnRule { x1: number; y1: number; x2: number; y2: number; cm: number }
/** `fit` (the web's page and work screen): the camera is set so the whole piece - straps and most of its
 *  shadow included - is in view and in the middle, whatever the canvas's shape; without it the first
 *  framing (phones) stays as it was */
export interface ViewerOpts { phone: boolean; detail?: "full" | "page"; fit?: boolean; onInfo: (i: YarnInfo | null) => void; onBuilt?: (ms: number) => void; onRuler?: (r: YarnRule[] | null) => void }

// how each yarn looks (Kim: the material has to show, also at the size of the book's page):
//  plies / twist / depth  the twisted strands and how deep the grooves between them are
//  ao        how much darker the grooves are (low: the colour stays clear; the old .45 greyed pastels)
//  rough / sheen / metal  matte cotton and linen, a soft sheen on wool, chenille and silk, metallic
//  fuzz      loose fibres as hairs;  halo  a soft cloud of fibre round the strand (a see-through shell, so
//            mohair and alpaca read as fluffy even when one stitch is a few pixels)
//  flat      raffia and ribbon: the strand is a flat tape (width : thickness), slowly turning
//  slub      linen: the strand thickens and thins along its length
//  fill      the strand's width against the stitch (crochet fabric is dense: the yarn fills the stitch)
//  hair      how long the loose fibres are (1: a light fuzz; 2 and more: a pile - fur, the tinsel of 수세미실)
//  glint     the share of those fibres that shine white (tinsel)
//  soft      how much the finished piece gives under its own weight (a stiff cord basket stands, mohair slumps)
interface Preset { plies: number; twist: number; fuzz: number; depth: number; braid: boolean; rough: number; ao: number; sheen: number; metal: number; halo: number; flat: number; slub: number; fill: number; hair: number; glint: number; soft: number }
const P0 = { braid: false, sheen: 0, metal: 0, halo: 0, flat: 1, slub: 0, fill: 1.3, hair: 1, glint: 0, soft: .5 };
export const PRE: Record<YarnMaterial, Preset> = {
  cotton: { ...P0, plies: 4, twist: 1, fuzz: .04, depth: .3, rough: .82, ao: .3, soft: .4 },
  wool: { ...P0, plies: 3, twist: .7, fuzz: .5, depth: .22, rough: .92, ao: .24, sheen: .55, halo: .18, soft: .6 },
  mohair: { ...P0, plies: 2, twist: .45, fuzz: 1.7, depth: .12, rough: 1, ao: .16, sheen: .4, halo: .5, fill: 1.05, soft: .85 },
  linen: { ...P0, plies: 2, twist: .55, fuzz: .08, depth: .2, rough: .9, ao: .3, slub: .38, soft: .45 },
  silk: { ...P0, plies: 3, twist: .9, fuzz: 0, depth: .18, rough: .38, ao: .22, sheen: .7, soft: .75 },
  chenille: { ...P0, plies: 1, twist: 0, fuzz: .15, depth: 0, rough: 1, ao: .1, sheen: .9, halo: .3, fill: 1.75, soft: .7 },
  raffia: { ...P0, plies: 1, twist: .25, fuzz: 0, depth: 0, rough: .58, ao: .22, flat: 3.4, fill: 1.15, soft: .2 },
  cord: { ...P0, plies: 8, twist: 1.3, fuzz: 0, depth: .2, braid: true, rough: .66, ao: .28, sheen: .25, soft: .1 },
  fur: { ...P0, plies: 2, twist: .6, fuzz: 1, depth: .12, rough: 1, ao: .14, halo: .85, fill: 1, hair: 3.4, soft: .7 },
  metal: { ...P0, plies: 3, twist: 1.5, fuzz: 0, depth: .3, rough: .3, ao: .3, metal: .85, soft: .35 },
  // more yarns to tell apart in the 3D (Kim: as many as can be shown)
  cashmere: { ...P0, plies: 3, twist: .6, fuzz: .7, depth: .16, rough: .95, ao: .2, sheen: .7, halo: .32, soft: .8 },
  alpaca: { ...P0, plies: 2, twist: .5, fuzz: 1.15, depth: .14, rough: 1, ao: .18, sheen: .5, halo: .42, hair: 1.25, fill: 1.15, soft: .8 },
  angora: { ...P0, plies: 2, twist: .4, fuzz: 2.3, depth: .08, rough: 1, ao: .12, sheen: .35, halo: .72, hair: 1.5, fill: 1, soft: .9 },
  sleep: { ...P0, plies: 1, twist: 0, fuzz: .9, depth: 0, rough: 1, ao: .08, sheen: .6, halo: .7, hair: 1.2, fill: 1.8, soft: .85 },     // 수면사: a thick, very soft pile yarn
  boucle: { ...P0, plies: 2, twist: .35, fuzz: .45, depth: .26, rough: 1, ao: .26, sheen: .3, halo: .34, slub: .95, fill: 1.4, soft: .65 }, // loops along the strand
  scrub: { ...P0, plies: 1, twist: .3, fuzz: 1.25, depth: 0, rough: .4, ao: .16, sheen: .8, metal: .18, halo: .4, hair: 2.2, glint: .4, fill: .95, soft: .5 }, // 수세미실: shiny tinsel
  tshirt: { ...P0, plies: 1, twist: .12, fuzz: 0, depth: 0, rough: .95, ao: .2, flat: 2.3, fill: 1.5, soft: .5 },                         // 패브릭얀: a jersey tape
  ribbon: { ...P0, plies: 1, twist: .4, fuzz: 0, depth: 0, rough: .36, ao: .2, sheen: .75, flat: 4.2, fill: 1.2, soft: .55 },
  jute: { ...P0, plies: 3, twist: 1.15, fuzz: .7, depth: .32, rough: 1, ao: .36, slub: .3, hair: .8, soft: .2 },                           // 황마: rough, hairy, stiff
};
const presetOf = (m: YarnMaterial) => { const p = PRE[m] ?? PRE.cotton; return { ...p, preset: m, fur: p.hair >= 2 }; };

const MM = 12; // model units: 1 unit = 12mm
const lin = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** WebGL present? (the overlay shows one line instead of the viewer when not) */
export function hasWebGL(): boolean {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

/** the stitches a pattern draws (for the level of detail) */
export function stitchCount(s: YarnShape): number {
  if (s.kind === "round") return s.counts.reduce((a, b) => a + b, 0);
  if (s.kind === "oval" || s.kind === "rect") return s.chain + [...s.bottom, ...s.body].reduce((a, b) => a + b, 0);
  if (s.kind === "grid") return s.cells.filter(c => c >= 0).length * (s.pieces ?? 1);
  return s.W * s.H;
}

type Edge = [number, number, number, number];
type Bot = [number, number, number];
interface Course { idx: number[]; closed: boolean; bot: Bot[] | null; ci: number }
interface Knit { type: "flat" | "tube"; W: number; H: number; swap: boolean; wk: number; rk: number; rho: number; R: number }
interface ItemData { P: THREE.Vector3[]; E: Edge[]; C: Course[]; rh: number; sw: number; knit: Knit | null; flat: number[]; fixed: boolean; skip: { stitch: number; row: number } | null; iter: number; done: boolean }

export function createYarnViewer(canvas: HTMLCanvasElement, first: YarnPattern, opts: ViewerOpts): YarnViewer | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  const page = opts.detail === "page";
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 900); cam.position.set(0, 11, 13.5);
  const ctl = new OrbitControls(cam, canvas); ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.enablePan = false; ctl.minDistance = 3; ctl.maxDistance = 40;
  // light from the upper right -> shadows fall to the lower left
  scene.add(new THREE.HemisphereLight(lin(0xfffaf2), lin(0xe6dccd), 0.62 * Math.PI));
  const sun = new THREE.DirectionalLight(lin(0xfff6ea), 0.88 * Math.PI); sun.position.set(7, 9, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(page ? 1024 : 2048, page ? 1024 : 2048); const sc = sun.shadow.camera; sc.near = 1; sun.shadow.bias = -0.0006; sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(lin(0xf2e9df), 0.16 * Math.PI); fill.position.set(-8, -2, 6); scene.add(fill);
  // the yarn casts its shadow on the ground but not on itself: self-shadowing greyed every colour (Kim:
  // "칙칙"); the grooves between strands already shade the fabric
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: lin(0x5a4632), opacity: .2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.3; ground.receiveShadow = true; scene.add(ground);
  const group = new THREE.Group(); scene.add(group);
  // the light, its shadow box and the ground grow with the piece (the prototype's wider camera / shadow range)
  function setShadow(half: number) {
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.far = Math.max(40, half * 4.5);
    sun.position.set(7, 9, 10).multiplyScalar(Math.max(1, half / 10)); sc.updateProjectionMatrix();
    ground.scale.setScalar(Math.max(1, half / 12));
  }
  setShadow(10);

  // ---------- environment reflection (metallic yarn)
  const envSrc = (() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, "#fffdf6"); g.addColorStop(.38, "#cdbfa8"); g.addColorStop(.52, "#4a4038"); g.addColorStop(.7, "#8c7a66"); g.addColorStop(1, "#2e2823"); x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    ([[190, 26, 26], [60, 40, 16], [120, 18, 12]] as const).forEach(([a, b, r]) => { const q = x.createRadialGradient(a, b, 0, a, b, r); q.addColorStop(0, "rgba(255,255,255,1)"); q.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = q; x.fillRect(a - r, b - r, r * 2, r * 2); });
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const pm = new THREE.PMREMGenerator(renderer); const ENV = pm.fromEquirectangular(envSrc).texture; pm.dispose();

  // ---------- fibre grain (stripes along the yarn)
  function fiberTex() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d")!; x.fillStyle = "#808080"; x.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 420; i++) {
      const y = Math.random() * 64, l = 30 + Math.random() * 120, x0 = Math.random() * 256, g = 100 + Math.random() * 90 | 0;
      x.strokeStyle = `rgba(${g},${g},${g},.5)`; x.lineWidth = .6 + Math.random(); x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + l, y + (Math.random() - .5) * 3); x.stroke();
      if (x0 + l > 256) { x.beginPath(); x.moveTo(x0 - 256, y); x.lineTo(x0 + l - 256, y); x.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  const FTEX = fiberTex();

  let pat = first;
  const st = { thick: 1, ...presetOf(pat.material) };
  const IT = { view: "yarn" as "yarn" | "holo", data: null as ItemData | null };
  const colorOf = (ci: number) => pat.colors[Math.max(0, Math.min(ci, pat.colors.length - 1))] || "#EFE6D4";

  // ---------- level of detail from the stitch count (the page's preview is lighter than the full screen)
  const VERT_BUDGET = page ? 350_000 : opts.phone ? 500_000 : 1_400_000, BASE_VPS = 187; // ~17 points x 11 ring vertices per stitch at full detail
  // flat rows and tubes: past this many stitches every k-th stitch and row is drawn
  const DRAW_STITCHES = page ? 9_000 : opts.phone ? 12_000 : 24_000;
  let LOD = { M: 10, step: 1 };
  function lodFor(drawn: number) {
    const want = VERT_BUDGET / Math.max(1, drawn), maxM = page ? 8 : 10;
    LOD = want >= BASE_VPS ? { M: maxM, step: 1 } : { M: want >= BASE_VPS * .6 ? Math.min(8, maxM) : 6, step: 1 };
    if (want < BASE_VPS) LOD.step = Math.min(4, Math.max(1, (17 * (LOD.M + 1)) / want));
  }
  const fuzzCap = () => page ? (st.fur ? 9_000 : 16_000) : opts.phone ? (st.fur ? 12_000 : 18_000) : 60_000;

  function yarnMat(R: number) {
    // sheen: the soft light along fibres (wool, chenille, silk), the colour stays the yarn's own
    const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: st.rough, metalness: st.metal, envMap: st.metal || st.preset === "silk" ? ENV : null, envMapIntensity: st.metal ? 1.25 : .35,
      bumpMap: FTEX, bumpScale: R * (st.preset === "raffia" ? .14 : .05), sheen: st.sheen, sheenRoughness: st.preset === "silk" ? .28 : .6, sheenColor: new THREE.Color(.34, .33, .32) });
    return m;
  }

  // ---------- yarn: centre line (points) -> twisted ply surface
  function buildYarn(pts: THREE.Vector3[], R: number, o: { M?: number; closed?: boolean; color: string }) {
    const n = pts.length, M = o.M || Math.max(14, st.plies * 6), N = o.M ? Math.min(st.plies, Math.floor(o.M / 4)) : st.plies, tau = st.twist * 0.75 / R, K = 3;
    const pos = new Float32Array(n * (M + 1) * 3), col = new Float32Array(n * (M + 1) * 3), uv = new Float32Array(n * (M + 1) * 2), frames: { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3; s: number }[] = [];
    const T = new THREE.Vector3(), Nv = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3();
    let s = 0; const base = new THREE.Color(o.color), slub0 = Math.random() * 9; // already linear in r187 (no convertSRGBToLinear)
    for (let i = 0; i < n; i++) {
      T.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
      if (i === 0) { Nv.set(0, 0, 1); if (Math.abs(T.z) > .9) Nv.set(0, 1, 0); }
      Nv.sub(tmp.copy(T).multiplyScalar(Nv.dot(T))).normalize(); B.crossVectors(T, Nv);
      if (i > 0) s += pts[i].distanceTo(pts[i - 1]);
      frames.push({ p: pts[i], t: T.clone(), n: Nv.clone(), b: B.clone(), s });
      for (let j = 0; j <= M; j++) {
        const ph = j / M * Math.PI * 2; let f: number;
        if (st.braid) { const a = .5 + .5 * Math.cos(N * (ph - tau * s)), b = .5 + .5 * Math.cos(N * (ph + tau * s)); f = Math.max(a, b) * .75 + .25 * (a * b); }
        else f = N <= 1 ? 1 : Math.pow(Math.abs(Math.cos(N / 2 * (ph - tau * s))), .55);
        const e = o.closed ? 1 : Math.min(1, Math.sqrt(1 - Math.pow(1 - Math.min(i, n - 1 - i, K) / K, 2)) + .02); const sl = st.slub ? 1 + st.slub * (Math.sin(s / R * .9 + slub0) * .6 + Math.sin(s / R * 2.3 + slub0 * 2) * .4) : 1;
        const r = R * (1 - st.depth + st.depth * f) * e * sl, k = (i * (M + 1) + j);
        // a flat tape (raffia) turns slowly along the strand
        const fw = st.flat, rot = fw > 1 ? s / R * .12 : 0, a0 = Math.cos(ph) * r * Math.sqrt(fw), b0 = Math.sin(ph) * r / Math.sqrt(fw);
        const cx = a0 * Math.cos(rot) - b0 * Math.sin(rot), sx = a0 * Math.sin(rot) + b0 * Math.cos(rot);
        pos[k * 3] = pts[i].x + Nv.x * cx + B.x * sx; pos[k * 3 + 1] = pts[i].y + Nv.y * cx + B.y * sx; pos[k * 3 + 2] = pts[i].z + Nv.z * cx + B.z * sx;
        const sh = 1 - st.ao + st.ao * f; col[k * 3] = base.r * sh; col[k * 3 + 1] = base.g * sh; col[k * 3 + 2] = base.b * sh;
        uv[k * 2] = s / (R * 7); uv[k * 2 + 1] = j / M * Math.max(1, N) - tau * s / (Math.PI * 2) * Math.max(1, N) * (st.braid ? 0 : 1);
      }
    }
    const idx: number[] = []; for (let i = 0; i < n - 1; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    g.userData = { frames, R, perRing: M * 6, color: o.color }; return g;
  }

  // the soft cloud of fibre round a fluffy strand: the strand's own surface pushed out along its normals,
  // see-through and speckled, lighter than the yarn (mohair, alpaca, fur; a little on wool and chenille)
  const HTEX = (() => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 128; const x = c.getContext("2d")!; x.fillStyle = "#000"; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { const g = 120 + Math.random() * 135 | 0; x.strokeStyle = `rgb(${g},${g},${g})`; x.lineWidth = .5 + Math.random() * .8; const x0 = Math.random() * 128, y0 = Math.random() * 128, a = Math.random() * 6.28, l = 4 + Math.random() * 14; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  // the material's hairiness times the reader's own (털 양: above 1 it adds fuzz to a smooth yarn too)
  const fk = () => Math.max(0, pat.fuzzK ?? 1), hk = () => Math.max(.2, pat.hairK ?? 1);
  const fuzzOf = () => st.fuzz * fk() + Math.max(0, fk() - 1) * .35, haloOf = () => st.halo * Math.min(fk(), 1.6) + Math.max(0, fk() - 1) * .15;
  function haloShell(geos: THREE.BufferGeometry[]) {
    const halo = haloOf();
    if (halo <= 0.01) return;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: Math.min(.6, .14 + halo * .4), alphaMap: HTEX, depthWrite: false });
    geos.forEach(g => {
      const R = g.userData.R as number, pos = g.getAttribute("position") as THREE.BufferAttribute, nor = g.getAttribute("normal") as THREE.BufferAttribute, col = g.getAttribute("color") as THREE.BufferAttribute;
      const out = new Float32Array(pos.count * 3), c2 = new Float32Array(pos.count * 3), push = R * halo * (st.fur ? 1.5 : 1.05) * Math.min(1.5, .6 + hk() * .4);
      for (let i = 0; i < pos.count; i++) {
        out[i * 3] = pos.getX(i) + nor.getX(i) * push; out[i * 3 + 1] = pos.getY(i) + nor.getY(i) * push; out[i * 3 + 2] = pos.getZ(i) + nor.getZ(i) * push;
        // lighter than the yarn: the fibres catch the light
        for (let k = 0; k < 3; k++) c2[i * 3 + k] = Math.min(1, col.array[i * 3 + k] * 1.04 + .02);
      }
      const h = new THREE.BufferGeometry(); h.setAttribute("position", new THREE.BufferAttribute(out, 3)); h.setAttribute("normal", nor); h.setAttribute("color", new THREE.BufferAttribute(c2, 3)); h.setAttribute("uv", g.getAttribute("uv")); h.setIndex(g.getIndex());
      h.userData = { perRing: g.userData.perRing };
      const m = new THREE.Mesh(h, mat); m.renderOrder = 1; group.add(m); halos.push(m);
    });
  }
  function fuzzLines(geos: THREE.BufferGeometry[]) {
    const fuzz = fuzzOf(), fluffy = st.halo >= .4;
    if (fuzz <= 0.01 || !geos.length) return null;
    const v: number[] = [], col: number[] = [], cc = new THREE.Color(), WH = lin(0xffffff); const d = new THREE.Vector3(), p = new THREE.Vector3(), jit = new THREE.Vector3();
    const per = (g: THREE.BufferGeometry) => { const fr = g.userData.frames; return fr[fr.length - 1].s / g.userData.R * fuzz * (st.fur ? 46 : fluffy ? 34 : 26); };
    const raw = geos.reduce((a, g) => a + per(g), 0), scale = Math.min(1, fuzzCap() / Math.max(1, raw));
    geos.forEach(g => {
      const fr = g.userData.frames, R = g.userData.R, count = Math.floor(per(g) * scale);
      // fur: the proper colour; the light fuzz: the prototype used the sRGB numbers as linear (lighter), so do the same
      cc.set(g.userData.color); if (!st.fur) { cc.convertLinearToSRGB(); cc.lerp(WH, fluffy ? .12 : .35); }
      for (let k = 0; k < count; k++) {
        const f = fr[Math.random() * fr.length | 0], ph = Math.random() * 6.283, c = Math.cos(ph), s = Math.sin(ph);
        d.set(0, 0, 0).addScaledVector(f.n, c).addScaledVector(f.b, s); p.copy(f.p).addScaledVector(d, R * .8);
        const L = R * (.25 + Math.random() * Math.random() * 2.2) * (.35 + Math.min(2.5, fuzz)) * st.hair * hk();
        d.addScaledVector(f.t, (Math.random() - .5) * 1.6).add(jit.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(.5)).normalize();
        v.push(p.x, p.y, p.z, p.x + d.x * L, p.y + d.y * L, p.z + d.z * L);
        const br = st.fur ? .75 + Math.random() * .25 : 1, k0 = st.fur ? .8 : .9;
        if (st.glint > 0 && Math.random() < st.glint) col.push(.92, .92, .9, 1, 1, 1); // tinsel: a fibre that catches the light
        else col.push(cc.r * br * k0, cc.g * br * k0, cc.b * br * k0, cc.r * br, cc.g * br, cc.b * br);
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: st.fur ? .7 : fluffy ? .4 : .22, depthWrite: false }));
  }

  // ---------- pattern -> 3D: stitch = point, joins = springs (the shape comes from the counts alone)
  function makeItem(): ItemData {
    // round / oval / rect past the stitch budget (sizes have no limit: a 3m rug is 100,000s of stitches): every
    // k-th round is drawn with 1/k of its stitches and the stitch k times as big, so the size and shape stay
    const s0 = pat.shape, sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    const total = s0.kind === "round" ? sum(s0.counts) : s0.kind === "oval" || s0.kind === "rect" ? sum(s0.bottom) + sum(s0.body) : 0;
    const kk = total > DRAW_STITCHES ? Math.ceil(Math.sqrt(total / DRAW_STITCHES)) : 1;
    const pick = (a: number[]) => { const o: number[] = []; for (let i = kk - 1; i < a.length; i += kk) o.push(Math.max(3, Math.round(a[i] / kk))); if (!o.length && a.length) o.push(Math.max(3, Math.round(a[a.length - 1] / kk))); return o; };
    const s: YarnShape = kk === 1 ? s0 : s0.kind === "round" ? { kind: "round", counts: pick(s0.counts), flat: s0.flat ? Math.max(1, Math.round(s0.flat / kk)) : 0 }
      : s0.kind === "oval" || s0.kind === "rect" ? { ...s0, chain: Math.max(2, Math.round(s0.chain / kk)), bottom: pick(s0.bottom), body: pick(s0.body) } : s0;
    const rh = (pat.yarnMm + pat.hookMm) / MM * kk * (pat.stitchH ?? 1), sw = 2 * Math.PI * rh / 6;
    const P: THREE.Vector3[] = [], E: Edge[] = [], C: Course[] = [], flat: number[] = [];
    const V = (x: number, y: number, z: number) => { P.push(new THREE.Vector3(x, y + (Math.random() - .5) * .01, z)); return P.length - 1; };
    const dist = (a: number, b: number) => P[a].distanceTo(P[b]);
    // one course's neighbouring stitches
    const ring = (idx: number[], closed: boolean, far?: number | null, step?: number) => {
      const c = idx.length;
      for (let i = 0; i < c; i++) {
        if (closed || i + 1 < c) E.push([idx[i], idx[(i + 1) % c], step || sw, 1]);
        if (c >= 6 && (closed || i + 2 < c)) E.push([idx[i], idx[(i + 2) % c], far != null ? far : dist(idx[i], idx[(i + 2) % c]), .3]);
      }
    };
    // joined to the course below by the ratio of the counts (increases, decreases)
    const linkFrac = (cur: number[], prev: number[]): Bot[] => {
      const c = cur.length, pc = prev.length, bot: Bot[] = [], m = (k: number) => prev[((k % pc) + pc) % pc];
      for (let i = 0; i < c; i++) {
        const f = (i + .5) / c * pc, p = Math.floor(f), fr = f - p - .5, q = fr >= 0 ? p + 1 : p - 1;
        E.push([cur[i], m(p), Math.hypot(rh, fr * sw), 1]); E.push([cur[i], m(q), Math.hypot(rh, (1 - Math.abs(fr)) * sw), .35]);
        const fb = (i + 1) / c * pc - .5, pb = Math.floor(fb); bot.push([m(pb), m(pb + 1), fb - pb]);
      }
      return bot;
    };
    // joined to the nearest stitch below (a flat shape given by its outline: oval, rect)
    const linkNear = (cur: number[], prev: number[], closedPrev: boolean): Bot[] => {
      const pc = prev.length, nb = (k: number) => closedPrev ? prev[((k % pc) + pc) % pc] : prev[Math.max(0, Math.min(pc - 1, k))];
      return cur.map(n => {
        let b = 0, bd = 1e9; prev.forEach((m, k) => { const d = dist(n, m); if (d < bd) { bd = d; b = k; } });
        const q1 = nb(b + 1), q0 = nb(b - 1), q = dist(n, q1) < dist(n, q0) ? q1 : q0; E.push([n, prev[b], bd, 1]);
        if (q === prev[b]) return [prev[b], n, -.6] as Bot;
        const dq = dist(n, q); E.push([n, q, dq, .35]); return [prev[b], q, bd / (bd + dq)] as Bot;
      });
    };
    let ci = 0;
    const nextCi = () => { const v = ci + (kk >> 1); ci += kk; return v; }; // a drawn course stands for k of the pattern's: the middle one's colour
    // worked in the round from a magic ring (bottom rounds kept flat)
    const round = (counts: number[], flatN: number) => {
      const cen = V(0, 0, 0); flat.push(cen); let rho = 0, y = 0, prev: number[] | null = null;
      counts.forEach((c, r) => {
        const cr = c * sw / (2 * Math.PI); let amp = 0;
        if (r < flatN) rho = Math.max(rho + rh * .5, cr); // the bottom: a flat disc at its own circumference
        else if (cr <= rho + rh) { const dr = Math.max(-rh * .98, cr - rho); y += Math.sqrt(Math.max(0, rh * rh - dr * dr)); rho = Math.max(.05, cr); }
        else { rho += rh; const q = c * sw / (2 * Math.PI * rho); amp = rho / 6 * Math.sqrt(Math.max(0, 2 * (q * q - 1))); }
        const idx: number[] = []; for (let i = 0; i < c; i++) { const th = (i + .5) / c * 2 * Math.PI; idx.push(V(Math.cos(th) * rho, y + amp * Math.sin(6 * th), Math.sin(th) * rho)); }
        if (r < flatN) flat.push(...idx);
        ring(idx, true, 2 * cr * Math.sin(2 * Math.PI / c));
        let bot: Bot[];
        if (!prev) { idx.forEach(n => E.push([n, cen, Math.max(cr, .2), 1])); bot = idx.map(n => [cen, n, .25] as Bot); }
        else bot = linkFrac(idx, prev);
        C.push({ idx, closed: true, bot, ci: nextCi() }); prev = idx;
      });
      return prev!;
    };
    // the outline a round around a base chain follows: oval (the prototype's stadium) or rect (square corners)
    const stad = (L: number, rho: number, c: number) => {
      const per = 2 * L + 2 * Math.PI * rho, q = Math.PI * rho / 2, pts: [number, number][] = [];
      for (let i = 0; i < c; i++) {
        const s = (i + .5) / c * per; let x: number, z: number, a: number;
        if (s < q) { a = s / rho; x = L / 2 + rho * Math.cos(a); z = rho * Math.sin(a); }
        else if (s < q + L) { x = L / 2 - (s - q); z = rho; }
        else if (s < 3 * q + L) { a = Math.PI / 2 + (s - q - L) / rho; x = -L / 2 + rho * Math.cos(a); z = rho * Math.sin(a); }
        else if (s < 3 * q + 2 * L) { x = -L / 2 + (s - 3 * q - L); z = -rho; }
        else { a = -Math.PI / 2 + (s - 3 * q - 2 * L) / rho; x = L / 2 + rho * Math.cos(a); z = rho * Math.sin(a); }
        pts.push([x, z]);
      }
      return pts;
    };
    const rectPath = (L: number, rho: number, c: number) => {
      const hx = L / 2 + rho, hz = rho, per = 4 * hx + 4 * hz, pts: [number, number][] = [];
      for (let i = 0; i < c; i++) {
        let s = (i + .5) / c * per, x: number, z: number;
        if (s < hz) { x = hx; z = s; }
        else if ((s -= hz) < 2 * hx) { x = hx - s; z = hz; }
        else if ((s -= 2 * hx) < 2 * hz) { x = -hx; z = hz - s; }
        else if ((s -= 2 * hz) < 2 * hx) { x = -hx + s; z = -hz; }
        else { s -= 2 * hx; x = hx; z = -hz + s; }
        pts.push([x, z]);
      }
      return pts;
    };
    // around a chain of n: the chain, then each round on the outline (counts from the pattern)
    const aroundChain = (n: number, counts: number[], outline: typeof stad) => {
      const sp: number[] = []; for (let i = 0; i < n; i++) sp.push(V((i - (n - 1) / 2) * sw, 0, 0));
      flat.push(...sp); ring(sp, false, 2 * sw); C.push({ idx: sp, closed: false, bot: null, ci: 0 });
      let prev = sp, pcl = false;
      counts.forEach((c, r) => {
        const idx = outline((n - 1) * sw, (r + 1) * rh, c).map(([x, z]) => V(x, 0, z)); flat.push(...idx);
        ring(idx, true); C.push({ idx, closed: true, bot: linkNear(idx, prev, pcl), ci: nextCi() }); prev = idx; pcl = true;
      });
      return prev;
    };
    // the body raised from the bottom's edge
    const wall = (base: number[], counts: number[]) => {
      let prev = base;
      counts.forEach(c => {
        const pc = prev.length; let cx = 0, cz = 0, mr = 0;
        prev.forEach(n => { cx += P[n].x; cz += P[n].z; }); cx /= pc; cz /= pc; prev.forEach(n => { mr += Math.hypot(P[n].x - cx, P[n].z - cz); }); mr /= pc;
        const k = c / pc, dr = Math.max(-rh * .98, Math.min(rh * .98, mr * (k - 1))), yy = P[prev[0]].y + Math.sqrt(rh * rh - dr * dr), poly = prev.map(n => [cx + (P[n].x - cx) * k, cz + (P[n].z - cz) * k]), idx: number[] = [];
        for (let i = 0; i < c; i++) { const f = (i + .5) / c * pc - .5, a = Math.floor(f), t = f - a, A = poly[((a % pc) + pc) % pc], B = poly[(((a + 1) % pc) + pc) % pc]; idx.push(V(A[0] + (B[0] - A[0]) * t, yy, A[1] + (B[1] - A[1]) * t)); }
        ring(idx, true); C.push({ idx, closed: true, bot: linkFrac(idx, prev), ci: nextCi() }); prev = idx;
      });
    };
    // flat rows (W x H drawn, `ex` / `ey` apart), lying on the ground; long pieces lie along x
    const rows = (W: number, H: number, ex: number, ey: number, swap: boolean, rowCi: (r: number) => number) => {
      let prev: number[] | null = null; const all: number[][] = [], firstC = C.length;
      for (let r = 0; r < H; r++) {
        const idx: number[] = [];
        for (let i = 0; i < W; i++) { const a = (i - (W - 1) / 2) * ex, b = (r - (H - 1) / 2) * ey; idx.push(swap ? V(b, 0, a) : V(a, 0, b)); }
        ring(idx, false, 2 * ex, ex); let bot: Bot[] | null = null;
        if (prev) {
          const pv = prev;
          for (let i = 0; i < W; i++) { E.push([idx[i], pv[i], ey, 1]); if (i + 1 < W) E.push([idx[i], pv[i + 1], Math.hypot(ey, ex), .35]); if (i > 0) E.push([idx[i], pv[i - 1], Math.hypot(ey, ex), .35]); }
          bot = idx.map((_, i) => (i < W - 1 ? [pv[i], pv[i + 1], .5] : [pv[W - 2], pv[W - 1], 1.5]) as Bot);
        }
        C.push({ idx, closed: false, bot, ci: rowCi(r) }); all.push(idx); prev = idx;
      }
      if (H > 1) C[firstC].bot = all[0].map((n, i) => [all[1][i], n, 1.6] as Bot);
      return all;
    };
    // in the round without a bottom (W x H drawn)
    const tube = (W: number, H: number, rho: number, ey: number, rowCi: (r: number) => number) => {
      let prev: number[] | null = null; const firstC = C.length;
      for (let r = 0; r < H; r++) {
        const idx: number[] = []; for (let i = 0; i < W; i++) { const th = (i + .5) / W * 2 * Math.PI; idx.push(V(Math.cos(th) * rho, r * ey, Math.sin(th) * rho)); }
        ring(idx, true, 2 * rho * Math.sin(2 * Math.PI / W), 2 * Math.PI * rho / W);
        let bot: Bot[] | null = null;
        if (prev) { const pv = prev; idx.forEach((n, i) => { E.push([n, pv[i], ey, 1]); }); bot = idx.map((_, i) => [pv[i], pv[(i + 1) % W], .5] as Bot); }
        C.push({ idx, closed: true, bot, ci: rowCi(r) }); prev = idx;
      }
      if (H > 1) C[firstC].bot = C[firstC].idx.map((n, i) => [C[firstC + 1].idx[i], n, 1.6] as Bot);
    };
    // how many stitches / rows apart the drawn ones are, so a big flat piece stays drawable at its real size
    const skipOf = (W: number, H: number) => { const k = Math.max(1, Math.ceil(Math.sqrt(W * H / DRAW_STITCHES))); return k; };
    // the drawn row j stands for the pattern's rows j*k .. j*k+k-1: it takes the colour of the middle one
    const midCi = (k: number, H: number) => (j: number) => Math.min(H - 1, j * k + Math.floor(k / 2));

    // a painted picture, standing up: only the painted stitches, a course for each run of one colour, joined
    // to the stitch below where there is one (a hole leaves the gap open)
    const grid = (g: Extract<YarnShape, { kind: "grid" }>, k: number) => {
      const W = Math.max(2, Math.round(g.W / k)), H = Math.max(2, Math.round(g.H / k)), ex = g.wCm * 10 / MM / W, ey = g.hCm * 10 / MM / H;
      const at = (i: number, j: number) => g.cells[Math.min(g.H - 1, Math.floor((j + .5) / H * g.H)) * g.W + Math.min(g.W - 1, Math.floor((i + .5) / W * g.W))];
      const panels = g.pieces === 2 ? [ex * 1.6, -ex * 1.6] : [0];
      panels.forEach(z0 => {
        const id: number[] = new Array(W * H).fill(-1);
        for (let j = 0; j < H; j++) {
          let run: number[] = [], runC = -2;
          const flush = () => { if (run.length) C.push({ idx: run, closed: false, bot: run.map(n => { const b = below.get(n); return (b != null ? [b, b, 0] : [n, n, 0]) as Bot; }), ci: runC }); run = []; };
          for (let i = 0; i < W; i++) {
            const c = at(i, j);
            if (c < 0) { flush(); runC = -2; continue; }
            if (c !== runC) { flush(); runC = c; }
            const n = V((i - (W - 1) / 2) * ex, j * ey + ey / 2, z0); id[j * W + i] = n; run.push(n);
            if (run.length > 1) E.push([run[run.length - 2], n, ex, 1]);
            const b = j > 0 ? id[(j - 1) * W + i] : -1; if (b >= 0) { E.push([n, b, ey, 1]); below.set(n, b); }
          }
          flush();
        }
      });
      return { ex, ey };
    };
    const below = new Map<number, number>();

    let knit: Knit | null = null, fixed = false, skip: ItemData["skip"] = null, rhOut = rh, swOut = sw;
    if (kk > 1) skip = { stitch: kk, row: kk };
    if (s.kind === "round") round(s.counts, s.flat);
    else if (s.kind === "oval" || s.kind === "rect") { const b = aroundChain(s.chain, s.bottom, s.kind === "oval" ? stad : rectPath); if (s.body.length) wall(b, s.body); }
    else if (s.kind === "rows") {
      const k = skipOf(s.W, s.H), W = Math.max(2, Math.round(s.W / k)), H = Math.max(2, Math.round(s.H / k));
      const ex = s.wCm * 10 / MM / W, ey = s.hCm * 10 / MM / H, swap = s.hCm > s.wCm;
      fixed = true; skip = k > 1 ? { stitch: k, row: k } : null; rhOut = ey; swOut = ex;
      rows(W, H, ex, ey, swap, midCi(k, s.H));
      if (s.knit) knit = { type: "flat", W, H, swap, wk: ex, rk: ey, rho: 0, R: 0 };
    } else if (s.kind === "grid") {
      const k = skipOf(s.W, s.H * (s.pieces ?? 1)), { ex, ey } = grid(s, k);
      fixed = true; skip = k > 1 ? { stitch: k, row: k } : null; rhOut = ey; swOut = ex;
    } else {
      const k = skipOf(s.W, s.H), W = Math.max(6, Math.round(s.W / k)), H = Math.max(2, Math.round(s.H / k));
      const rho = s.circCm * 10 / MM / (2 * Math.PI), ey = s.hCm * 10 / MM / H;
      fixed = true; skip = k > 1 ? { stitch: k, row: k } : null; rhOut = ey; swOut = 2 * Math.PI * rho / W;
      tube(W, H, rho, ey, midCi(k, s.H));
    }
    return { P, E, C, rh: rhOut, sw: swOut, knit, flat, fixed, skip, iter: 0, done: false };
  }
  function relax(D: ItemData, passes: number) {
    const d = new THREE.Vector3();
    for (let k = 0; k < passes; k++) {
      for (let e = 0; e < D.E.length; e++) { const ed = D.E[e], a = D.P[ed[0]], b = D.P[ed[1]]; d.subVectors(b, a); const len = d.length() || 1e-6, c = (len - ed[2]) / len * .5 * ed[3]; a.addScaledVector(d, c); b.addScaledVector(d, -c); }
      for (let i = 0; i < D.flat.length; i++) D.P[D.flat[i]].y = 0; // a flat bottom stays flat
    }
    let ox = 0, oz = 0; D.P.forEach(p => { ox += p.x; oz += p.z; }); ox /= D.P.length; oz /= D.P.length; D.P.forEach(p => { p.x -= ox; p.z -= oz; });
    let miny = 1e9; D.P.forEach(p => { if (p.y < miny) miny = p.y; }); D.P.forEach(p => { p.y -= miny; });
  }
  let holo: THREE.Group | null = null;
  function buildHolo(D: ItemData) {
    const n = D.P.length, pos = new Float32Array(n * 3); const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const ring: number[] = [], vert: number[] = []; D.E.forEach(e => { if (e[3] === 1) (Math.abs(e[2] - D.sw) < 1e-9 ? ring : vert).push(e[0], e[1]); });
    const mk = (idx: number[], color: number, op: number) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", pg.getAttribute("position")); g.setIndex(idx); return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: lin(color), transparent: true, opacity: op })); };
    const LC = D.C[D.C.length - 1], hi: number[] = []; for (let i = 0; i < LC.idx.length - (LC.closed ? 0 : 1); i++) hi.push(LC.idx[i], LC.idx[(i + 1) % LC.idx.length]);
    const g = new THREE.Group(); g.add(mk(vert, 0xb99447, .28), mk(ring, 0xb08a3e, .9), mk(hi, 0xc0787e, 1), new THREE.Points(pg, new THREE.PointsMaterial({ color: lin(0xa8823a), size: .11, sizeAttenuation: true })));
    g.userData.pos = pg.getAttribute("position"); return g;
  }
  function updateHolo(D: ItemData) { const a = holo!.userData.pos as THREE.BufferAttribute; for (let i = 0; i < D.P.length; i++) a.setXYZ(i, D.P[i].x, D.P[i].y, D.P[i].z); a.needsUpdate = true; }

  let halos: THREE.Mesh[] = [], meshes: THREE.Mesh[] = [], fz: THREE.LineSegments | null = null, anim = 0, strapH = 0;
  const yarnR = (D: ItemData) => {
    const R = pat.yarnMm / 2 / MM * st.thick * st.fill;
    // a big flat piece drawn every k-th stitch: its yarn stands for k strands
    return D.skip ? Math.min(R * D.skip.stitch, Math.min(D.rh, D.sw) * .42) : R;
  };
  function buildItemYarn(D: ItemData) {
    const R = yarnR(D), geos: THREE.BufferGeometry[] = [];
    const mat = yarnMat(R), M = LOD.M, step = LOD.step, lp = (b: Bot) => D.P[b[0]].clone().lerp(D.P[b[1]], b[2]);
    if (D.knit) buildKnit(D, R, mat, geos);
    else D.C.forEach(c => {
      const tops = c.idx.map(n => D.P[n].clone()), saw: THREE.Vector3[] = [];
      if (c.bot) c.idx.forEach((n, i) => saw.push(D.P[n].clone(), lp(c.bot![i])));
      [saw, tops].forEach((arr0, ix) => {
        // points on the very same spot (a painted stitch with nothing painted under it: its "saw" goes down to
        // itself) are left out; a line of zero length made degenerate geometry that reset the graphics driver
        let arr = arr0.filter((q, i) => i === 0 || q.distanceToSquared(arr0[i - 1]) > 1e-10);
        if (arr.length === 1 && arr0.length > 1 && ix === 0) return; // a saw with nothing below: no saw
        if (!c.closed && arr.length && arr.length < 3) { const a0 = arr[0], a1 = arr[arr.length - 1], d = new THREE.Vector3(D.sw * .35, 0, 0); arr = arr.length === 1 ? [a0.clone().sub(d), a0, a0.clone().add(d)] : [a0, a0.clone().lerp(a1, .5), a1]; }
        if (arr.length < 3) return; const cv = new THREE.CatmullRomCurve3(arr, c.closed, "catmullrom", .5), Rr = ix ? R * .9 : R;
        const pts = cv.getSpacedPoints(Math.max(24, Math.ceil(cv.getLength() / (Rr * .75 * step))));
        const g = buildYarn(pts, Rr, { M, closed: c.closed, color: colorOf(c.ci) }), m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = false; group.add(m); meshes.push(m); geos.push(g);
      });
    });
    strapH = 0;
    if (pat.strap !== "none" && (pat.shape.kind === "round" || pat.shape.kind === "oval" || pat.shape.kind === "rect")) {
      const L = D.C[D.C.length - 1].idx, c = L.length, color = colorOf(D.C[D.C.length - 1].ci); let ry = 0, cx = 0, cz = 0, rr = 0;
      L.forEach(n => { const q = D.P[n]; ry += q.y; cx += q.x; cz += q.z; }); ry /= c; cx /= c; cz /= c; L.forEach(n => { rr += Math.hypot(D.P[n].x - cx, D.P[n].z - cz); }); rr /= c;
      const at = (f: number) => { const q = D.P[L[((Math.round(f * c - .5) % c) + c) % c]].clone(); q.y = ry; return q; };
      // the strap's height from its length (cm): an arc of that length over the gap between its ends
      const len = pat.strapCm * 10 / MM;
      const arcs: [number, number, number][] = pat.strap === "long" ? [[0, .5, 0]] : [[.15, .35, 1], [.65, .85, 1]];
      arcs.forEach(([a, b, lean]) => {
        const A = at(a), B = at(b), w = new THREE.Vector3().subVectors(B, A).normalize(), nrm = new THREE.Vector3(-w.z, 0, w.x), mid = A.clone().add(B).multiplyScalar(.5);
        const H = Math.max(rr * .5, Math.sqrt(Math.max(0, (len / 2) ** 2 - (A.distanceTo(B) / 2) ** 2)) * .92); strapH = Math.max(strapH, H);
        if (nrm.x * (mid.x - cx) + nrm.z * (mid.z - cz) > 0) nrm.negate();
        const sw = Math.max(1, Math.min(5, Math.round(pat.strapW ?? 3)));
        Array.from({ length: sw }, (_, i) => i - (sw - 1) / 2).forEach(k => {
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= 40; i++) { const t = i / 40, q = A.clone().lerp(B, t); q.y += H * Math.sin(Math.PI * t) - R * 1.2 * (1 - Math.sin(Math.PI * t)); q.addScaledVector(nrm, k * R * 1.75 + lean * rr * .12 * Math.sin(Math.PI * t)); pts.push(q); }
          const cv = new THREE.CatmullRomCurve3(pts), g = buildYarn(cv.getSpacedPoints(Math.ceil(cv.getLength() / (R * .6 * step))), R, { M, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
        });
      });
    }
    flapTip = addFlap(D, R, mat, M, step, geos);
    haloShell(geos); fz = fuzzLines(geos); if (fz) group.add(fz);
    if (!opts.phone) addExtras(D, R);
  }
  // ---------- 덮개: rows across the opening from the back, over the top, then down the front as far as the flap
  // is long; its outline below the front edge is the picked shape (반달 / 네모 / 세모). Returns where its tip is.
  let flapTip: { p: THREE.Vector3; n: THREE.Vector3 } | null = null;
  function addFlap(D: ItemData, R: number, mat: THREE.Material, M: number, step: number, geos: THREE.BufferGeometry[]) {
    const f = pat.flap, k = pat.shape.kind; if (!f || !(f.cm > 0) || !(k === "round" || k === "oval" || k === "rect")) return null;
    const top = D.C[D.C.length - 1]; if (!top || !top.closed || top.idx.length < 6) return null;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, ry = 0;
    top.idx.forEach(i => { const q = D.P[i]; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); ry += q.y; }); ry /= top.idx.length;
    const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 * .94, lift = R * 2.2, out = R * 3.4, drop = f.cm * 10 / MM, color = colorOf(top.ci);
    // the centre line in (z, y): a low dome from the back edge to the front edge, then straight down the front
    const line: [number, number, number][] = []; // z, y, share of the drop (-1 on the top)
    const nTop = 24; for (let i = 0; i <= nTop; i++) { const t = i / nTop; line.push([z0 - out * (1 - t) * .3 + (z1 + out - z0) * t, ry + lift + Math.sin(Math.PI * t) * lift * 1.5, -1]); }
    // down the front it lies on the wall: the wall's front at each height (a body widening downward leans out,
    // and a flap hanging straight down would sink into it)
    const frontZ = (y: number) => { let z = -1e9; for (const q of D.P) if (Math.abs(q.x - cx) < hw * .35 && Math.abs(q.y - y) < D.rh * .75 && q.z > z) z = q.z; return z > -1e9 ? z : z1; };
    const nDrop = 24; for (let i = 1; i <= nDrop; i++) { const t = i / nDrop, y = ry + lift - (drop + lift) * t; line.push([Math.max(z1, frontZ(y)) + out, y, t]); }
    const acc = [0]; for (let i = 1; i < line.length; i++) acc.push(acc[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    const total = acc[acc.length - 1], rows = Math.max(3, Math.round(total / D.rh));
    const at = (sv: number) => { let i = 1; while (i < acc.length - 1 && acc[i] < sv) i++; const t = (sv - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]); const a = line[i - 1], b = line[i]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, b[2] < 0 ? -1 : (a[2] < 0 ? 0 : a[2]) + ((b[2]) - (a[2] < 0 ? 0 : a[2])) * t]; };
    const half = (u: number) => f.shape === "square" ? hw : f.shape === "triangle" ? hw * Math.max(.06, 1 - u) : hw * Math.sqrt(Math.max(.01, 1 - u * u));
    let prev: THREE.Vector3[] | null = null, tip: THREE.Vector3 | null = null;
    const left: THREE.Vector3[] = [], right: THREE.Vector3[] = []; // the front part's edges, for its border
    for (let r0 = 0; r0 <= rows; r0++) {
      const [z, y, u] = at(total * r0 / rows), w = u < 0 ? hw : half(u), n = Math.max(2, Math.round(2 * w / D.sw)), row: THREE.Vector3[] = [];
      for (let i = 0; i <= n; i++) row.push(new THREE.Vector3(cx - w + 2 * w * i / n, y, z));
      const mk = (pts: THREE.Vector3[], rr: number) => { if (pts.length < 2) return; const cv = new THREE.CatmullRomCurve3(pts, false, "catmullrom", .5), sp = cv.getSpacedPoints(Math.max(8, Math.ceil(cv.getLength() / (rr * .75 * step)))); const g = buildYarn(sp, rr, { M, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g); };
      mk(row, R * .9);
      if (prev) { const saw: THREE.Vector3[] = []; const pv = prev; row.forEach(q => { let best = pv[0], bd = 1e9; for (const o of pv) { const d = Math.abs(o.x - q.x); if (d < bd) { bd = d; best = o; } } saw.push(q.clone(), best.clone().lerp(q, .35)); }); mk(saw, R); }
      if (u >= 0) { left.push(row[0].clone()); right.push(row[row.length - 1].clone()); }
      prev = row; if (r0 === rows) tip = new THREE.Vector3(cx, y + D.rh * .6, z);
    }
    // the border all round the part on the front (down one side, along the bottom, up the other): a flap's
    // edge is worked as a round of its own, and it is what makes the outline - 반달, 네모, 세모 - read
    if (left.length > 1 && prev) {
      const edge = [...left, ...prev.slice(1, -1).map(q => q.clone().setY(q.y - D.rh * .25)), ...right.reverse()];
      const cv = new THREE.CatmullRomCurve3(edge, false, "catmullrom", .5), sp = cv.getSpacedPoints(Math.max(16, Math.ceil(cv.getLength() / (R * .7 * step))));
      sp.forEach(q => { q.z += R * .5; });
      const g = buildYarn(sp, R * 1.25, { M, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
    }
    return tip ? { p: tip, n: new THREE.Vector3(0, 0, 1) } : null;
  }
  // ---------- 단추 / 라벨 / 지퍼 to try on (the 3D only; nothing of the pattern changes). On a piece with walls
  // they sit on the front wall and round the opening; on a flat piece the button and label lie on top.
  function addExtras(D: ItemData, R: number) {
    const ex = pat.extras; if (!ex || !(ex.button || ex.label || ex.zipper) || !D.P.length) return;
    const b = boxOf(D), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, wall = b.my > D.rh * 3, U = 10 / MM; // U: 1cm
    const std = (color: number, rough = .8, metal = 0) => new THREE.MeshStandardMaterial({ color: lin(color), roughness: rough, metalness: metal, envMap: metal ? ENV : null });
    const put = (m: THREE.Object3D) => { m.traverse(o => { (o as THREE.Mesh).castShadow = true; }); group.add(m); };
    // the stitch at a height (a share of the piece's height) in the direction `a` from the middle (radians from
    // the front, towards the right), and the wall's own outward direction there (from its neighbours: an
    // oval's front wall faces the front, not away from the middle)
    const at = (frac: number, a: number) => {
      const y = b.my * frac, dx = Math.sin(a), dz = Math.cos(a); let best = D.P[0], sc = -1e9;
      for (const q of D.P) { const l = Math.hypot(q.x - cx, q.z - cz) || 1, s = ((q.x - cx) * dx + (q.z - cz) * dz) / l - Math.abs(q.y - y) / (D.rh * 2); if (s > sc) { sc = s; best = q; } }
      if (!wall) return { p: best.clone(), n: new THREE.Vector3(0, 1, 0) };
      let n1: THREE.Vector3 | null = null, n2: THREE.Vector3 | null = null, d1 = 1e9, d2 = 1e9;
      for (const q of D.P) { if (q === best || Math.abs(q.y - best.y) > D.rh * .6) continue; const d = q.distanceToSquared(best); if (d < d1) { d2 = d1; n2 = n1; d1 = d; n1 = q; } else if (d < d2) { d2 = d; n2 = q; } }
      const n = new THREE.Vector3(best.x - cx, 0, best.z - cz).normalize();
      if (n1 && n2) { const t = new THREE.Vector3().subVectors(n1, n2); t.y = 0; if (t.lengthSq() > 1e-8) { t.normalize(); const m = new THREE.Vector3(t.z, 0, -t.x); if (m.dot(n) < 0) m.negate(); if (m.dot(n) > .2) n.copy(m); } }
      return { p: best.clone(), n };
    };
    const face = (o: THREE.Object3D, n: THREE.Vector3) => o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    if (ex.button) {
      const ba = ex.buttonAt, gold = ex.buttonColor === "gold";
      const { p, n } = ba ? (wall ? at(ba[1], ba[0] * Math.PI * .42) : { p: new THREE.Vector3(cx + ba[0] * (b.x1 - b.x0) / 2, b.my, cz - (ba[1] - .5) * (b.z1 - b.z0)), n: new THREE.Vector3(0, 1, 0) })
        : flapTip ?? (wall ? at(.72, 0) : { p: new THREE.Vector3(cx, b.my, cz), n: new THREE.Vector3(0, 1, 0) });
      const r = (ba?.[2] ?? 1.9) / 2 * U, g = new THREE.Group();
      if (gold) {
        // a gold dome, as on a handbag's clasp
        const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd4af37, .28, .9)); dome.rotation.x = Math.PI / 2; dome.scale.set(1, .55, 1); g.add(dome);
      } else {
        const col = ex.buttonColor && /^#[0-9a-f]{6}$/i.test(ex.buttonColor) ? parseInt(ex.buttonColor.slice(1), 16) : 0xb88a5a;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .16 * U * 2, 32), std(col, .62)); disc.rotation.x = Math.PI / 2; g.add(disc);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(r * .82, .05 * U * 2, 8, 32), std(col, .6)); rim.position.z = .15 * U; g.add(rim);
        for (const [hx, hy] of [[-.28, .28], [.28, .28], [-.28, -.28], [.28, -.28]]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.13 * U, .13 * U, .36 * U, 10), std(0x4a372a, .9)); h.rotation.x = Math.PI / 2; h.position.set(hx * r, hy * r, 0); g.add(h); }
      }
      face(g, n); g.position.copy(p).addScaledVector(n, R * 1.5 + .16 * U); put(g);
    }
    if (ex.label) {
      const la = ex.labelAt;
      const { p, n } = la ? (wall ? at(la[1], la[0] * Math.PI * .42) : at(1, la[0])) : wall ? at(.34, .5) : at(1, .9);
      const g = new THREE.Group(), w = (la?.[2] ?? 2.8) * U, h = w / 2;
      g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, .07 * U), std(0xf4ebdd, .95)));
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w * .86, h * .72)), new THREE.LineDashedMaterial({ color: lin(0xb99447), dashSize: .12 * U, gapSize: .1 * U })); edge.computeLineDistances(); edge.position.z = .045 * U; g.add(edge);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w * .42, h * .1, .02 * U), std(0x9c5d63, .9)); bar.position.z = .045 * U; g.add(bar);
      if (wall) face(g, n); else { g.rotation.x = -Math.PI / 2; g.rotation.z = -.3; }
      g.position.copy(p).addScaledVector(n, R * 1.5 + .05 * U); if (!wall) { g.position.x -= w * .3; g.position.z -= h * .6; } put(g);
    }
    const top = D.C[D.C.length - 1];
    if (ex.zipper && wall && top && top.closed && top.idx.length > 8) {
      // a tape round the opening, just inside it, its teeth along the top edge and a pull at the right
      const pts = top.idx.map(i => { const q = D.P[i], n = new THREE.Vector3(q.x - cx, 0, q.z - cz).normalize(); return q.clone().addScaledVector(n, -R * 1.6); });
      const cv = new THREE.CatmullRomCurve3(pts, true), N = Math.min(400, Math.max(48, Math.round(cv.getLength() / (.3 * U)))), sp = cv.getSpacedPoints(N), hb = .9 * U;
      const pos: number[] = [], idx: number[] = [];
      sp.forEach((q, i) => { pos.push(q.x, q.y + R * .4, q.z, q.x, q.y + R * .4 - hb, q.z); if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); });
      const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); tg.setIndex(idx); tg.computeVertexNormals();
      const tm = std(0x8e7b6b, .9); tm.side = THREE.DoubleSide; put(new THREE.Mesh(tg, tm));
      // 지퍼 잠그기 (Kim): closed up to the pull, the rest open - its two rows of teeth apart
      const open = Math.max(0, Math.min(1, ex.zipOpen ?? 0)), shut = Math.round(N * (1 - open)), gap = .55 * U;
      const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(.2 * U, .18 * U, .26 * U), std(0xc9b37a, .35, .8), N * 2), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      let k4 = 0;
      for (let i = 0; i < N; i++) {
        const q = sp[i], t = cv.getTangent(i / N), nr = new THREE.Vector3(q.x - cx, 0, q.z - cz).normalize(); q4.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(t.x, 0, t.z).normalize());
        const sides = i < shut ? [0] : [-gap / 2, gap / 2];
        for (const o of sides) { m4.compose(new THREE.Vector3(q.x + nr.x * o, q.y + R * .4, q.z + nr.z * o), q4, one); teeth.setMatrixAt(k4++, m4); }
      }
      teeth.count = k4; put(teeth);
      const sq = sp[Math.min(N - 1, shut)], st0 = cv.getTangent(Math.min(N - 1, shut) / N), pull = new THREE.Group();
      pull.add(new THREE.Mesh(new THREE.BoxGeometry(.5 * U, .45 * U, .5 * U), std(0xc9b37a, .3, .85)));
      const tab = new THREE.Mesh(new THREE.BoxGeometry(.32 * U, 1.1 * U, .08 * U), std(0xc9b37a, .3, .85)); tab.position.set(0, -.7 * U, .3 * U); pull.add(tab);
      const pn = new THREE.Vector3(sq.x - cx, 0, sq.z - cz).normalize(); face(pull, pn); pull.position.set(sq.x, sq.y + R * .4, sq.z); void st0; put(pull);
    }
  }
  // knitted stockinette: one row = one strand of joined loops (the prototype's buildKnit)
  function buildKnit(D: ItemData, R: number, mat: THREE.Material, geos: THREE.BufferGeometry[]) {
    const K = D.knit!, w = K.wk, Hh = 1.05 * w, a = .22 * w, d = Math.min(R, w * .3), per = page ? 10 : 14, q = Math.round(per * .25), rowC = D.C;
    // a purl stitch is a knit stitch seen from behind: its loop's front and back are swapped. The sign
    // blends over a fifth of a stitch where a knit meets a purl, so the strand passes through the fabric.
    const kf = stitchOf(pat.shape.kind === "rows" ? pat.shape.stitch : undefined).f; // read now: the pattern can change without a new shape
    const sg = (j: number, u: number) => {
      const n = Math.floor(u), fr = u - n, c = (k: number) => kf(j, ((k % K.W) + K.W) % K.W);
      return fr < .1 ? c(n - 1) + (c(n) - c(n - 1)) * (.5 + fr / .2) : fr > .9 ? c(n) + (c(n + 1) - c(n)) * ((fr - .9) / .2) : c(n);
    };
    for (let j = 0; j < K.H; j++) {
      const pts: THREE.Vector3[] = [], tb = K.type === "tube";
      for (let i = tb ? 0 : -q; i < (tb ? K.W * per : K.W * per + q + 1); i++) {
        const u = i / per, ac = w * u + a * Math.sin(4 * Math.PI * u), lp = (Hh / 2) * Math.cos(2 * Math.PI * u), dz = d * Math.cos(4 * Math.PI * u) * sg(j, u);
        if (tb) { const th = ac / K.rho, r = K.rho - dz; pts.push(new THREE.Vector3(Math.cos(th) * r, j * K.rk - lp + Hh / 2, Math.sin(th) * r)); }
        else { const al = (j - (K.H - 1) / 2) * K.rk - lp, x = ac - K.W * w / 2, y = d - dz; pts.push(K.swap ? new THREE.Vector3(al, y, x) : new THREE.Vector3(x, y, al)); }
      }
      const cv = new THREE.CatmullRomCurve3(pts, tb), g = buildYarn(cv.getSpacedPoints(Math.ceil(cv.getLength() / (R * .6 * LOD.step))), R, { M: Math.min(8, LOD.M), closed: tb, color: colorOf(rowC[j]?.ci ?? j) }), m = new THREE.Mesh(g, mat);
      m.castShadow = true; m.receiveShadow = false; group.add(m); meshes.push(m); geos.push(g);
    }
  }
  function sizeInfo(D: ItemData) {
    let my = 0, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    D.P.forEach(q => { if (q.y > my) my = q.y; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); });
    const s = pat.shape, kn = s.kind === "rows" && s.knit, cm = (v: number) => Math.round(v * MM) / 10, k = pat.hookMm / pat.yarnMm;
    // flat rows and tubes are laid at the pattern's size: the edge stitches' centres sit half a stitch inside
    const dx = x1 - x0 + (D.fixed ? D.sw : 0), dz = z1 - z0 + (D.fixed ? D.rh : 0);
    const fit = kn ? (k < .8 ? "바늘이 가늘어서 단단한 편물이 됩니다." : k > 1.6 ? "바늘이 굵어서 성글고 부드러운 편물이 됩니다." : "실과 바늘이 잘 맞습니다.")
      : k < .8 ? "바늘이 가늘어서 빡빡하고 단단한 편물이 됩니다." : k > 1.45 ? "바늘이 굵어서 성글고 부드러운 편물이 됩니다." : "실과 바늘이 잘 맞습니다.";
    const round = s.kind === "round" || s.kind === "tube";
    const h = s.kind === "tube" ? cm(my + D.rh) : my > D.rh * 2 ? cm(my) : null;
    if (s.kind === "grid") { opts.onInfo({ round: false, widthCm: s.wCm, depthCm: s.hCm, heightCm: null, fit, skip: D.skip }); return { my, mr: Math.max(dx, my) / 2 }; }
    opts.onInfo({ round, widthCm: cm(Math.max(dx, dz)), depthCm: cm(Math.min(dx, dz)), heightCm: h, fit, skip: D.skip });
    return { my, mr: Math.max(dx, dz) / 2 };
  }
  function clearGroup() {
    if (anim) { cancelAnimationFrame(anim); anim = 0; }
    group.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; if (mt) (Array.isArray(mt) ? mt : [mt]).forEach(x => x.dispose()); });
    while (group.children.length) group.remove(group.children[0]);
    meshes = []; halos = []; fz = null; holo = null;
  }
  function showItem() {
    const D = IT.data!; clearGroup();
    if (IT.view === "yarn" && D.done) buildItemYarn(D); else { holo = buildHolo(D); updateHolo(D); group.add(holo); }
    kick();
  }
  // ---------- a knitted or crocheted piece is not rigid (Kim): once the shape has settled, a piece with
  // walls gives a little under its own weight - the top drops and leans in, the belly comes out, the rim is
  // no perfect circle; a flat piece lifts at its edge. How much: the material (a cord basket stands, mohair
  // slumps) and how loose it is worked. The settled shape is kept (rest), so another material starts from it.
  // Not on phones (their 3D stays as it was).
  let rest: Float32Array | null = null;
  function soften(D: ItemData) {
    if (D.fixed || !rest || rest.length !== D.P.length * 3) return;
    for (let i = 0; i < D.P.length; i++) D.P[i].set(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]);
    const b = boxOf(D), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, H = b.my, rm = Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 || 1;
    // the opening first: a pouch's long sides come together along the top (its ends spread a little, the
    // same fabric lying flatter); a bucket bag's top is gathered in
    if (pat.top && H > D.rh * 3) {
      const longX = b.x1 - b.x0 >= b.z1 - b.z0;
      for (const p of D.P) {
        if (p.y <= D.rh * .5) continue;
        const t = Math.min(1, p.y / H);
        if (pat.top === "pinch") { const f = t ** 1.25, sq = 1 - f * .94, wd = 1 + f * .1; if (longX) { p.z = cz + (p.z - cz) * sq; p.x = cx + (p.x - cx) * wd; } else { p.x = cx + (p.x - cx) * sq; p.z = cz + (p.z - cz) * wd; } }
        else { const u = Math.max(0, (t - .7) / .3), f = u * u * (3 - 2 * u), th = Math.atan2(p.z - cz, p.x - cx), k = 1 - f * (.2 + .03 * Math.sin(9 * th)); p.x = cx + (p.x - cx) * k; p.z = cz + (p.z - cz) * k; }
      }
    }
    const s = opts.phone || pat.firm ? 0 : Math.max(0, Math.min(1, st.soft * (.6 + .4 * Math.min(2, pat.hookMm / pat.yarnMm))));
    if (s < .03) return;
    if (H < D.rh * 3) { // flat: the edge lifts in three soft waves
      for (const p of D.P) { const k = (Math.hypot(p.x - cx, p.z - cz) / rm) ** 2.4; p.y += s * D.rh * .7 * k * (.5 + .5 * Math.sin(3 * Math.atan2(p.z - cz, p.x - cx) + 1.3)); }
      return;
    }
    const slim = Math.min(1.6, H / (rm * 2)); // a tall, narrow wall gives more
    for (const p of D.P) {
      if (p.y <= D.rh * .5) continue;
      const t = p.y / H, th = Math.atan2(p.z - cz, p.x - cx);
      const k = (1 + s * (.07 * Math.sin(Math.PI * Math.min(1, t * 1.1)) - .055 * t * t) * (.6 + .4 * slim)) * (1 + s * .04 * t * (Math.sin(2 * th + .6) + .5 * Math.sin(3 * th + 2.1)));
      p.x = cx + (p.x - cx) * k; p.z = cz + (p.z - cz) * k; p.y -= s * .075 * t * t * H * (.6 + .4 * slim);
    }
  }
  let t0 = 0;
  function startItem() {
    rest = null;
    opts.onInfo(null); t0 = performance.now(); IT.data = makeItem(); lodFor(IT.data.knit ? IT.data.knit.W * IT.data.knit.H * 1.6 : IT.data.P.length);
    if (IT.data.fixed) IT.data.iter = 1e9; // a known shape: nothing to settle
    showItem();
    // the shape while it settles (its gold lines) is in view as well: it used to fill the page, cut off.
    // Later changes (a size dragged larger, a strap made longer) leave the camera where the reader has it,
    // so the piece is seen to grow (Kim) - unless it would leave the view or be lost in it
    if (opts.fit) { strapH = 0; if (!framed || needsFit(IT.data)) fitAll(IT.data, viewDir()); }
  }
  function fit() { const k = Math.max(1, (cam.aspect < .8 ? .95 : 1.45) / cam.aspect); cam.position.sub(ctl.target).multiplyScalar(k).add(ctl.target); ctl.update(); }
  // the prototype: 8 passes a frame for 150 frames (1200 passes). Past ~40k springs that took 150ms a frame
  // (a 120cm rug: 23s), so big pieces do fewer passes a frame and fewer in all; their first layout (rings at
  // the right radius) is already close to the rest shape
  function tickItem() {
    const D = IT.data; if (!D || D.done) return;
    const big = Math.max(1, D.E.length / 40000), ppf = Math.max(1, Math.round(8 / big)), iters = big > 1 ? Math.max(40, Math.round(150 / big)) : 150;
    if (!D.fixed) { relax(D, ppf); D.iter++; if (holo && holo.parent) updateHolo(D); }
    if (D.iter >= (reduced() ? 1 : iters)) {
      if (!D.fixed && D.iter < iters) relax(D, Math.round(ppf * iters * .75));
      if (D.fixed) relax(D, 0); // centre it on the ground
      D.done = true;
      rest = new Float32Array(D.P.length * 3); D.P.forEach((q, i) => { rest![i * 3] = q.x; rest![i * 3 + 1] = q.y; rest![i * 3 + 2] = q.z; }); soften(D);
      showItem(); // the straps' height is known once the yarn is on
      frameOn(D); opts.onBuilt?.(performance.now() - t0);
    }
  }
  // ---------- the whole piece in view (opts.fit)
  const HOME = new THREE.Vector3(0, .63, .77).normalize();
  let touched = false; // the reader moved the camera: a resize leaves it alone
  const viewDir = () => { const d = cam.position.clone().sub(ctl.target); return d.lengthSq() > 1e-6 ? d.normalize() : HOME.clone(); };
  function boxOf(D: ItemData) {
    let my = 0, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    D.P.forEach(q => { if (q.y > my) my = q.y; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); });
    return { my, x0, x1, z0, z1 };
  }
  /** The camera along `dir`, as near as shows every corner of the piece's box (straps included) and the
   *  shadow its body throws to the lower left, with the box in the middle of the canvas. */
  function fitAll(D: ItemData, dir: THREE.Vector3) {
    const b = boxOf(D), pad = Math.max(D.rh, D.sw) * .8, top = b.my + strapH + pad, pts: THREE.Vector3[] = [];
    for (const x of [b.x0 - pad, b.x1 + pad]) for (const z of [b.z0 - pad, b.z1 + pad]) for (const y of [-.3, top]) pts.push(new THREE.Vector3(x, y, z));
    // the light comes from (7, 9, 10): a point at height h throws its shadow (7/9 h, 10/9 h) away from it
    const sh = b.my * .7; if (sh > D.rh * 2) for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1]]) pts.push(new THREE.Vector3(x - sh * 7 / 9, -.3, z - sh * 10 / 9));
    const d = dir.clone().normalize(); if (Math.abs(d.y) > .999) d.set(0, 1, .03).normalize();
    const f = d.clone().negate(), r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, f);
    const m = page ? .88 : .8, tv = Math.tan(cam.fov * Math.PI / 360) * m, th = tv * cam.aspect;
    const c = new THREE.Vector3((b.x0 + b.x1) / 2, top / 2, (b.z0 + b.z1) / 2), q = new THREE.Vector3(); let dist = 10;
    for (let it = 0; it < 4; it++) {
      dist = 0; for (const p of pts) { q.subVectors(p, c); const dz = q.dot(f); dist = Math.max(dist, Math.abs(q.dot(r)) / th - dz, Math.abs(q.dot(u)) / tv - dz); }
      let ax = 1e9, bx = -1e9, ay = 1e9, by = -1e9;
      for (const p of pts) { q.subVectors(p, c); const dep = dist + q.dot(f), nx = q.dot(r) / (dep * th), ny = q.dot(u) / (dep * tv); ax = Math.min(ax, nx); bx = Math.max(bx, nx); ay = Math.min(ay, ny); by = Math.max(by, ny); }
      c.addScaledVector(r, (ax + bx) / 2 * th * dist).addScaledVector(u, (ay + by) / 2 * tv * dist);
    }
    const ext = Math.max(b.x1 - b.x0, b.z1 - b.z0, top);
    ctl.target.copy(c); cam.position.copy(c).addScaledVector(d, dist); ctl.minDistance = Math.min(3, dist * .2); ctl.maxDistance = Math.max(40, dist * 2.4);
    setShadow(Math.max(10, ext * 1.4)); ctl.update(); kick();
  }
  /** Does the piece need the camera set again? Never once the reader has moved it (touched); otherwise when
   *  a corner of its box is outside the view, or the whole piece has become small in it. */
  let framed = false;
  function needsFit(D: ItemData) {
    if (touched) return false;
    const b = boxOf(D), top = b.my + strapH, v = new THREE.Vector3(); let ax = 1e9, bx = -1e9, ay = 1e9, by = -1e9;
    cam.updateMatrixWorld(); 
    for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) for (const y of [0, top]) { v.set(x, y, z).project(cam); ax = Math.min(ax, v.x); bx = Math.max(bx, v.x); ay = Math.min(ay, v.y); by = Math.max(by, v.y); }
    return ax < -1 || bx > 1 || ay < -1 || by > 1 || Math.max(bx - ax, by - ay) < .7;
  }
  /** the camera on the finished piece (or, `focus: "fabric"`, near enough to read a knitted fabric's stitches) */
  let wasFab = false;
  function frameOn(D: ItemData) {
    if (opts.fit && !(pat.focus === "fabric" && D.knit)) {
      const z = sizeInfo(D), back = wasFab; wasFab = false;
      if (!framed || back || needsFit(D)) { fitAll(D, back ? HOME.clone() : viewDir()); framed = true; }
      else { const ext = Math.max(z.mr * 2, z.my + strapH); setShadow(Math.max(10, ext * 1.4)); ctl.maxDistance = Math.max(ctl.maxDistance, ext * 5); kick(); }
      return;
    }
    {
      const z = sizeInfo(D);
      const tot = z.my + strapH, ext = Math.max(z.mr * 2, tot);
      // the angle the reader turned it to stays; the distance follows the piece. The target sits a little
      // below the middle so the piece stands clear of the labels along the bottom
      const dir = cam.position.clone().sub(ctl.target).normalize(); ctl.target.set(0, tot * .32, 0);
      // 무늬 고르기: looked at with its rows across the screen (a scarf lies with its length sideways); back
      // to the usual angle when the whole piece is shown again
      const fab = pat.focus === "fabric" && !!D.knit;
      if (fab !== wasFab) { wasFab = fab; if (fab && D.knit!.swap) dir.set(.74, .67, 0); else dir.set(0, .63, .77).normalize(); dir.normalize(); }
      // a flat piece is as wide as the page: a little further back; and never so near that the piece's
      // width runs off the sides of a narrow canvas (a long scarf on the book's page)
      const hf = Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect);
      const dist = Math.max((ext * (st.fur ? 2.3 : z.my < D.rh * 3 ? 1.55 : 2) + 2) * (page ? (z.my < D.rh * 3 ? 1.12 : .92) : 1.15), z.mr / Math.tan(hf));
      // 무늬 고르기: about 22 stitches across, so the knit and purl stitches can be told apart
      const near = pat.focus === "fabric" && D.knit ? Math.min(dist, 11 * D.knit.wk / Math.tan(hf)) : dist;
      cam.position.copy(ctl.target).addScaledVector(dir, near); ctl.maxDistance = Math.max(40, dist * 2.2);
      setShadow(Math.max(10, ext * 1.4)); if (near === dist) fit(); else ctl.update();
    }
  }
  // 뜨는 순서: the yarn grows course by course (draw range over the meshes, which are in course order);
  // in the structure view the shape is worked out again from the start, as in the prototype
  function playDraw() {
    if (IT.view === "holo" || !IT.data?.done) { startItem(); return; }
    if (anim) cancelAnimationFrame(anim);
    if (reduced()) return;
    if (fz) fz.visible = false; halos.forEach(h => h.visible = false); const totals = meshes.map(m => m.geometry.index!.count), sum = totals.reduce((a, b) => a + b, 0); meshes.forEach(m => m.geometry.setDrawRange(0, 0));
    const s0 = performance.now(), dur = Math.min(9000, 3500 + IT.data.C.length * 60);
    const stepFn = (now: number) => {
      let k = Math.min(1, (now - s0) / dur) * sum;
      meshes.forEach((m, i) => { const pr = m.geometry.userData.perRing, c = Math.max(0, Math.min(totals[i], k)); m.geometry.setDrawRange(0, Math.floor(c / pr) * pr); k -= totals[i]; });
      if (now - s0 < dur) anim = requestAnimationFrame(stepFn); else { meshes.forEach(m => m.geometry.setDrawRange(0, Infinity)); if (fz) fz.visible = true; halos.forEach(h => h.visible = true); anim = 0; }
      kick();
    };
    anim = requestAnimationFrame(stepFn);
  }

  // ---------- drawing only when something changes: the shape settling, the camera moving (damping
  // included), the order animation. Nothing runs while it sits still.
  let raf = 0, alive = true;
  function frame() {
    raf = 0; if (!alive) return;
    const settling = !!IT.data && !IT.data.done;
    tickItem();
    const moved = ctl.update();
    renderer.render(scene, cam); rules();
    if (settling || moved || anim) kick();
  }
  function kick() { if (alive && !raf) raf = requestAnimationFrame(frame); }
  ctl.addEventListener("change", kick); ctl.addEventListener("start", () => { touched = true; kick(); });
  // ---------- 재기: the width along the front edge, the height (or, for a flat piece, the depth) at the right
  let rulerOn = false, lastRule = "";
  function rules() {
    const D = IT.data; if (!rulerOn || !opts.onRuler || !D || !D.done) { if (lastRule) { lastRule = ""; opts.onRuler?.(null); } return; }
    const b = boxOf(D), g = Math.max(D.rh, D.sw) * 1.6, e = D.fixed ? D.sw / 2 : 0, ez = D.fixed ? D.rh / 2 : 0, cm = (v: number) => Math.round(v * MM) / 10;
    const px = (x: number, y: number, z: number) => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * lastW, (1 - v.y) / 2 * lastH]; };
    const line = (a: number[], c: number[], n: number): YarnRule => { const [x1, y1] = px(a[0], a[1], a[2]), [x2, y2] = px(c[0], c[1], c[2]); return { x1, y1, x2, y2, cm: cm(n) }; };
    const out = [line([b.x0 - e, 0, b.z1 + ez + g], [b.x1 + e, 0, b.z1 + ez + g], b.x1 - b.x0 + e * 2)];
    if (b.my > D.rh * 2) out.push(line([b.x1 + g, 0, b.z1], [b.x1 + g, b.my, b.z1], b.my + (pat.shape.kind === "tube" ? D.rh : 0)));
    else out.push(line([b.x1 + e + g, 0, b.z0 - ez], [b.x1 + e + g, 0, b.z1 + ez], b.z1 - b.z0 + ez * 2));
    const key = out.map(o => [o.x1, o.y1, o.x2, o.y2, o.cm].map(Math.round).join()).join(";");
    if (key !== lastRule) { lastRule = key; opts.onRuler(out); }
  }
  let lastW = 0, lastH = 0;
  const resize = () => {
    // the book's pages are zoomed (CSS zoom): the drawn size is the box on the screen
    const r = canvas.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height); if (!w || !h || (w === lastW && h === lastH)) return;
    lastW = w; lastH = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); kick();
    if (opts.fit && !touched && IT.data && !(pat.focus === "fabric" && IT.data.knit)) fitAll(IT.data, viewDir());
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  ctl.target.set(0, 0, 0); fit();
  startItem();

  // what changes the shape (counts, yarn and hook, strap): anything else is colour
  // the stitch pattern of a knitted piece changes its yarn, not its shape
  // (a strap is put on with the yarn: its length and width do not settle the shape again)
  const shapeKey = (p: YarnPattern) => JSON.stringify([{ ...p.shape, stitch: undefined }, p.yarnMm, p.hookMm]);
  return {
    setPattern(p) {
      const reshape = shapeKey(p) !== shapeKey(pat), mat = p.material !== pat.material, refocus = p.focus !== pat.focus;
      if (p.shape.kind !== pat.shape.kind) { framed = false; touched = false; }
      const retop = p.top !== pat.top; // another kind of piece: the camera starts over
      pat = p;
      if (mat) Object.assign(st, presetOf(p.material));
      if (reshape) startItem();
      else if (IT.data?.done) { if (mat || retop) soften(IT.data); showItem(); if (refocus) frameOn(IT.data); else if (opts.fit && framed && needsFit(IT.data) && !(pat.focus === "fabric" && IT.data.knit)) fitAll(IT.data, viewDir()); } // colour, material or stitch pattern: the yarn again, the shape as it is (a softer yarn gives more)
    },
    setMaterial(m) {
      if (m === st.preset) return;
      Object.assign(st, presetOf(m));
      if (IT.data?.done) { soften(IT.data); showItem(); }
    },
    setView(v) { IT.view = v; if (IT.data) showItem(); },
    playDraw,
    zoom(f) { const v = cam.position.clone().sub(ctl.target), l = Math.min(ctl.maxDistance, Math.max(ctl.minDistance, v.length() * f)); cam.position.copy(ctl.target).addScaledVector(v.normalize(), l); touched = true; ctl.update(); kick(); },
    home() { touched = false; framed = true; if (IT.data) { cam.position.copy(ctl.target).addScaledVector(HOME, 10); wasFab = false; if (opts.fit) fitAll(IT.data, HOME.clone()); else frameOn(IT.data); } },
    look(v) {
      if (!IT.data) return; touched = false;
      const d = v === "front" ? new THREE.Vector3(0, .1, 1) : v === "side" ? new THREE.Vector3(1, .1, 0) : v === "top" ? new THREE.Vector3(0, 1, .03) : new THREE.Vector3(0, .9, .45);
      fitAll(IT.data, d.normalize());
    },
    setTool(t) {
      ctl.enablePan = t === "pan"; ctl.screenSpacePanning = true;
      ctl.mouseButtons.LEFT = t === "pan" ? THREE.MOUSE.PAN : t === "zoom" ? THREE.MOUSE.DOLLY : THREE.MOUSE.ROTATE;
      ctl.touches.ONE = t === "pan" ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    },
    setRuler(on) { rulerOn = on; kick(); },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); clearGroup(); ctl.dispose();
      scene.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mt = m.material as THREE.Material | undefined; if (mt) mt.dispose(); });
      FTEX.dispose(); HTEX.dispose(); envSrc.dispose(); ENV.dispose(); sun.shadow.map?.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
