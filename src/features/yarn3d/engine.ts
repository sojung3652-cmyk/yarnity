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
import { extraPic, extraSrc } from "@/lib/extras";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ellipseRing, roundSection, type Outline } from "@/lib/outline";
import type { Chart } from "@/lib/crochetChart";
import { stitchOf } from "@/lib/knit";

export type YarnMaterial = "cotton" | "wool" | "mohair" | "linen" | "silk" | "chenille" | "raffia" | "cord" | "fur" | "metal"
  | "cashmere" | "alpaca" | "angora" | "sleep" | "boucle" | "scrub" | "tshirt" | "ribbon" | "jute" | "nylon";
/** wrist: a loop to slip the hand through, hanging from the top's right corner (Kim: a wristlet) */
/** pack: a drawstring backpack's one cord - round the opening, and down each side to a loop at the bottom */
export type YarnStrap = "none" | "two" | "long" | "wrist" | "pack";
/** a course of a piece whose stitches are set where they lie (YarnShape "form"; src/features/yarn3d/worn): the
 *  stitches' places (x, y, z in cm, y up from the table), the course they stand on (an index; -1: none - a cord,
 *  drawn as a strand), the point the fabric faces away from, and - when they are not the piece's own - the
 *  stitches drawn (one for the course or one a stitch) and their colours' indexes. `ghost`: not drawn, only
 *  stood on. */
export interface FormCourse { p: number[]; closed?: boolean; on: number; ghost?: boolean; cen: [number, number, number]; ci?: number; cols?: number[]; ty?: WallStitch | WallStitch[] }
/** what a piece is shown on (Kim: 모자·후드는 머리 모양 받침 위에, 보틀백은 병 모양 받침 위에 - 아주 연한 색): a lathe's
 *  outline, [radius, height] in cm from the table up. `fitTo`: the piece's own width (cm) the outline was drawn
 *  for - a piece the engine settles itself (a bottle's bag) is measured, and the stand made to that measure. */
export interface YarnStand { kind: "head" | "bottle" | "torso"; prof: [number, number][]; fitTo?: number }
/** what is drawn, in the pattern's own counts (stitches per course, bottom first) */
export type YarnShape =
  | { kind: "round"; counts: number[]; flat: number }                       // magic ring; `flat` = rounds that lie flat (the bottom)
  | { kind: "oval"; chain: number; bottom: number[]; body: number[] }        // around a base chain, then a body (wall)
  | { kind: "rect"; chain: number; bottom: number[]; body: number[] }
  | { kind: "rows"; W: number; H: number; wCm: number; hCm: number; knit: boolean; stitch?: string } // back and forth (knit: its stitch pattern, lib/knit.ts)
  | { kind: "tube"; W: number; H: number; circCm: number; hCm: number }    // in the round, no bottom
  // a painted picture (직접 그리기 · 자유롭게): W x H stitches, row-major from the bottom, -1 = a hole, else the
  // colour's index in `colors`; it stands up facing you (two of it, front and back, for pieces 2)
  /** (`turn`: worked sideways - the rows stand upright in the piece, a row's stitches running up it; W, wCm are a row's, H, hCm the rows') */
  | { kind: "grid"; W: number; H: number; wCm: number; hCm: number; cells: number[]; pieces?: 1 | 2; turn?: boolean }
  // a crochet stitch pattern (lib/crochetChart: shells, mesh...), lying flat: every stitch from its base to its top
  | { kind: "chart"; chart: Chart; wCm: number; hCm: number }
  // a piece set where it lies when worn (a hat on a head): nothing settles. `key` names the form (what it was
  // made from), `size` its width, depth and height in cm as the screen says them
  | { kind: "form"; key: string; courses: FormCourse[]; size: [number, number, number | null] };
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
  /** a drawn, rounded bag (Kim's guide for a round crochet handbag): its depth against its width at evenly spaced
   *  heights, bottom to top. The finished body is pressed flat to it, each height keeping its round's length (the
   *  stitches are not squeezed: a round bag of soft fabric goes flat like this when its sides fall in) */
  depth?: number[];
  /** a firm edging round the opening (the last round worked as a thicker border) */
  rim?: boolean;
  /** a handle worked as a band (Kim): a chain from one side of the opening to the other, then this many rows of
   *  짧은뜨기 along it, each row a little longer than the one inside it */
  strapRows?: number;
  /** set down and left to its own weight (Kim: a real bag is not rigid): the wall gives by how firm the yarn is -
   *  cord and nylon stand, cotton sinks a little, soft yarns fold - and a soft handle falls to one side */
  gravity?: boolean;
  /** a drawn body's own outline (lib/outline): every round is laid on it, so the 3D's front view is the drawing */
  outline?: Outline;
  /** a closed, stuffed piece (a drawn shape that ends on its centre line): it keeps its shape, no slump */
  firm?: boolean;
  /** how far the top stays open, cm (Kim: a flap's bag is closed to this at its top - 0 shut as a zipper's); a
   *  zipper closes it by itself (extras.zipOpen) */
  topGap?: number;
  /** 합사: a second yarn's colour held together with the first - their plies twist round each other (marled) */
  marl?: string;
  /** the held yarn's material: its hairs show too (a wool with angora held in is hairy) */
  marlMat?: YarnMaterial;
  /** how much of the strand the held yarn is (Kim: by the two yarns' thicknesses) - 0..1 */
  marlShare?: number;
  /** 탄성 (Kim): how limp the fabric is against the yarn's own (0.3 firm .. 1 as it is .. 2.5 very limp) - 3D only */
  softK?: number;
  /** closing the top: "spread" the sides go out (the round's length kept), "tuck" the width kept and the sides
   *  folded in at the top (as a paper bag's) */
  topFold?: "spread" | "tuck";
  /** how many strands side by side a strap is (1-5; 3 when missing) */
  strapW?: number;
  /** a handle as it is made (Kim): flat in rows along it (a chain first, widened), flat in rows across it (worked
   *  to its width, then row by row to its end), or a tube worked round; `strapWcm` its width or thickness */
  strapStyle?: "flat-chain" | "flat-rows" | "tube";
  strapWcm?: number;
  /** a handle grown out of the opening (Kim: 몸통에서 이어 뜨는 손잡이; lib/pattern grownHandle): `foot` each
   *  foot's share of the opening's round (0-.5), `dec` the share of each half that narrows. It is drawn as the
   *  body's own rounds going on up - the same stitches, the same stitch pattern */
  strapGrown?: { foot: number; dec: number };
  /** things sewn on to try in the 3D only (Kim: 단추, 라벨, 지퍼), with where and how big (Kim): `buttonAt` /
   *  `labelAt` = [across the front -1..1, up 0..1, size in cm]; `zipOpen` 0 closed .. 1 open; the button's colour */
  extras?: { button?: boolean; label?: boolean; zipper?: boolean; buttonAt?: [number, number, number]; labelAt?: [number, number, number]; zipOpen?: number; buttonColor?: string; zipColor?: "gold" | "silver" | "brass"; tab?: boolean; buttonPic?: string; labelPic?: string;
    /** more buttons and labels (Kim: 여러 개), each a picture (lib/extras) at [across, up, size cm] */
    items?: { pic: string; at: [number, number, number] }[] };
  /** a handle (strap) in its own colour, when it differs from the body */
  strapColor?: string;
  /** a bag's flap (덮개): worked from the back of the opening, over the top and down the front (Kim: it has to show) */
  /** over: it covers the open top flat, front to back, and turns down at the front edge (Kim) */
  /** (`slant-l` / `slant-r`: its left or its right edge comes in row by row - lib/structure taper; `tip`: how wide
   *  a slant or a triangle still is at its end, against its width at the top) */
  /** (`steps`: a square flap that comes in at both ends in that many steps down to `tip` of its width - 계단 덮개) */
  flap?: { cm: number; shape: "half" | "square" | "triangle" | "slant-l" | "slant-r"; color?: string; over?: boolean; tip?: number; steps?: number };
  /** the crochet stitch's height against single crochet (긴뜨기 ~1.6, 한길긴뜨기 ~2.2) */
  stitchH?: number;
  /** 이랑뜨기 (back loop only): the front loop left unworked stands up as a ridge along each row */
  ridge?: boolean;
  /** a stitch pattern on a made shape's body (Kim: 모양 만들었을 때 무늬): its repeat, W stitches by H rows, bottom
   *  row first - each cell the stitch worked there (sc, hdc, dc, tr, pop a bobble, ch a chain over a gap: a hole)
   *  and its colour (an index into `colors` here); the body's rounds take it round after round */
  wall?: { W: number; H: number; t: WallStitch[][]; c?: number[][]; colors?: string[] };
  /** the stand under or inside the piece (a head, a bottle), in a very pale colour */
  stand?: YarnStand;
}
export type WallStitch = "sc" | "hdc" | "dc" | "tr" | "pop" | "ch";
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
  /** the piece from the front, the camera put back after: a JPEG data URL (null without a piece) */
  snapshot(): string | null;
  /** the current view as it is, full size (for checking up close) */
  viewShot(): string;
  /** what dragging does: turn it, move it across the screen, or zoom */
  setTool(t: YarnTool): void;
  /** 재기: the piece's width and height (or depth) as lines on the screen (opts.onRuler) */
  setRuler(on: boolean): void;
  /** 크기 틀: the piece's box on the screen (opts.onFrame), on or off */
  setFrame(on: boolean): void;
  dispose(): void;
}
export type YarnLook = "front" | "side" | "top" | "inside";
export type YarnTool = "rotate" | "pan" | "zoom";
/** a measuring line on the screen, in the canvas's own pixels */
export interface YarnRule { x1: number; y1: number; x2: number; y2: number; cm: number }
/** `fit` (the web's page and work screen): the camera is set so the whole piece - straps and most of its
 *  shadow included - is in view and in the middle, whatever the canvas's shape; without it the first
 *  framing (phones) stays as it was */
export interface ViewerOpts { phone: boolean; detail?: "full" | "page"; fit?: boolean; onInfo: (i: YarnInfo | null) => void; onBuilt?: (ms: number) => void;
  /** a shape being made (true) and done (false): the screen shows 생성 중 meanwhile */
  onBusy?: (busy: boolean) => void; onRuler?: (r: YarnRule[] | null) => void;
  /** 단추 / 라벨 dragged on the piece (Kim: moved freely): where it was let go, [across -1..1, up 0..1] */
  onExtraMove?: (kind: string, across: number, up: number) => void;
  /** a button or label pressed without dragging (Kim: 클릭해서 크기 조절): which, and where on the screen */
  onExtraPick?: (kind: string, x: number, y: number) => void;
  /** the pointer resting on one: which, and where (its tools show there) */
  /** the pointer on one (kind) or off it again (null) */
  onExtraHover?: (kind: string | null, x: number, y: number) => void;
  /** one pressed: it is being moved now */
  onExtraGrab?: () => void;
  /** 크기 틀 (Kim: Ctrl+T처럼 화면 안에서): the piece's outline on the screen as a box [left, top, right, bottom] in px */
  onFrame?: (r: [number, number, number, number] | null) => void }

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
  wool: { ...P0, plies: 3, twist: .7, fuzz: .5, depth: .22, rough: .92, ao: .24, sheen: 0, halo: .18, soft: .6 },
  mohair: { ...P0, plies: 2, twist: .45, fuzz: 1.7, depth: .12, rough: 1, ao: .16, sheen: 0, halo: .5, fill: 1.05, soft: .85 },
  linen: { ...P0, plies: 2, twist: .55, fuzz: .08, depth: .2, rough: .9, ao: .3, slub: .38, soft: .45 },
  silk: { ...P0, plies: 3, twist: .9, fuzz: 0, depth: .18, rough: .38, ao: .22, sheen: .7, soft: .75 },
  nylon: { ...P0, plies: 3, twist: 1, fuzz: 0, depth: .2, rough: .4, ao: .22, sheen: .65, soft: .12 },
  chenille: { ...P0, plies: 1, twist: 0, fuzz: .15, depth: 0, rough: 1, ao: .1, sheen: 0, halo: .3, fill: 1.75, soft: .7 },
  raffia: { ...P0, plies: 1, twist: .25, fuzz: 0, depth: 0, rough: .58, ao: .22, flat: 3.4, fill: 1.15, soft: .2 },
  cord: { ...P0, plies: 8, twist: 1.3, fuzz: 0, depth: .2, braid: true, rough: .92, ao: .28, sheen: 0, soft: .1 },
  fur: { ...P0, plies: 2, twist: .6, fuzz: 1, depth: .12, rough: 1, ao: .14, halo: .85, fill: 1, hair: 3.4, soft: .7 },
  metal: { ...P0, plies: 3, twist: 1.5, fuzz: 0, depth: .3, rough: .3, ao: .3, metal: .85, soft: .35 },
  // more yarns to tell apart in the 3D (Kim: as many as can be shown)
  cashmere: { ...P0, plies: 3, twist: .6, fuzz: .7, depth: .16, rough: .95, ao: .2, sheen: 0, halo: .32, soft: .8 },
  alpaca: { ...P0, plies: 2, twist: .5, fuzz: 1.15, depth: .14, rough: 1, ao: .18, sheen: 0, halo: .42, hair: 1.25, fill: 1.15, soft: .8 },
  angora: { ...P0, plies: 2, twist: .4, fuzz: 2.3, depth: .08, rough: 1, ao: .12, sheen: 0, halo: .72, hair: 1.5, fill: 1, soft: .9 },
  sleep: { ...P0, plies: 1, twist: 0, fuzz: .9, depth: 0, rough: 1, ao: .08, sheen: 0, halo: .7, hair: 1.2, fill: 1.8, soft: .85 },     // 수면사: a thick, very soft pile yarn
  boucle: { ...P0, plies: 2, twist: .35, fuzz: .45, depth: .26, rough: 1, ao: .26, sheen: 0, halo: .34, slub: .95, fill: 1.4, soft: .65 }, // loops along the strand
  scrub: { ...P0, plies: 1, twist: .3, fuzz: 1.25, depth: 0, rough: .4, ao: .16, sheen: .8, metal: .18, halo: .4, hair: 2.2, glint: .4, fill: .95, soft: .5 }, // 수세미실: shiny tinsel
  tshirt: { ...P0, plies: 1, twist: .12, fuzz: 0, depth: 0, rough: .95, ao: .2, flat: 2.3, fill: 1.5, soft: .5 },                         // 패브릭얀: a jersey tape
  ribbon: { ...P0, plies: 1, twist: .4, fuzz: 0, depth: 0, rough: .9, ao: .2, sheen: 0, flat: 4.2, fill: 1.2, soft: .55 },
  jute: { ...P0, plies: 3, twist: 1.15, fuzz: .7, depth: .32, rough: 1, ao: .36, slub: .3, hair: .8, soft: .2 },                           // 황마: rough, hairy, stiff
};
const presetOf = (m: YarnMaterial) => { const p = PRE[m] ?? PRE.cotton; return { ...p, preset: m, fur: p.hair >= 2 }; };

const MM = 12; // model units: 1 unit = 12mm
const lin = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** WebGL present? (the overlay shows one line instead of the viewer when not) */
export function hasWebGL(): boolean {
  // whether the browser has WebGL at all - without making a context to find out (on Windows each one made is
  // 0.2s of the page standing still, and this was asked before every viewer). A context that cannot be made
  // after all: createYarnViewer gives null, and the screens say so the same way
  return typeof window !== "undefined" && ("WebGL2RenderingContext" in window || "WebGLRenderingContext" in window);
}

/** the stitches a pattern draws (for the level of detail) */
export function stitchCount(s: YarnShape): number {
  if (s.kind === "round") return s.counts.reduce((a, b) => a + b, 0);
  if (s.kind === "oval" || s.kind === "rect") return s.chain + [...s.bottom, ...s.body].reduce((a, b) => a + b, 0);
  if (s.kind === "grid") return s.cells.filter(c => c >= 0).length * (s.pieces ?? 1);
  if (s.kind === "chart") return s.chart.st.length * 3 + s.chart.ch.length;
  if (s.kind === "form") return s.courses.reduce((a, c) => a + (c.ghost ? 0 : c.p.length / 3), 0);
  return s.W * s.H;
}

type Edge = [number, number, number, number];
type Bot = [number, number, number];
interface Course { idx: number[]; closed: boolean; bot: Bot[] | null; ci: number; /** a round of the body (the wall), not the bottom */ body?: boolean;
  /** a form's course (FormCourse): the point its fabric faces away from, its stitches and their colours when they are its own */
  cen?: THREE.Vector3; cols?: number[]; ty?: WallStitch | WallStitch[] }
interface Knit { type: "flat" | "tube"; W: number; H: number; swap: boolean; wk: number; rk: number; rho: number; R: number }
interface ItemData { P: THREE.Vector3[]; E: Edge[]; C: Course[]; rh: number; sw: number; knit: Knit | null; flat: number[]; fixed: boolean; skip: { stitch: number; row: number } | null; iter: number; done: boolean; /** set where it lies (a form): it stays there, over its stand */ form?: boolean }

export function createYarnViewer(canvas: HTMLCanvasElement, first: YarnPattern, opts: ViewerOpts): YarnViewer | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.phone, alpha: true, powerPreference: opts.phone ? "low-power" : "default" }); /* phones: no multisampling (its buffers are memory a phone runs out of; Kim 11/25) */ } catch { return null; }
  const page = opts.detail === "page";
  // phones: 1.5x at most - a phone's GPU memory runs out at 2x with a big piece, and the browser closes the page
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.phone ? 1.25 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  // the shadow is drawn again only when the piece or the light changes, not while the camera turns (the light and
  // the yarn stand still then; drawing every triangle twice a frame was half the work of turning it)
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 900); cam.position.set(0, 11, 13.5);
  const ctl = new OrbitControls(cam, canvas); ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.enablePan = false; ctl.minDistance = 3; ctl.maxDistance = 40;
  // light from the upper right -> shadows fall to the lower left
  scene.add(new THREE.HemisphereLight(lin(0xfffaf2), lin(0xe6dccd), 0.62 * Math.PI));
  const sun = new THREE.DirectionalLight(lin(0xfff6ea), 0.88 * Math.PI); sun.position.set(7, 9, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(page || opts.phone ? 1024 : 2048, page || opts.phone ? 1024 : 2048); const sc = sun.shadow.camera; sc.near = 1; sun.shadow.bias = -0.0006; sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(lin(0xf2e9df), 0.16 * Math.PI); fill.position.set(-8, -2, 6); scene.add(fill);
  // the yarn casts its shadow on the ground but not on itself: self-shadowing greyed every colour (Kim:
  // "칙칙"); the grooves between strands already shade the fabric
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: lin(0x5a4632), opacity: .2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.3; ground.receiveShadow = true; scene.add(ground);
  // what is on the stage. While the yarn is being made (a job, below) the new piece is put together in a group of
  // its own, off the stage: what was shown stays shown until the new one is whole, then the two change places
  let group = new THREE.Group(); scene.add(group);
  // 단추 / 라벨 that can be dragged over the piece (Kim): the sewn-on things, and how to put one at a place
  let exObjs: THREE.Object3D[] = [], exPlace: ((o: THREE.Object3D, across: number, up: number) => void) | null = null;
  /** where the flap lies over the front (its middle, half width, top and bottom heights, how far out of the wall) */
  /** the flap's front: `face(x, y)` is how far out its face is there, or null where the flap is not (its own outline) */
  let flapArea: { cx: number; hw: number; yTop: number; yBot: number; out: number; face: (x: number, y: number) => number | null } | null = null;
  // Kim's button and label pictures, loaded once each (the 3D is drawn again when one arrives)
  const pics = new Map<string, THREE.Texture>();
  const picTex = (id: string) => {
    let t = pics.get(id);
    if (!t) { t = new THREE.TextureLoader().load(extraSrc(id), () => kick()); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; pics.set(id, t); }
    return t;
  };
  /** a picture cut to its edge, standing out a little from the piece (a thin card: its face, and its edge darker behind) */
  const picCard = (id: string, w: number, h: number, depth: number) => {
    const g = new THREE.Group(), map = picTex(id);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: .45, roughness: .55, metalness: 0 }));
    face.position.z = depth; g.add(face);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, color: 0x6e6158, transparent: true, alphaTest: .45, roughness: .9 }));
    g.add(back); return g;
  };
  // the light, its shadow box and the ground grow with the piece (the prototype's wider camera / shadow range)
  function setShadow(half: number) {
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.far = Math.max(40, half * 4.5);
    sun.position.set(7, 9, 10).multiplyScalar(Math.max(1, half / 10)); sc.updateProjectionMatrix();
    ground.scale.setScalar(Math.max(1, half / 12)); renderer.shadowMap.needsUpdate = true;
  }
  setShadow(10);

  // ---------- environment reflection (metallic yarn)
  const envSrc = (() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, "#fffdf6"); g.addColorStop(.38, "#cdbfa8"); g.addColorStop(.52, "#4a4038"); g.addColorStop(.7, "#8c7a66"); g.addColorStop(1, "#2e2823"); x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    ([[190, 26, 26], [60, 40, 16], [120, 18, 12]] as const).forEach(([a, b, r]) => { const q = x.createRadialGradient(a, b, 0, a, b, r); q.addColorStop(0, "rgba(255,255,255,1)"); q.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = q; x.fillRect(a - r, b - r, r * 2, r * 2); });
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  // made the first time a yarn or a button needs it (metallic, silk; a metal button): making it compiles shaders
  // of its own - 0.7s of the page standing still at every opening, for a map cotton and wool never use
  // Of the four shaders three puts together for it, the one it lets be asked for ahead (the picture's own) is
  // handed to the driver now, to be ready by then; the other three are three's own business until it is made.
  let ENV: THREE.Texture | null = null;
  const pmrem = new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader();
  const env = () => { if (!ENV) ENV = pmrem.fromEquirectangular(envSrc).texture; return ENV; };

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
  // a held yarn (합사) brings its own hairs: the hairier of the two (Kim: 갈색 울 + 흰색 앙고라)
  const withHeld = () => { if (!pat.marlMat) return; const h = presetOf(pat.marlMat); st.fuzz = Math.max(st.fuzz, h.fuzz); st.halo = Math.max(st.halo, h.halo); st.hair = Math.max(st.hair, h.hair); };
  withHeld();
  const IT = { view: "yarn" as "yarn" | "holo", data: null as ItemData | null };
  const colorOf = (ci: number) => pat.colors[Math.max(0, Math.min(ci, pat.colors.length - 1))] || "#EFE6D4";

  // ---------- level of detail from the stitch count (the page's preview is lighter than the full screen)
  const VERT_BUDGET = page ? (opts.phone ? 220_000 : 350_000) : opts.phone ? 320_000 : 1_400_000, BASE_VPS = 187; // ~17 points x 11 ring vertices per stitch at full detail
  // flat rows and tubes: past this many stitches every k-th stitch and row is drawn
  const DRAW_STITCHES = page ? (opts.phone ? 6_000 : 9_000) : opts.phone ? 8_000 : 24_000;
  // crochet drawn as loops: a stitch is a head and two legs, and at the thinnest that is still ~119 vertices (17
  // rings of 7). Past VERT_BUDGET / 130 stitches the budget cannot be kept by thinning strands, so stitches are
  // skipped from there (Kim 11/25: 렉 - a 12,000-stitch bag came out at twice the budget, a phone's at six times)
  const LOOP_STITCHES = Math.min(DRAW_STITCHES, Math.floor(VERT_BUDGET / 130));
  let LOD = { M: 10, step: 1 };
  function lodFor(drawn: number) {
    const want = VERT_BUDGET / Math.max(1, drawn), maxM = page ? 12 : 12; // 12 round the strand: four plies twist
    LOD = want >= BASE_VPS ? { M: maxM, step: 1 } : { M: want >= BASE_VPS * .6 ? Math.min(8, maxM) : 6, step: 1 };
    if (want < BASE_VPS) LOD.step = Math.min(4, Math.max(1, (17 * (LOD.M + 1)) / want));
  }
  // raised a lot (Kim: at the slider's top the hairs were still too few) - line segments stay cheap to draw
  const fuzzCap = () => page ? (opts.phone ? 15_000 : st.fur ? 40_000 : 60_000) : opts.phone ? (st.fur ? 18_000 : 24_000) : 220_000;

  function yarnMat(R: number) {
    // sheen: the soft light along fibres (wool, chenille, silk), the colour stays the yarn's own
    // dry (Kim): only silk and nylon (drawn as silk), the tinsel and metal shine; the rest takes little light
    const shiny = st.preset === "silk" || st.preset === "nylon" || st.preset === "scrub" || st.metal > .5;
    const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: shiny ? st.rough : Math.max(.94, st.rough), specularIntensity: shiny ? 1 : .25, metalness: st.metal, envMap: st.metal || st.preset === "silk" ? env() : null, envMapIntensity: st.metal ? 1.25 : .35,
      bumpMap: FTEX, bumpScale: R * (st.preset === "raffia" ? .14 : .05), sheen: st.sheen, sheenRoughness: st.preset === "silk" ? .28 : .6, sheenColor: new THREE.Color(.34, .33, .32) });
    // the inside of a piece with walls is in its own shade (Kim: 위가 막혀 보인다 - the inner wall seen through the
    // opening was as bright as the outside and read as a lid): the yarn's faces that look in towards the piece's
    // middle, below its rim, are drawn darker (a wall is "looked at from inside" when the camera is on its inner side - not by the yarn's
    // own normals: where a round joins the strands lean, and a patch of the outside went dark). `uIn` = the middle (x, z), the rim's and the
    // bottom's height; `uInR` = the opening's half sizes; `uInK` = how dark at the rim, how much more at the bottom
    // (0, 0: nothing - every other piece), and the height the shade stops at (the rim; a handle grown out of the
    // opening is the wall going on, so its feet's inner faces are in the shade too). No light, no shadow map: it costs nothing to draw.
    const inU = { uIn: { value: new THREE.Vector4(0, 0, 0, 0) }, uInR: { value: new THREE.Vector2(1, 1) }, uInK: { value: new THREE.Vector3(0, 0, 0) } };
    m.userData.inU = inU;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, inU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vInP;\nvarying vec3 vInN;\nvarying vec3 vInW;\nvarying vec3 vInO;\nuniform vec4 uIn;\nuniform vec2 uInR;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvInP = transformed;\nvInN = objectNormal;\nvInW = (modelMatrix * vec4(transformed, 1.)).xyz;\nvec2 inG0 = (transformed.xz - uIn.xy) / (uInR * uInR);\nvInO = mat3(modelMatrix) * vec3(inG0.x, 0., inG0.y);");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vInP;\nvarying vec3 vInN;\nvarying vec3 vInW;\nvarying vec3 vInO;\nuniform vec4 uIn;\nuniform vec2 uInR;\nuniform vec3 uInK;")
        .replace("#include <color_fragment>", `#include <color_fragment>
        if (uInK.x + uInK.y > 0.) {
          vec2 inD = vInP.xz - uIn.xy; vec2 inG = normalize(inD / (uInR * uInR) + 1e-6); vec3 inN = normalize(vInN);
          float inDeep = clamp((uIn.z - vInP.y) / max(1e-3, uIn.z - uIn.w), 0., 1.);
          float inWall = smoothstep(.05, -.2, dot(normalize(vInO + 1e-6), normalize(cameraPosition - vInW)));
          float inFloor = smoothstep(.2, .7, inN.y) * smoothstep(.8, .95, inDeep) * smoothstep(1., .7, dot(inD / uInR, inD / uInR));
          diffuseColor.rgb *= 1. - max(inWall * step(vInP.y, uInK.z), inFloor * step(vInP.y, uIn.z)) * (uInK.x + uInK.y * inDeep);
        }`);
    };
    return m;
  }

  // ---------- yarn: centre line (points) -> twisted ply surface
  /** the strand's rings filled a range at a time (`fill`), then joined into its geometry (`finish`) */
  function yarnParts(pts: THREE.Vector3[], R: number, o: { M?: number; closed?: boolean; color: string }) {
    // every ply shown whenever there are three points round the strand for it (Kim: 실의 꼬인 모양 - at the page's
    // detail the plies were cut to two or one, the twist gone and the yarn a smooth tube)
    const n = pts.length, M = o.M || Math.max(14, st.plies * 6), N = o.M ? Math.min(st.plies, Math.max(2, Math.floor(o.M / 3))) : st.plies, tau = st.twist * 0.75 / R, K = 3;
    const pos = new Float32Array(n * (M + 1) * 3), col = new Float32Array(n * (M + 1) * 3), uv = new Float32Array(n * (M + 1) * 2), frames: { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3; s: number }[] = [];
    const T = new THREE.Vector3(), Nv = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3();
    let s = 0; const base = new THREE.Color(o.color), slub0 = Math.random() * 9;
    // 합사 (Kim): the main yarn and a second one held together - the plies take the two colours in turn, twisting
    const base2 = pat.marl && o.color === pat.colors[0] ? new THREE.Color(pat.marl) : null, reps = Math.max(1, Math.floor(Math.max(2, N) / 2)), share = Math.max(.1, Math.min(.9, pat.marlShare ?? .5)); // already linear in r187 (no convertSRGBToLinear)
    const fill = (i0: number, i1: number) => { for (let i = i0; i < i1; i++) {
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
        const sh = 1 - st.ao + st.ao * f, fr = (((ph - tau * s) / (Math.PI * 2) * reps) % 1 + 1) % 1, cc = base2 && fr < share ? base2 : base; // the held yarn's share of the twist, as thick as it is
        col[k * 3] = cc.r * sh; col[k * 3 + 1] = cc.g * sh; col[k * 3 + 2] = cc.b * sh;
        uv[k * 2] = s / (R * 7); uv[k * 2 + 1] = j / M * Math.max(1, N) - tau * s / (Math.PI * 2) * Math.max(1, N) * (st.braid ? 0 : 1);
      }
    } };
    const finish = () => {
    const idx: number[] = []; for (let i = 0; i < n - 1; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    g.userData = { frames, R, perRing: M * 6, color: o.color }; return g;
    };
    return { n, fill, finish };
  }
  function buildYarn(pts: THREE.Vector3[], R: number, o: { M?: number; closed?: boolean; color: string }) { const y = yarnParts(pts, R, o); y.fill(0, y.n); return y.finish(); }
  /** the same, giving way between runs of 48 rings: for a strand thousands of points long (a handle is one yarn) */
  function* buildYarnG(pts: THREE.Vector3[], R: number, o: { M?: number; closed?: boolean; color: string }): Generator<void, THREE.BufferGeometry, void> {
    const y = yarnParts(pts, R, o);
    for (let i = 0; i < y.n; i += 48) { y.fill(i, Math.min(y.n, i + 48)); if (over()) yield; }
    return y.finish();
  }

  /** many small strands (every stitch's head and legs) as one geometry per colour, carrying what the fuzz and
   *  the hairs read (its path frames, the yarn's radius): a material change then shells and hairs a few
   *  geometries, not thousands (Kim: 재질을 바꾸면 너무 오래 걸림 - it froze for 8 to 17 seconds) */
  function mergeYarn(parts: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
    const byColor = new Map<string, THREE.BufferGeometry[]>();
    parts.forEach(p => { const k = String(p.userData.color); const l = byColor.get(k); if (l) l.push(p); else byColor.set(k, [p]); });
    const out: THREE.BufferGeometry[] = [];
    byColor.forEach((list, color) => {
      const g = mergeGeometries(list, false) ?? list[0], frames: { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3; s: number }[] = [];
      // the parts' own frames are taken over as they are (the parts are let go below), not copied one by one
      let off = 0; list.forEach(p => { const fr = p.userData.frames as typeof frames, len = fr.length ? fr[fr.length - 1].s : 0; if (off) for (const f of fr) f.s += off; for (const f of fr) frames.push(f); off += len; });
      g.userData = { frames, R: list[0].userData.R, perRing: list[0].userData.perRing, color };
      if (g !== list[0]) list.forEach(p => p.dispose());
      out.push(g);
    });
    return out;
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
  function* haloShell(geos: THREE.BufferGeometry[]): Generator<void, void, void> {
    const halo = haloOf();
    if (halo <= 0.01) return;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: Math.min(.6, .14 + halo * .4), alphaMap: HTEX, depthWrite: false });
    warmProgram(mat);
    for (const g of geos) {
      if (over()) yield;
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
    }
  }
  function* fuzzLines(geos: THREE.BufferGeometry[]): Generator<void, THREE.LineSegments | null, void> {
    const fuzz = fuzzOf(), fluffy = st.halo >= .4;
    if (fuzz <= 0.01 || !geos.length) return null;
    const cc = new THREE.Color(), WH = lin(0xffffff); const d = new THREE.Vector3(), p = new THREE.Vector3(), jit = new THREE.Vector3();
    const per = (g: THREE.BufferGeometry) => { const fr = g.userData.frames; return fr[fr.length - 1].s / g.userData.R * fuzz * (st.fur ? 46 : fluffy ? 34 : 26); };
    const raw = geos.reduce((a, g) => a + per(g), 0), scale = Math.min(1, fuzzCap() / 2 / Math.max(1, raw)); // each hair is three pieces now
    // written straight into arrays of the right size (two growing lists of millions of numbers, then copied, were pauses of their own)
    const total = geos.reduce((a, g) => a + Math.floor(per(g) * scale), 0), v = new Float32Array(total * 18), col = new Float32Array(total * 18); let vi = 0, ki = 0;
    for (const g of geos) {
      const fr = g.userData.frames, R = g.userData.R, count = Math.floor(per(g) * scale);
      // fur: the proper colour; the light fuzz: the prototype used the sRGB numbers as linear (lighter), so do the same
      // the hairs in the yarn's own colour (Kim), barely lighter; with a held yarn, half of them in its colour
      cc.set(g.userData.color); if (!st.fur) { cc.convertLinearToSRGB(); cc.lerp(WH, .04); }
      const c2 = pat.marl && g.userData.color === pat.colors[0] ? new THREE.Color(pat.marl).convertLinearToSRGB().lerp(WH, .04) : null;
      // soft hairs (Kim: not spikes): each a curl of three short pieces - out from the yarn, then lying back along
      // it, turning a little - shorter than before and fainter at its tip
      const t2 = new THREE.Vector3(), q = new THREE.Vector3();
      for (let k = 0; k < count; k++) {
        if ((k & 511) === 511 && over()) yield;
        const f = fr[Math.random() * fr.length | 0], ph = Math.random() * 6.283, c = Math.cos(ph), s = Math.sin(ph);
        d.set(0, 0, 0).addScaledVector(f.n, c).addScaledVector(f.b, s); p.copy(f.p).addScaledVector(d, R * .8);
        const L = R * (.25 + Math.random() * Math.random() * 2.2) * (.35 + Math.min(6, fuzz)) * st.hair * hk() * .75;
        const along = Math.random() < .5 ? -1 : 1, out = d.clone();
        t2.copy(f.t).multiplyScalar(along);
        const br = st.fur ? .75 + Math.random() * .25 : 1, k0 = st.fur ? .8 : .9, glint = st.glint > 0 && Math.random() < st.glint, h = c2 && Math.random() < .5 ? c2 : cc;
        q.copy(p);
        for (let j = 0; j < 3; j++) {
          // the further out, the more it lies along the yarn and curls
          const lie = .35 + j * .4;
          d.copy(out).multiplyScalar(1 - lie * .6).addScaledVector(t2, lie).add(jit.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(.45)).normalize();
          v[vi++] = q.x; v[vi++] = q.y; v[vi++] = q.z; q.addScaledVector(d, L / 3); v[vi++] = q.x; v[vi++] = q.y; v[vi++] = q.z;
          if (glint) { col[ki++] = .92; col[ki++] = .92; col[ki++] = .9; col[ki++] = 1; col[ki++] = 1; col[ki++] = 1; } // tinsel: a fibre that catches the light
          else { const kA = br * (k0 + (1 - k0) * j / 3), kB = br * (k0 + (1 - k0) * (j + 1) / 3); col[ki++] = h.r * kA; col[ki++] = h.g * kA; col[ki++] = h.b * kA; col[ki++] = h.r * kB; col[ki++] = h.g * kB; col[ki++] = h.b * kB; }
        }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(v, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: st.fur ? .62 : fluffy ? .32 : .18, depthWrite: false }));
  }

  // ---------- pattern -> 3D: stitch = point, joins = springs (the shape comes from the counts alone)
  // a chart's place on the table (set by makeItem for a chart: its x along, its y away, its height up)
  let chartAt: ((x: number, y: number, up?: number) => THREE.Vector3) | null = null;
  function makeItem(): ItemData {
    // round / oval / rect past the stitch budget (sizes have no limit: a 3m rug is 100,000s of stitches): every
    // k-th round is drawn with 1/k of its stitches and the stitch k times as big, so the size and shape stay
    const s0 = pat.shape, sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    const total = s0.kind === "round" ? sum(s0.counts) : s0.kind === "oval" || s0.kind === "rect" ? sum(s0.bottom) + sum(s0.body) : 0;
    const kk = total > LOOP_STITCHES ? Math.ceil(Math.sqrt(total / LOOP_STITCHES)) : 1;
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
        C.push({ idx, closed: true, bot, ci: nextCi(), ...(r >= flatN ? { body: true } : {}) }); prev = idx;
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
    // `soft`: a rect bottom's wall (Kim: 왜 벽만 각져있어) - a crocheted bag's corners are soft, not folded square:
    // each round's outline is drawn in from its square corners to a rounded box (a superellipse), a little at
    // the foot (it meets the bottom's corners) and fully two rounds up
    const wall = (base: number[], counts: number[], soft = false) => {
      let prev = base;
      counts.forEach((c, r) => {
        const pc = prev.length; let cx = 0, cz = 0, mr = 0;
        prev.forEach(n => { cx += P[n].x; cz += P[n].z; }); cx /= pc; cz /= pc; prev.forEach(n => { mr += Math.hypot(P[n].x - cx, P[n].z - cz); }); mr /= pc;
        const k = c / pc, dr = Math.max(-rh * .98, Math.min(rh * .98, mr * (k - 1))), yy = P[prev[0]].y + Math.sqrt(rh * rh - dr * dr), poly = prev.map(n => [cx + (P[n].x - cx) * k, cz + (P[n].z - cz) * k]), idx: number[] = [];
        if (soft) {
          let hx = 1e-6, hz = 1e-6; poly.forEach(([x, z]) => { hx = Math.max(hx, Math.abs(x - cx)); hz = Math.max(hz, Math.abs(z - cz)); });
          const e = r === 0 ? 7 : r === 1 ? 5 : 4; // the superellipse's power: 4 is a soft box, higher is squarer
          poly.forEach(q => { const u = Math.abs(q[0] - cx) / hx, v = Math.abs(q[1] - cz) / hz, ln = Math.pow(u ** e + v ** e, 1 / e); if (ln < 1e-9) return; const f = 1 / ln; /* onto the curve (a round already on it stays) */ q[0] = cx + (q[0] - cx) * f; q[1] = cz + (q[1] - cz) * f; });
        }
        for (let i = 0; i < c; i++) { const f = (i + .5) / c * pc - .5, a = Math.floor(f), t = f - a, A = poly[((a % pc) + pc) % pc], B = poly[(((a + 1) % pc) + pc) % pc]; idx.push(V(A[0] + (B[0] - A[0]) * t, yy, A[1] + (B[1] - A[1]) * t)); }
        ring(idx, true); C.push({ idx, closed: true, bot: linkFrac(idx, prev), ci: nextCi(), body: true }); prev = idx;
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
            const n = g.turn ? V((j - (H - 1) / 2) * ey, i * ex + ex / 2, z0) : V((i - (W - 1) / 2) * ex, j * ey + ey / 2, z0); id[j * W + i] = n; run.push(n);
            if (run.length > 1) E.push([run[run.length - 2], n, ex, 1]);
            const b = j > 0 ? id[(j - 1) * W + i] : -1; if (b >= 0) { E.push([n, b, ey, 1]); below.set(n, b); }
          }
          flush();
        }
      });
      return { ex, ey };
    };
    const below = new Map<number, number>();

    let knit: Knit | null = null, fixed = false, form = false, skip: ItemData["skip"] = null, rhOut = rh, swOut = sw;
    if (kk > 1) skip = { stitch: kk, row: kk };
    if (s.kind === "round") round(s.counts, s.flat);
    else if (s.kind === "oval" || s.kind === "rect") { const b = aroundChain(s.chain, s.bottom, s.kind === "oval" ? stad : rectPath); if (s.body.length) wall(b, s.body, s.kind === "rect"); }
    else if (s.kind === "rows") {
      const k = skipOf(s.W, s.H), W = Math.max(2, Math.round(s.W / k)), H = Math.max(2, Math.round(s.H / k));
      const ex = s.wCm * 10 / MM / W, ey = s.hCm * 10 / MM / H, swap = s.hCm > s.wCm;
      fixed = true; skip = k > 1 ? { stitch: k, row: k } : null; rhOut = ey; swOut = ex;
      rows(W, H, ex, ey, swap, midCi(k, s.H));
      if (s.knit) knit = { type: "flat", W, H, swap, wk: ex, rk: ey, rho: 0, R: 0 };
    } else if (s.kind === "chart") {
      // the chart lies flat, its rows going away from the viewer; its points only give the piece its size
      const ex = s.wCm * 10 / MM / Math.max(1, s.chart.W), ey = s.hCm * 10 / MM / Math.max(1, s.chart.H);
      const ca = (x: number, y: number, up = 0) => new THREE.Vector3((x - (s.chart.W - 1) / 2) * ex, up, -(y - s.chart.H / 2) * ey); chartAt = ca;
      s.chart.st.forEach(c => { P.push(ca(c.b[0], c.b[1]), ca(c.t[0], c.t[1])); }); s.chart.ch.forEach(c => P.push(ca(c[0], c[1])));
      fixed = true; rhOut = ey; swOut = ex; flat.push(...P.map((_, i) => i));
    } else if (s.kind === "grid") {
      const k = skipOf(s.W, s.H * (s.pieces ?? 1)), { ex, ey } = grid(s, k);
      fixed = true; skip = k > 1 ? { stitch: k, row: k } : null; rhOut = ey; swOut = ex;
    } else if (s.kind === "form") {
      // a piece set where it lies: its stitches as given; each stands on the nearest stitch of the course it is worked into
      const U = 10 / MM, at: number[][] = s.courses.map(c => { const idx: number[] = []; for (let i = 0; i + 2 < c.p.length; i += 3) { P.push(new THREE.Vector3(c.p[i] * U, c.p[i + 1] * U, c.p[i + 2] * U)); idx.push(P.length - 1); } return idx; });
      s.courses.forEach((c, k) => {
        if (c.ghost) return;
        const idx = at[k], below = c.on >= 0 ? at[c.on] : null; let bot: Bot[] | null = null;
        if (below && below.length) bot = idx.map(n => { let b = below[0], bd = 1e9; for (const m of below) { const d = P[n].distanceToSquared(P[m]); if (d < bd) { bd = d; b = m; } } E.push([n, b, Math.sqrt(bd), 1]); return [b, b, 0] as Bot; });
        for (let i = 0; i + (c.closed ? 0 : 1) < idx.length; i++) E.push([idx[i], idx[(i + 1) % idx.length], sw, 1]);
        C.push({ idx, closed: !!c.closed, bot, ci: c.ci ?? 0, cen: new THREE.Vector3(c.cen[0] * U, c.cen[1] * U, c.cen[2] * U), ...(c.cols ? { cols: c.cols } : {}), ...(c.ty ? { ty: c.ty } : {}) });
      });
      fixed = true; form = true;
    } else {
      const k = skipOf(s.W, s.H), W = Math.max(6, Math.round(s.W / k)), H = Math.max(2, Math.round(s.H / k));
      const rho = s.circCm * 10 / MM / (2 * Math.PI), ey = s.hCm * 10 / MM / H;
      fixed = true; skip = k > 1 ? { stitch: k, row: k } : null; rhOut = ey; swOut = 2 * Math.PI * rho / W;
      tube(W, H, rho, ey, midCi(k, s.H));
    }
    return { P, E, C, rh: rhOut, sw: swOut, knit, flat, fixed, skip, iter: 0, done: false, ...(form ? { form } : {}) };
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
  // the structure view's four materials are made once and kept: made new for every shape (and the old let go
  // first), their shaders were put together again at every change of size
  const holoMats = new Map<string, THREE.Material>();
  const kept = <T extends THREE.Material>(k: string, make: () => T): T => { let m = holoMats.get(k) as T | undefined; if (!m) { m = make(); m.userData.keep = true; holoMats.set(k, m); } return m; };
  function buildHolo(D: ItemData) {
    const n = D.P.length, pos = new Float32Array(n * 3); const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const ring: number[] = [], vert: number[] = []; D.E.forEach(e => { if (e[3] === 1) (Math.abs(e[2] - D.sw) < 1e-9 ? ring : vert).push(e[0], e[1]); });
    const mk = (idx: number[], color: number, op: number) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", pg.getAttribute("position")); g.setIndex(idx); return new THREE.LineSegments(g, kept("l" + color + "/" + op, () => new THREE.LineBasicMaterial({ color: lin(color), transparent: true, opacity: op }))); };
    const LC = D.C[D.C.length - 1] ?? { idx: [], closed: false }, hi: number[] = []; for (let i = 0; i < LC.idx.length - (LC.closed ? 0 : 1); i++) hi.push(LC.idx[i], LC.idx[(i + 1) % LC.idx.length]);
    const g = new THREE.Group(); g.add(mk(vert, 0xb99447, .28), mk(ring, 0xb08a3e, .9), mk(hi, 0xc0787e, 1), new THREE.Points(pg, kept("p", () => new THREE.PointsMaterial({ color: lin(0xa8823a), size: .11, sizeAttenuation: true }))));
    g.userData.pos = pg.getAttribute("position"); return g;
  }
  function updateHolo(D: ItemData) { const a = holo!.userData.pos as THREE.BufferAttribute; for (let i = 0; i < D.P.length; i++) a.setXYZ(i, D.P[i].x, D.P[i].y, D.P[i].z); a.needsUpdate = true; }

  let halos: THREE.Mesh[] = [], meshes: THREE.Mesh[] = [], fz: THREE.LineSegments | null = null, anim = 0, strapH = 0, strapEnds: THREE.Vector3[] = [];
  const yarnR = (D: ItemData) => {
    const R = pat.yarnMm / 2 / MM * st.thick * st.fill;
    // a big flat piece drawn every k-th stitch: its yarn stands for k strands
    return D.skip ? Math.min(R * D.skip.stitch, Math.min(D.rh, D.sw) * .42) : R;
  };
  // a stitch's own strand (a head's ring, a leg) is a curve through 3 to 12 points: its length is measured in six
  // steps a point, not the 200 a curve is given by default - that measuring was half the time a big piece took
  const shortDiv = (n: number) => Math.max(24, n * 6);
  // The yarn is made a little at a time (Kim 11/25: 시간이 걸리는 것은 괜찮지만 렉은 안 된다): this is a generator,
  // run for ~10ms a frame (stepJob), so the page keeps answering and 생성 중 keeps turning while a big piece is
  // made. It gives way (yield) wherever `over()` says the frame's share is used up.
  function* buildItemYarn(D: ItemData): Generator<void, void, void> {
    const R = yarnR(D), geos: THREE.BufferGeometry[] = [];
    const mat = yarnMat(R), M = LOD.M, step = LOD.step, lp = (b: Bot) => D.P[b[0]].clone().lerp(D.P[b[1]], b[2]);
    warmProgram(mat); yield; // handing the shader over is a frame's share by itself
    if (pat.shape.kind === "chart" && chartAt) {
      // a stitch chart (lib/crochetChart, lib/stitchCharts), stitch by stitch, lying in the fabric: a crochet
      // stitch's head a loop across its top, its post two strands from the base up, a long stitch's wraps round
      // the middle; a knit stitch a V, a purl a bump, a yarn over a small ring, a bobble its strands bulging out,
      // a loop stitch a loop standing up; each chain its own loop. A stitch standing out (a front post, the
      // crossing of a cable) is lifted, one sunk lowered; each in its own colour. All of it is one mesh.
      const s = pat.shape, at = chartAt, parts: THREE.BufferGeometry[] = [], add = (pts: THREE.Vector3[], closed: boolean, rad: number, color: string) => {
        const cv = new THREE.CatmullRomCurve3(pts, closed, "catmullrom", .5); cv.arcLengthDivisions = shortDiv(pts.length);
        parts.push(buildYarn(cv.getSpacedPoints(Math.max(12, Math.ceil(cv.getLength() / (rad * .75 * step)))), rad, { M, closed, color }));
      };
      const loop = (c: THREE.Vector3, ax: THREE.Vector3, al: THREE.Vector3, w: number, d: number, h: number) => { const pts: THREE.Vector3[] = []; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; pts.push(c.clone().addScaledVector(ax, Math.cos(a) * w).addScaledVector(al, Math.sin(a) * d).setY(h * (1 + .35 * Math.sin(a)))); } return pts; };
      const X1 = new THREE.Vector3(1, 0, 0), Z1 = new THREE.Vector3(0, 0, 1), r = R * .82, WRAPS: Partial<Record<string, number>> = { hdc: 1, dc: 1, cl: 1, bob: 1, pop: 1, tr: 2, dtr: 3, bull: 5 };
      // 3D 정밀 (Kim: 무늬가 실제와 다르다): a chain is a run of linked ovals lying along its own path (they all
      // pointed one way, like beads, even up an arch), each a little longer than the step to the next so they link
      const chs = s.chart.ch;
      chs.forEach((q, i) => {
        const near = (j: number) => { const o = chs[j]; return o && Math.hypot(o[0] - q[0], o[1] - q[1]) < 1.8 ? o : null; };
        const a = near(i - 1), z = near(i + 1), p0 = at(q[0], q[1]);
        let ax = X1.clone(), step = D.sw * .8;
        if (a || z) { const from = a ? at(a[0], a[1]) : p0.clone(), to = z ? at(z[0], z[1]) : p0.clone(), d = to.clone().sub(from).setY(0); if (d.length() > 1e-9) { step = d.length() / (a && z ? 2 : 1); ax = d.normalize(); } }
        const side = new THREE.Vector3(-ax.z, 0, ax.x);
        add(loop(p0, ax, side, Math.max(D.sw * .3, step * .62), D.rh * .17, r), true, r * .9, colorOf(q[2] ?? 0));
      });
      // a hand-made look: every stitch a touch off the grid, the same each time (from where it sits)
      const jit = (x: number, y: number, k: number) => { const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
      s.chart.st.forEach(c => {
        const b = at(c.b[0], c.b[1]), t = at(c.t[0], c.t[1]).add(new THREE.Vector3(jit(c.t[0], c.t[1], 1) * D.sw * .07, 0, jit(c.t[0], c.t[1], 2) * D.rh * .05)), dir = t.clone().sub(b), len = dir.length() || D.rh, dn = len > 1e-9 ? dir.clone().divideScalar(len) : Z1.clone().negate();
        const across = new THREE.Vector3(-dn.z, 0, dn.x), w = D.sw * .15, color = colorOf(c.c ?? 0), up = Math.max(r * .6, r + (c.z ?? 0) * D.rh * .9);
        const P = (p: THREE.Vector3, y: number) => p.clone().setY(y);
        switch (c.type) {
          case "k": { // a V: from the middle of its foot out to the two sides of its top
            for (const k of [-1, 1]) add([P(b.clone().addScaledVector(dn, D.rh * .05), up), P(b.clone().lerp(t, .55).addScaledVector(across, D.sw * .26 * k), up + r * .9), P(t.clone().addScaledVector(across, D.sw * .4 * k), up * 1.1)], false, r * 1.05, color);
            return;
          }
          case "p": { // a bump across, standing up
            add([P(b.clone().addScaledVector(across, -D.sw * .48).addScaledVector(dn, len * .3), up), P(b.clone().addScaledVector(dn, len * .42), up + r * 2.2), P(b.clone().addScaledVector(across, D.sw * .48).addScaledVector(dn, len * .3), up)], false, r * 1.1, color);
            return;
          }
          case "yo": add(loop(b.clone().lerp(t, .5), across, dn, D.sw * .22, D.rh * .22, up), true, r * .85, color); return;
          case "picot": { const pts: THREE.Vector3[] = []; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; pts.push(t.clone().addScaledVector(across, Math.cos(a) * D.sw * .28).setY(up + D.rh * .3 + Math.sin(a) * D.rh * .3)); } add(pts, true, r, color); return; }
          case "sl": add(loop(t, across, dn, D.sw * .36, D.rh * .16, up), true, r, color); return;
          case "bar": { // tunisian: a straight bar up, the return pass across its top
            add([P(b, up), P(b.clone().lerp(t, .5), up + r * .8), P(t, up)], false, r, color);
            add([P(t.clone().addScaledVector(across, -D.sw * .5), up * 1.1), P(t, up + r * .9), P(t.clone().addScaledVector(across, D.sw * .5), up * 1.1)], false, r * .95, color);
            return;
          }
        }
        // crochet stitches: the head, then the post. A head is wide enough to overlap its neighbours' (Kim: the
        // tops were separate rings, like beads) - side by side they read as the braid of V's a real row's top is
        add(loop(t, across, dn, D.sw * .6, D.rh * .24, up * 1.3), true, r, color);
        const bulge = c.type === "bob" || c.type === "pop" ? D.rh * .9 : c.type === "puff" ? D.rh * .6 : 0;
        if (bulge) {
          // a bobble: its strands from the base, out and up over a dome, to the top
          for (let k = -2; k <= 2; k++) add([P(b.clone().addScaledVector(across, w * k * .3), up), P(b.clone().lerp(t, .5).addScaledVector(across, D.sw * .16 * k), up + bulge * (1 - Math.abs(k) * .18)), P(t.clone().addScaledVector(across, w * k * .3).addScaledVector(dn, -D.rh * .15), up * 1.3)], false, r, color);
        } else for (const k of [-1, 1]) add([P(b.clone().addScaledVector(across, w * k), up), P(b.clone().lerp(t, .5).addScaledVector(across, w * k * 1.35), up + r), P(t.clone().addScaledVector(across, w * k * .6).addScaledVector(dn, -D.rh * .2), up * 1.3)], false, r, color);
        const n = WRAPS[c.type] ?? 0;
        for (let q = 0; q < n; q++) { const f = n === 1 ? .45 : .25 + q * .5 / (n - 1), m1 = b.clone().lerp(t, f - .08), m2 = b.clone().lerp(t, f + .08); add([P(m1.clone().addScaledVector(across, -D.sw * .22), up * 1.4), P(m1.clone().lerp(m2, .5), up + r * 2.2), P(m2.clone().addScaledVector(across, D.sw * .22), up * 1.4)], false, r * .95, color); }
        if (c.type === "loop") { const pts: THREE.Vector3[] = []; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI; pts.push(t.clone().addScaledVector(across, Math.cos(a) * D.sw * .3).addScaledVector(dn, -D.rh * .3).setY(up + Math.sin(a) * D.rh * 1.6)); } add(pts, false, r, color); }
      });
      if (parts.length) mergeYarn(parts).forEach(g => { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = false; group.add(m); meshes.push(m); geos.push(g); });
      if (over()) yield; yield* haloShell(geos); fz = yield* fuzzLines(geos); if (fz) group.add(fz); strapH = 0; flapTip = null; return;
    }
    // 3D 정밀 (Kim): a tall stitch (긴뜨기, 한길긴뜨기) is an upright post of two strands, 한길긴뜨기 with its wrap across
    // the middle - not a taller zigzag; drawn as one mesh, and only while the piece is small enough to stay quick
    // 3D 정밀 (Kim: 실제 실의 꼬인 모양 - the stitches were smooth tubes and sausages): every crochet stitch as the
    // how-to drawings show it, while the piece is small enough to stay quick -
    //   head   a chain loop lying across the top, a little wider than the stitch so it hooks into its neighbours,
    //          its front half over the fabric and its back half under it: side by side, the braid of a row's top
    //   legs   짧은뜨기 two strands from the head's ends down to one point on the row below - a V
    //          긴뜨기 two strands down side by side, the yarn-over lying as a bar just under the head
    //          한길긴뜨기 two strands down side by side, the yarn-over wound across the middle
    // every piece, however big (Kim: 느려지면 생성 중을 띄우고 그냥 만들어) - the screen says 생성 중 while it is made
    const sH = pat.stitchH ?? 1, loops = !D.knit, postParts: THREE.BufferGeometry[] = [];
    // a piece worked sideways (a ribbed panel): its rows stand upright, its fabric faces the front
    const turned = pat.shape.kind === "grid" && !!pat.shape.turn, flatY = (v: THREE.Vector3) => (turned ? v : v.setY(0));
    const strand = (pts: THREE.Vector3[], rad: number, color: string, closed = false) => { const cv = new THREE.CatmullRomCurve3(pts, closed, "catmullrom", .5); cv.arcLengthDivisions = shortDiv(pts.length); const g = buildYarn(cv.getSpacedPoints(Math.max(loPts(closed), Math.ceil(cv.getLength() / (rad * .75 * step)))), rad, { M, closed, color }); postV += g.getAttribute("position").count; postParts.push(g); };
    // the stitches' strands are joined into meshes of ~30,000 vertices as they are made (in the order made), not
    // all at the end in one: joining a whole bag at once was a pause of its own
    let postV = 0;
    const flushPosts = () => { if (!postParts.length) return; mergeYarn(postParts).forEach(g => { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = false; group.add(m); meshes.push(m); geos.push(g); }); postParts.length = 0; postV = 0; };
    // the fewest points along a strand: 10 at full detail; a big piece's thinned strands go down to 6 round a head
    // and 4 along a leg (the floor of 10 held every stitch at 231 vertices however far the detail was turned down)
    function loPts(closed: boolean) { return step <= 1 ? 10 : Math.max(closed ? 6 : 4, Math.round(10 / step)); }
    // one crochet stitch, drawn where `P` puts it (along its row in stitch widths, up in its height, out of the
    // fabric in yarn radii, from its head) - the rounds below and a handle grown out of them draw the same stitch
    const drawSt = (ty: WallStitch, col: string, P: (u: number, v: number, w: number) => THREE.Vector3) => {
          if (ty === "ch") { const cr: THREE.Vector3[] = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; cr.push(P(Math.cos(a) * .55, Math.sin(a) * .16 - .04, Math.sin(a) * .5 + .3)); } strand(cr, R * .82, col, true); return; }
          const ring: THREE.Vector3[] = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; ring.push(P(Math.cos(a) * .62, Math.sin(a) * .07 - .02, Math.sin(a) * 1.05 + .25)); }
          strand(ring, R * .92, col, true);
          if (ty === "sc") { // 짧은뜨기: a V from the head's ends to one point below
            for (const k of [-1, 1]) strand([P(k * .36, -.08, .9), P(k * .2, -.5, .75), P(0, -.98, .35)], R * .88, col);
          } else if (ty === "pop") { // 구슬뜨기 / 팝콘: posts bulging out of the fabric, gathered at the head
            for (const k of [-1, 0, 1]) strand([P(k * .3, -.08, .9), P(k * .55, -.5, 2.3), P(k * .2, -.97, .45)], R * .9, col);
          } else { // the post: two strands down side by side
            for (const k of [-1, 1]) strand([P(k * .3, -.08, .85), P(k * .2, -.5, .8), P(k * .16, -.97, .4)], R * .86, col);
            if (ty === "hdc") strand([P(-.38, -.24, 1.25), P(0, -.27, 1.55), P(.38, -.24, 1.25)], R * .84, col); // 긴뜨기: the yarn-over, a bar under the head
            else { // 한길긴뜨기 wound across the middle once; 두길긴뜨기 twice
              strand([P(-.34, -.62, 1.1), P(0, -.5, 1.55), P(.34, -.36, 1.1)], R * .84, col);
              if (ty === "tr") strand([P(-.34, -.86, 1.05), P(0, -.76, 1.5), P(.34, -.62, 1.05)], R * .84, col);
            }
          }
    };
    // the body's rounds counted from the bottom's edge, for a stitch pattern laid on them (pat.wall)
    let bodyN = 0;
    const wl = pat.wall && pat.wall.W > 0 && pat.wall.H > 0 ? pat.wall : null;
    if (D.knit) yield* buildKnit(D, R, mat, geos);
    else for (let ci = 0; ci < D.C.length; ci++) {
      if (over()) yield;
      const c = D.C[ci];
      const tops = c.idx.map(n => D.P[n].clone()), saw: THREE.Vector3[] = [];
      let cx0 = 0, cz0 = 0; tops.forEach(q => { cx0 += q.x; cz0 += q.z; }); cx0 /= tops.length || 1; cz0 /= tops.length || 1;
      const ridgeRow = !!pat.ridge && (c.closed || ci % 2 === 0);
      if (c.bot && loops) {
        const color = colorOf(c.ci), wr = wl && c.body ? (bodyN++ * (D.skip?.row ?? 1)) % wl.H : -1;
        for (let i = 0; i < c.idx.length; i++) {
          if ((i & 7) === 7) { if (postV > 30_000) flushPosts(); if (over()) yield; }
          const n = c.idx[i];
          // the stitch worked here: the pattern's on the body (a drawn round standing for k of the pattern's takes
          // the repeat's row it starts on), else the piece's own stitch
          const ty: WallStitch = c.ty ? (typeof c.ty === "string" ? c.ty : c.ty[i] ?? "sc") : wr >= 0 ? (wl!.t[wr]?.[(i * (D.skip?.stitch ?? 1)) % wl!.W] ?? "sc") : sH < 1.4 ? "sc" : sH < 2 ? "hdc" : "dc";
          const col = c.cols ? colorOf(c.cols[i] ?? c.ci) : wr >= 0 && wl!.c && wl!.colors ? (wl!.colors[wl!.c[wr]?.[(i * (D.skip?.stitch ?? 1)) % wl!.W] ?? 0] ?? color) : color;
          const t = D.P[n].clone(), b0 = lp(c.bot![i]), nx = D.P[c.idx[(i + 1) % c.idx.length]], pv = D.P[c.idx[(i - 1 + c.idx.length) % c.idx.length]];
          const along0 = c.closed || i < c.idx.length - 1 ? nx.clone().sub(t) : t.clone().sub(pv), alongV = c.cen ? along0 : flatY(along0), sw = c.cen ? Math.min(D.sw * 1.6, Math.max(D.sw * .45, alongV.length())) : Math.max(D.sw * .6, alongV.length());
          const al = alongV.lengthSq() < 1e-12 ? new THREE.Vector3(1, 0, 0) : alongV.normalize();
          // straight under its own head (its base on the row below was half a stitch over)
          const dv = b0.clone().sub(t); dv.addScaledVector(al, -dv.dot(al)); const b = t.clone().add(dv), upV = t.clone().sub(b), h = upV.length() || D.rh, up = upV.clone().divideScalar(h);
          // out of the fabric: up for a flat piece, outward for a wall
          const out = c.cen ? new THREE.Vector3().crossVectors(al, up) : c.closed ? new THREE.Vector3(t.x - cx0, 0, t.z - cz0) : turned ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0); if (out.lengthSq() < 1e-12) out.set(0, 1, 0); out.normalize();
          if (c.cen && out.dot(t.clone().sub(c.cen)) < 0) out.negate(); // a form's fabric faces away from its own middle
          if (ridgeRow) t.addScaledVector(out, R * 1.1);
          const P = (u: number, v: number, w: number) => t.clone().addScaledVector(al, u * sw).addScaledVector(up, v * h).addScaledVector(out, w * R);
          // the head: front half up over the fabric, back half under, wider than the stitch so the next one's hooks into it
          // 사슬 over a gap (mesh, net, moss): a chain lying along the row at the head's height, nothing below - a hole
          drawSt(ty, col, P);
        }
      } else if (c.bot) c.idx.forEach((n, i) => saw.push(D.P[n].clone(), lp(c.bot![i])));
      // drawn as loops: no long tube along the row's top (the heads are its top)
      if (c.bot && loops) continue;
      // 이랑뜨기: the unworked front loop raised along the row (every row worked in rounds, every other in rows)
      if (ridgeRow) tops.forEach(q => { if (c.closed) { const o = new THREE.Vector3(q.x - cx0, 0, q.z - cz0); if (o.lengthSq() > 1e-12) q.addScaledVector(o.normalize(), R * 1.05); } else q.y += R * 1.15; });
      [saw, tops].forEach((arr0, ix) => {
        // points on the very same spot (a painted stitch with nothing painted under it: its "saw" goes down to
        // itself) are left out; a line of zero length made degenerate geometry that reset the graphics driver
        let arr = arr0.filter((q, i) => i === 0 || q.distanceToSquared(arr0[i - 1]) > 1e-10);
        if (arr.length === 1 && arr0.length > 1 && ix === 0) return; // a saw with nothing below: no saw
        if (!c.closed && arr.length && arr.length < 3) { const a0 = arr[0], a1 = arr[arr.length - 1], d = new THREE.Vector3(D.sw * .35, 0, 0); arr = arr.length === 1 ? [a0.clone().sub(d), a0, a0.clone().add(d)] : [a0, a0.clone().lerp(a1, .5), a1]; }
        if (arr.length < 3) return; const cv = new THREE.CatmullRomCurve3(arr, c.closed, "catmullrom", .5), Rr = ix ? R * (pat.ridge ? 1.12 : .9) : R;
        const pts = cv.getSpacedPoints(Math.max(24, Math.ceil(cv.getLength() / (Rr * .75 * step))));
        const g = buildYarn(pts, Rr, { M, closed: c.closed, color: colorOf(c.ci) }), m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = false; group.add(m); meshes.push(m); geos.push(g);
      });
    }
    flushPosts();
    // the edging round the opening: the last round again, a little up and out, thicker
    const lastC = D.C[D.C.length - 1];
    if (pat.rim && !D.knit && lastC && lastC.closed && lastC.idx.length > 6 && (pat.shape.kind === "round" || pat.shape.kind === "oval" || pat.shape.kind === "rect")) {
      let rx = 0, rz = 0; lastC.idx.forEach(n => { rx += D.P[n].x; rz += D.P[n].z; }); rx /= lastC.idx.length; rz /= lastC.idx.length;
      const pts = lastC.idx.map(n => { const q = D.P[n].clone(), o = new THREE.Vector3(q.x - rx, 0, q.z - rz).normalize(); return q.addScaledVector(o, R * .45).setY(q.y + R * .9); });
      const cv = new THREE.CatmullRomCurve3(pts, true, "catmullrom", .5), g = buildYarn(cv.getSpacedPoints(Math.max(48, Math.ceil(cv.getLength() / (R * .7 * step)))), R * 1.4, { M, closed: true, color: colorOf(lastC.ci) });
      const m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
    }
    if (over()) yield;
    strapH = 0; strapEnds = [];
    addStand(D, R);
    { // the inside's shade (yarnMat): where the piece's middle, rim and bottom are
      const U = (mat.userData.inU ?? null) as { uIn: { value: THREE.Vector4 }; uInR: { value: THREE.Vector2 }; uInK: { value: THREE.Vector3 } } | null, top = D.C[D.C.length - 1];
      if (U) {
        U.uInK.value.set(0, 0, 0);
        if (top && top.closed && top.idx.length >= 6 && (pat.shape.kind === "round" || pat.shape.kind === "oval" || pat.shape.kind === "rect")) {
          let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, ry = 0, y0 = 1e9;
          for (const n of top.idx) { const q = D.P[n]; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); ry += q.y / top.idx.length; }
          for (const q of D.P) y0 = Math.min(y0, q.y);
          const K = [.4, 0]; // Kim: A, 한 톤 어둡게 (not deeper with depth, not strong: 진하게 하지 마)
          if (ry - y0 > D.rh * 3) { U.uIn.value.set((x0 + x1) / 2, (z0 + z1) / 2, ry + D.rh * .5, y0); U.uInR.value.set(Math.max(1e-3, (x1 - x0) / 2), Math.max(1e-3, (z1 - z0) / 2)); U.uInK.value.set(K[0], K[1], ry + D.rh * .5 + (pat.strapGrown ? pat.strapCm * 10 / MM : 0)); }
        }
      }
    }
    const strapFrom = meshes.length; // the handle's meshes, tagged below for 제작 시뮬레이션's order
    if (pat.strap !== "none" && (pat.shape.kind === "round" || pat.shape.kind === "oval" || pat.shape.kind === "rect")) {
      const L = D.C[D.C.length - 1].idx, c = L.length, color = pat.strapColor ?? colorOf(D.C[D.C.length - 1].ci); let ry = 0, cx = 0, cz = 0, rr = 0;
      L.forEach(n => { const q = D.P[n]; ry += q.y; cx += q.x; cz += q.z; }); ry /= c; cx /= c; cz /= c; L.forEach(n => { rr += Math.hypot(D.P[n].x - cx, D.P[n].z - cz); }); rr /= c;
      const at = (f: number) => { const q = D.P[L[((Math.round(f * c - .5) % c) + c) % c]].clone(); q.y = ry; return q; };
      // the strap's height from its length (cm): an arc of that length over the gap between its ends
      const len = pat.strapCm * 10 / MM;
      if (pat.strap === "pack") {
        // 드로스트링 백팩 (Kim: 끈 하나가 입구를 조이고 어깨끈이 되는 구조): one cord - round the opening through its
        // eyelets, out at the back, and down each side to a small loop at the bottom's edge. Two strands twisted.
        let y0 = 1e9; for (const q of D.P) y0 = Math.min(y0, q.y);
        // how far out the wall stands at each height: the straps and their loops lie on it, never in it
        const NB = 20, wallR = new Array<number>(NB + 1).fill(0); for (const q of D.P) { const k = Math.max(0, Math.min(NB, Math.round((q.y - y0) / Math.max(1e-6, ry - y0) * NB))); wallR[k] = Math.max(wallR[k], Math.hypot(q.x - cx, q.z - cz)); }
        const outAt = (y: number) => { const f = Math.max(0, Math.min(NB, (y - y0) / Math.max(1e-6, ry - y0) * NB)), k = Math.floor(f); return Math.max(wallR[k], wallR[Math.min(NB, k + 1)]) + R * 2.4; };
        const rb = outAt(y0 + D.rh * 2);
        const yE = ry - D.rh * 1.6, re = rr + R * 1.6, back = new THREE.Vector3(cx, yE, cz + re);
        const ringPts = Array.from({ length: 48 }, (_, i) => { const a = i / 48 * Math.PI * 2; return new THREE.Vector3(cx + Math.sin(a) * re, yE + Math.sin(a * 6) * R * .5, cz - Math.cos(a) * re); });
        const cord = (pts: THREE.Vector3[], closed: boolean) => {
          const cv = new THREE.CatmullRomCurve3(pts, closed, "catmullrom", .5), sp = cv.getSpacedPoints(Math.max(48, Math.ceil(cv.getLength() / (R * .6)))), turns = Math.max(6, Math.round(cv.getLength() / (R * 7)));
          for (const ph of [0, Math.PI]) {
            const tw = sp.map((q, i) => { const T = sp[Math.min(sp.length - 1, i + 1)].clone().sub(sp[Math.max(0, i - 1)]).normalize(), B = Math.abs(T.y) > .9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), Nn = new THREE.Vector3().crossVectors(B, T).normalize(), B2 = new THREE.Vector3().crossVectors(T, Nn), a = i / sp.length * Math.PI * 2 * turns + ph; return q.clone().addScaledVector(Nn, Math.cos(a) * R * .75).addScaledVector(B2, Math.sin(a) * R * .75); });
            const g = buildYarn(tw, R * .95, { M, closed, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
          }
        };
        cord(ringPts, true);
        for (const sx of [-1, 1]) {
          if (over()) yield;
          // (the loops sit on the bottom's edge, a little to the front; the straps stand off the bag no further than a shoulder needs)
          const foot = new THREE.Vector3(cx + sx * rb * .9, y0 + D.rh * 2, cz + rb * .44), span = back.distanceTo(foot), slack = Math.max(0, len - span);
          const bow = Math.min(rr * .75, Math.sqrt(Math.max(0, (span + slack) ** 2 - span ** 2)) * .32);
          const pts = Array.from({ length: 25 }, (_, i) => { const t = i / 24, s = Math.sin(Math.PI * t); const q = back.clone().lerp(foot, t).add(new THREE.Vector3(sx * bow * .45 * s, -bow * .12 * s, bow * s)), d = Math.hypot(q.x - cx, q.z - cz), need = outAt(q.y); if (d < need && d > 1e-6) { q.x = cx + (q.x - cx) * need / d; q.z = cz + (q.z - cz) * need / d; } return q; });
          cord(pts, false);
          // the loop the cord's end is tied to
          cord(Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return foot.clone().add(new THREE.Vector3(sx * (Math.cos(a) - 1) * D.rh * .9, Math.sin(a) * D.rh * .9, 0)); }), true);
          strapEnds.push(foot.clone());
        }
        strapEnds.push(back.clone());
      } else if (pat.strap === "wrist") {
        // 손목 고리 (Kim): from the rim's right end, a loop of the strap's length hanging down beside the piece, flat
        // to the front, as a wristlet's strap hangs
        let P = D.P[L[0]].clone(); L.forEach(n => { if (D.P[n].x > P.x) P = D.P[n].clone(); }); P.y = ry;
        const r0 = len / (2 * Math.PI), N = 72;
        // Kim's drawing: a thin cord rising from the top corner in a loop above it, leaning out a little - a teardrop,
        // its point at the corner (it was a wide band hanging down the side). Two strands twisted, as a cord is made.
        const A0 = P.clone().add(new THREE.Vector3(-R * 1.5, R * .5, 0));
        const lean = new THREE.Vector3(.42, 1, 0).normalize(), side = new THREE.Vector3(lean.y, -lean.x, 0), H = r0 * 2.3, Wl = r0 * 1.15;
        const all = Array.from({ length: N + 1 }, (_, i) => {
          const t = i / N, a = t * Math.PI * 2, up = (1 - Math.cos(a)) / 2, across = Math.sin(a) * Math.pow(up, .6);
          return A0.clone().addScaledVector(lean, H * up).addScaledVector(side, Wl * across * .5);
        });
        strapEnds.push(A0.clone());
        const cr = R * .8 /* thin from the start (Kim: 처음부터 얇게) */, cv = new THREE.CatmullRomCurve3(all, true, "catmullrom", .5), sp = cv.getSpacedPoints(Math.max(96, Math.ceil(cv.getLength() / (R * .5))));
        for (const ph of [0, Math.PI]) {
          const pts = sp.map((q, i) => { const tw = i / sp.length * Math.PI * 2 * Math.max(8, Math.round(cv.getLength() / (R * 6))) + ph, T = sp[(i + 1) % sp.length].clone().sub(sp[(i - 1 + sp.length) % sp.length]).normalize(), B = new THREE.Vector3(0, 0, 1), Nn = new THREE.Vector3().crossVectors(B, T).normalize();
            return q.clone().addScaledVector(Nn, Math.cos(tw) * cr).addScaledVector(B, Math.sin(tw) * cr); });
          const g = buildYarn(pts, R * .95, { M, closed: true, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
        }
      } else {
      const arcs: [number, number, number][] = pat.strap === "long" ? [[0, .5, 0]] : [[.15, .35, 1], [.65, .85, 1]];
      for (const [a, b, lean] of arcs) {
        if (over()) yield;
        const A = at(a), B = at(b), w = new THREE.Vector3().subVectors(B, A).normalize(), nrm = new THREE.Vector3(-w.z, 0, w.x), mid = A.clone().add(B).multiplyScalar(.5);
        const H = Math.max(rr * .5, Math.sqrt(Math.max(0, (len / 2) ** 2 - (A.distanceTo(B) / 2) ** 2)) * .92); strapH = Math.max(strapH, H);
        if (nrm.x * (mid.x - cx) + nrm.z * (mid.z - cz) > 0) nrm.negate();
        const sw = Math.max(1, Math.min(5, Math.round(pat.strapW ?? 3)));
        if (pat.strapGrown && loops) {
          // 몸통에서 이어 뜨는 손잡이 (Kim): no band set on the rim - the body's own rounds go on up (Kim: 손잡이는
          // 몸통과 같은 무늬, 무슨 무늬든). At each end of the bag a foot as wide as its share of the round, worked
          // on in rows of the body's height, a stitch fewer at each edge row by row to the strap's width, the two
          // halves meeting over the middle. Every stitch stands on the one under it (its column is its place on
          // the rim), drawn by the body's own stitch (drawSt) and taking the body's stitch pattern where it left
          // off. A row at the foot lies along the rim's curve; as the piece narrows it straightens into the strap.
          const G = pat.strapGrown, Wd = Math.max(.8, pat.strapWcm ?? 2.5) * 10 / MM, up0 = new THREE.Vector3(0, 1, 0), half = A.distanceTo(B) / 2, N = 64;
          const cl = Array.from({ length: N + 1 }, (_, i) => { const th = Math.PI * i / N; return mid.clone().addScaledVector(w, -half * Math.cos(th)).addScaledVector(up0, H * Math.sin(th)); });
          const cum = [0]; for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + cl[i].distanceTo(cl[i - 1]));
          const Lc = cum[N], ctr = (s: number) => { let i = 1; while (i < N && cum[i] < s) i++; return cl[i - 1].clone().lerp(cl[i], Math.max(0, Math.min(1, (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])))); };
          const rim = (x: number) => { const f = Math.floor(x), q = D.P[L[((f % c) + c) % c]].clone().lerp(D.P[L[(((f + 1) % c) + c) % c]], x - f); q.y = ry; return q; };
          let per = 0; for (let i = 0; i < c; i++) per += rim(i).distanceTo(rim(i + 1));
          const sp = per / c, iA = 0, iB = Math.round(.5 * c - .5), F = Math.max(3, G.foot * c), S = Math.min(F, Math.max(2, Wd / sp));
          const sg = (i0: number) => (rim(i0 + 1).sub(rim(i0)).dot(nrm) >= 0 ? 1 : -1), sA = sg(iA), sB = sg(iB);
          const prevC = D.C[D.C.length - 2]; let yPrev = ry - D.rh; if (prevC && prevC.idx.length) { yPrev = 0; prevC.idx.forEach(q => { yPrev += D.P[q].y / prevC.idx.length; }); }
          let n = Math.max(6, Math.round(Lc / Math.max(D.rh * .5, ry - yPrev))); if (n % 2) n++;
          const k0At = (j: number) => { const t = j / n; return G.dec > 0 ? Math.min(1, Math.min(t, 1 - t) * 2 / G.dec) : 1; };
          const pos = (j: number, i0: number, s0: number, du: number) => { const q0 = k0At(j), k0 = q0 * q0 * (3 - 2 * q0); return ctr(j / n * Lc).add(rim(i0 + du).sub(rim(i0)).multiplyScalar(1 - k0)).addScaledVector(nrm, s0 * du * sp * k0); };
          const C0 = new THREE.Vector3(cx, ry - rr * .5, cz), wr0 = bodyN, skR = D.skip?.row ?? 1, skS = D.skip?.stitch ?? 1;
          // (the two halves meet at the middle row: the far half's last row stands on it too - the seam)
          for (let q = 1; q <= n; q++) {
            const a = q <= n / 2, j = a ? q : q - 1, i0 = a ? iA : iB, s0 = a ? sA : sB, jb = a ? j - 1 : j + 1, k0 = k0At(j), hw = Math.floor((F + (S - F) * k0) / 2);
            const wr = wl ? ((wr0 + (a ? j - 1 : n - j - 1)) * skR) % wl.H : -1;
            for (let du = -hw; du <= hw; du++) {
              const t = pos(j, i0, s0, du), b = pos(jb, i0, s0, du), al = pos(j, i0, s0, du + 1).sub(t), sw = Math.max(D.sw * .6, al.length());
              if (al.lengthSq() < 1e-12) al.set(1, 0, 0); al.normalize();
              const upV = t.clone().sub(b), h = upV.length() || D.rh, up = upV.divideScalar(h), out = new THREE.Vector3().crossVectors(al, up);
              if (out.lengthSq() < 1e-12) out.set(0, 1, 0); out.normalize(); if (out.dot(t.clone().sub(C0)) < 0) out.negate();
              const col = (((i0 + du) % c) + c) % c, wi = (col * skS) % (wl ? wl.W : 1);
              const ty: WallStitch = wr >= 0 ? (wl!.t[wr]?.[wi] ?? "sc") : sH < 1.4 ? "sc" : sH < 2 ? "hdc" : "dc";
              drawSt(ty, wr >= 0 && wl!.c && wl!.colors ? (wl!.colors[wl!.c[wr]?.[wi] ?? 0] ?? color) : color, (u, v, x) => t.clone().addScaledVector(al, u * sw).addScaledVector(up, v * h).addScaledVector(out, x * R));
            }
            if (postV > 30_000) flushPosts(); if (over()) yield;
          }
          flushPosts();
          strapEnds.push(A.clone(), B.clone()); strapH = Math.max(strapH, H + R); continue;
        }
        if (pat.strapStyle) {
          // its centre line: one hand handle rises from the sides, a little out first, then in (as above); two,
          // or a shoulder strap, arch over from end to end. Its ends go into the rim.
          const half = A.distanceTo(B) / 2, up = new THREE.Vector3(0, 1, 0), single = pat.strap === "long" && pat.strapCm < 70, N = 96;
          const cl = Array.from({ length: N + 1 }, (_, i) => {
            const t = i / N, th = Math.PI * t, s = Math.sin(th), c = Math.cos(th);
            if (single) return mid.clone().addScaledVector(w, -half * c * (1 + .32 * s * c * c)).addScaledVector(up, H * s - D.rh * 1.3 * (1 - s) ** 3);
            const q = A.clone().lerp(B, t); q.y += H * s - D.rh * 1.2 * (1 - s) ** 2; return q.addScaledVector(nrm, lean * rr * .12 * s);
          });
          // the ends go down the outside of the wall, flat on it, ~4cm, and the arch meets them right at the top round
          const endDrop = Math.min(40 / MM, ry * .3), off = R * 2.6, belt = pat.strap === "long", y1 = cl[0].y;
          // one handle (over the top, side to side): its ends on the side walls, out from the middle
          const wallAt = (dir: THREE.Vector3, y: number) => { let r = 0; for (const q of D.P) { if (Math.abs(q.y - y) > D.rh) continue; const d = (q.x - cx) * dir.x + (q.z - cz) * dir.z; if (d > r) r = d; } return new THREE.Vector3(cx, y, cz).addScaledVector(dir, (r || rr) + off); };
          // two handles (front and back): each end on its own wall straight out to the front (or back), where the
          // end is across - so the band lies flat on that wall and faces one way all along (no twist)
          const frontAt = (P0: THREE.Vector3, y: number) => {
            const u0 = (P0.x - cx) * w.x + (P0.z - cz) * w.z; let best = -1e9;
            for (const q of D.P) { if (Math.abs(q.y - y) > D.rh) continue; const u = (q.x - cx) * w.x + (q.z - cz) * w.z; if (Math.abs(u - u0) > D.sw * 1.2) continue; const d = (q.x - cx) * nrm.x + (q.z - cz) * nrm.z; if (d > best) best = d; }
            if (best < -1e8) best = rr;
            return new THREE.Vector3(cx, y, cz).addScaledVector(w, u0).addScaledVector(nrm, best + off);
          };
          const dA = new THREE.Vector3(cl[0].x - cx, 0, cl[0].z - cz).normalize(), dB = new THREE.Vector3(cl[N].x - cx, 0, cl[N].z - cz).normalize();
          const end = (P0: THREE.Vector3, dir: THREE.Vector3) => Array.from({ length: 7 }, (_, j) => { const y = y1 - endDrop * (1 - j / 6); return belt ? wallAt(dir, y) : frontAt(P0, y); });
          const endA = end(cl[0], dA), endB = end(cl[N], dB).reverse();
          // the arch from where the ends stop (no step out, no lean: it does not float off the bag)
          // two handles: the whole arch stands in the wall's own plane (out as far as its ends), leaning in only a little
          // at its top - front and back never meet; one handle: from the side walls up over the top
          const offA = new THREE.Vector3().subVectors(endA[6], cl[0]), offB = new THREE.Vector3().subVectors(endB[0], cl[N]);
          const arch = cl.slice(1, -1).map((q, i) => { const t = (i + 1) / N, s = Math.sin(Math.PI * t);
            const flat = q.clone(); if (belt) { const k = (1 - s) ** 2, e = t < .5 ? endA[6] : endB[0]; return flat.lerp(new THREE.Vector3(e.x, flat.y, e.z), k); }
            flat.addScaledVector(nrm, -lean * rr * .12 * s); offA.y = 0; offB.y = 0;
            return flat.add(offA.clone().lerp(offB, t).multiplyScalar(1 - .18 * s)); });
          const all = [...endA, ...arch, ...endB];
          strapEnds.push(endA[0].clone(), endB[endB.length - 1].clone());
          const ht = yield* strapBand(all, nrm, color, R, M, step, mat, geos, D.rh, belt);
          strapH = Math.max(strapH, H + ht); continue;
        }
        if (pat.strap === "long" && pat.strapCm < 70) {
          // one handle over the opening (Kim's round handbag): a thick crocheted cord, its section a flattened
          // ellipse (wide to the front), arching from the two sides - a little out first, then in to the top,
          // as a handle stands - its ends sunk into the rim. Its strands wind slowly round it, as a cord's do.
          const U = 10 / MM, hw = Math.max(sw * R * 1.75, 2.2 * U) / 2, ht = hw * .48, half = A.distanceTo(B) / 2;
          const per = Math.PI * (3 * (hw + ht) - Math.sqrt((3 * hw + ht) * (hw + 3 * ht))), n = Math.max(8, Math.min(26, Math.round(per / (R * 2.1))));
          const up = new THREE.Vector3(0, 1, 0), N = 72;
          const mid0 = (t: number) => { const th = Math.PI * t, s = Math.sin(th), c = Math.cos(th); return mid.clone().addScaledVector(w, -half * c * (1 + .32 * s * c * c)).addScaledVector(up, H * s - D.rh * 1.3 * (1 - s) ** 3); };
          const cl = Array.from({ length: N + 1 }, (_, i) => mid0(i / N)); let L = 0; for (let i = 1; i <= N; i++) L += cl[i].distanceTo(cl[i - 1]);
          const turns = L / (hw * 9);
          for (let j = 0; j < n; j++) {
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= N; i++) {
              const T = cl[Math.min(N, i + 1)].clone().sub(cl[Math.max(0, i - 1)]).normalize(), Q = new THREE.Vector3().crossVectors(T, nrm).normalize();
              const ph = 2 * Math.PI * (j / n + turns * i / N);
              pts.push(cl[i].clone().addScaledVector(nrm, hw * Math.cos(ph)).addScaledVector(Q, ht * Math.sin(ph)));
            }
            const cv = new THREE.CatmullRomCurve3(pts), g = buildYarn(cv.getSpacedPoints(Math.ceil(cv.getLength() / (R * .6 * step))), R, { M, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
          }
          strapH = Math.max(strapH, H + ht); continue;
        }
        Array.from({ length: sw }, (_, i) => i - (sw - 1) / 2).forEach(k => {
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= 40; i++) { const t = i / 40, q = A.clone().lerp(B, t); q.y += H * Math.sin(Math.PI * t) - R * 1.2 * (1 - Math.sin(Math.PI * t)); q.addScaledVector(nrm, k * R * 1.75 + lean * rr * .12 * Math.sin(Math.PI * t)); pts.push(q); }
          const cv = new THREE.CatmullRomCurve3(pts), g = buildYarn(cv.getSpacedPoints(Math.ceil(cv.getLength() / (R * .6 * step))), R, { M, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
        });
      }
      }
    }
    meshes.slice(strapFrom).forEach(m => { m.userData.part = "strap"; });
    if (over()) yield;
    const flapFrom = meshes.length;
    flapTip = addFlap(D, R, mat, M, step, geos);
    meshes.slice(flapFrom).forEach(m => { m.userData.part = "flap"; });
    if (over()) yield;
    yield* haloShell(geos); fz = yield* fuzzLines(geos); if (fz) group.add(fz);
    addExtras(D, R); // the phone's work screen tries buttons and labels on too (the old phone overlay had none)
  }
  // ---------- 받침 (Kim: 모자·후드는 머리 모양 받침 위에, 보틀백은 병 모양 받침 위에 - 아주 연한 색): a lathe of the
  // stand's outline, one mesh. A form is set over it already; a piece the engine settled itself (a bottle's bag)
  // is measured - how wide its wall stands - and the stand made to that, standing on the piece's bottom.
  function addStand(D: ItemData, R: number) {
    const sd = pat.stand; if (!sd || sd.prof.length < 3) return;
    const U = 10 / MM; let k = 1, y0 = 0;
    if (sd.fitTo && !D.form) {
      const b = boxOf(D); let rr = 0, n = 0; const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
      for (const q of D.P) if (q.y > D.rh * 2) { rr += Math.hypot(q.x - cx, q.z - cz); n++; }
      if (!n) return; rr = rr / n - R * 1.5;
      const widest = Math.max(...sd.prof.map(q => q[0])); if (!(widest > 0) || rr <= 0) return;
      k = rr / (widest * U); y0 = R * 1.6;
    }
    const pts = sd.prof.map(([x, y]) => new THREE.Vector2(Math.max(0, x) * U * k, y * U * k));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 56), new THREE.MeshStandardMaterial({ color: lin(0xE6DFD4), roughness: .97, metalness: 0 }));
    m.position.y = y0; m.castShadow = true; m.receiveShadow = false; m.userData.stand = true; group.add(m);
  }
  // ---------- a handle as it is made (Kim). Along its centre line `cl`, its flat face towards `nrm`:
  //   tube        rounds round it, one after another (a crocheted tube), as thick as strapWcm
  //   flat-chain  a chain from end to end, widened by rows along it: its rows run the handle's length
  //   flat-rows   worked as wide as it should be, then row after row to its other end: its rows run across
  // A flat one is two layers of yarn thick, its stitches a little raised. Returns how far it stands out.
  function* strapBand(cl: THREE.Vector3[], nrm: THREE.Vector3, color: string, R: number, M: number, step: number, mat: THREE.Material, geos: THREE.BufferGeometry[], rh: number, belt = false, faces?: THREE.Vector3[]): Generator<void, number, void> {
    const U = 10 / MM, Wd = Math.max(.8, pat.strapWcm ?? 2.5) * U, N = cl.length - 1;
    const cum = [0]; for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + cl[i].distanceTo(cl[i - 1]));
    const L = cum[N];
    const frame = (s: number) => {
      let i = 1; while (i < N && cum[i] < s) i++;
      const f = Math.max(0, Math.min(1, (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]))), P = cl[i - 1].clone().lerp(cl[i], f);
      // the width across: for two handles in the arch's own plane (their flat side to the front, on the front and
      // back walls); for one over the top, front to back - a belt, its flat side out, on the side walls
      const fn = faces ? faces[i - 1].clone().lerp(faces[i], f).normalize() : nrm;
      const T = cl[i].clone().sub(cl[i - 1]).normalize(), Q = belt ? nrm.clone().addScaledVector(T, -T.dot(nrm)).normalize() : new THREE.Vector3().crossVectors(T, fn).normalize(), F = new THREE.Vector3().crossVectors(Q, T).normalize();
      return { P, T, Q, F };
    };
    // one yarn for the whole handle (as it is worked: a spiral, or rows turning at their ends), its points made
    // even (no curve fitting over thousands of points) - one mesh, light enough beside the book's own 3D
    const add = function* (pts: THREE.Vector3[]): Generator<void, void, void> {
      if (pts.length < 2) return; const gap = R * .6 * step, out: THREE.Vector3[] = [pts[0]];
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], k = Math.ceil(a.distanceTo(b) / gap); for (let j = 1; j <= k; j++) out.push(a.clone().lerp(b, j / k)); }
      const even: THREE.Vector3[] = [out[0]]; let last = out[0];
      for (const q of out) if (q.distanceTo(last) >= gap * .9) { even.push(q); last = q; }
      if (over()) yield;
      const g = yield* buildYarnG(even, R, { M, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
    };
    const sw = R * 2.2; // one stitch across
    // a row's stitches stand up and lean back in turn (a zigzag the row's height): rows touch, as crochet's do
    const zz = (x: number) => (1 - 4 * Math.abs(x - Math.round(x))) * rh * .42;
    const th = R * 1.1; // a flat one's yarn passes front and back of its middle, stitch by stitch
    const pts: THREE.Vector3[] = [];
    if (pat.strapStyle === "tube") {
      // worked round in a spiral: one turn a round, each round a row's height further along
      const r = Wd / 2, n = Math.max(2, Math.round(L / rh)), k = Math.max(12, Math.round(2 * Math.PI * r / (R * .45))), nst = Math.max(6, Math.round(2 * Math.PI * r / sw)), endFlat = Math.min(L * .2, 40 / MM);
      for (let t = 0; t <= n * k; t++) {
        const i2 = t % k, sAt = Math.max(0, Math.min(L, L * t / (n * k) + zz(i2 / k * nst))), a = 2 * Math.PI * i2 / k, { P, Q, F } = frame(sAt);
        // near each end the tube opens out flat (its round's length kept: as wide as half its round), lying on the body
        const e = Math.min(sAt, L - sAt) / endFlat, g = e >= 1 ? 1 : e * e * (3 - 2 * e), ra = r * (1 + .57 * (1 - g)), rb = r * Math.max(.12, g);
        pts.push(P.addScaledVector(Q, ra * Math.cos(a)).addScaledVector(F, rb * Math.sin(a)));
      }
      yield* add(pts); return r;
    }
    if (pat.strapStyle === "flat-chain") {
      // a chain from end to end, then rows along it, back and forth, until it is as wide as it should be
      const n = Math.max(2, Math.round(Wd / rh)), m = Math.ceil(L / (R * .35));
      for (let j = 0; j < n; j++) {
        const o = (j - (n - 1) / 2) * Wd / n;
        for (let i = 0; i <= m; i++) { const s = L * (j % 2 ? m - i : i) / m, { P, Q, F } = frame(s); pts.push(P.addScaledVector(Q, o + zz(s / sw + j * .5)).addScaledVector(F, th * Math.cos(Math.PI * s / sw))); }
      }
      yield* add(pts); return th + R;
    }
    // flat-rows: worked as wide as it should be, then row after row, back and forth, to its other end
    const n = Math.max(2, Math.round(L / rh)), m = Math.max(8, Math.ceil(Wd / (R * .35)));
    for (let j = 0; j <= n; j++) for (let i = 0; i <= m; i++) {
      const x = ((j % 2 ? m - i : i) / m - .5) * Wd, { P, Q, F } = frame(Math.max(0, Math.min(L, L * j / n + zz(x / sw + j * .5))));
      pts.push(P.addScaledVector(Q, x).addScaledVector(F, th * Math.cos(Math.PI * x / sw)));
    }
    yield* add(pts); return th + R;
  }
  // ---------- 덮개: rows across the opening from the back, over the top, then down the front as far as the flap
  // is long; its outline below the front edge is the picked shape (반달 / 네모 / 세모). Returns where its tip is.
  let flapTip: { p: THREE.Vector3; n: THREE.Vector3 } | null = null;
  function addFlap(D: ItemData, R: number, mat: THREE.Material, M: number, step: number, geos: THREE.BufferGeometry[]) {
    flapArea = null;
    const f = pat.flap, k = pat.shape.kind; if (!f || !(f.cm > 0) || !(k === "round" || k === "oval" || k === "rect")) return null;
    const top = D.C[D.C.length - 1]; if (!top || !top.closed || top.idx.length < 6) return null;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, ry = 0;
    top.idx.forEach(i => { const q = D.P[i]; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); ry += q.y; }); ry /= top.idx.length;
    const cx = (x0 + x1) / 2, hw0 = (x1 - x0) / 2 * .94, lift = R * 1.2, out = R * 2.4, drop = f.cm * 10 / MM, color = f.color ?? colorOf(top.ci);
    // two handles: the flap as wide as fits between them (Kim: 손잡이 안쪽에 위치하는 너비)
    const inner = pat.strap === "two" && strapEnds.length ? Math.min(...strapEnds.map(q => Math.abs(q.x - cx))) - Math.max(.8, pat.strapWcm ?? 2.5) * 10 / MM / 2 - R * 2.5 : Infinity;
    const hw = Math.max(hw0 * .35, Math.min(hw0, inner));
    // the centre line in (z, y): on from the back wall's last round (it is worked from there), a low curve over
    // the top - as wide as the top is left open - then down the front
    const line: [number, number, number][] = []; // z, y, share of the drop (-1 on the top)
    // over the top (Kim): flat across the opening, a lid, and a firm turn at the front edge
    const nTop = 16; for (let i = 0; i <= nTop; i++) { const t = i / nTop; line.push([z0 + (z1 + out - z0) * t, ry + (f.over ? Math.min(1, Math.sin(Math.PI * t) * 3) : Math.sin(Math.PI * t)) * lift + R * .6 * t, -1]); }
    // down the front it lies on the wall: the wall's front at each height (a body widening downward leans out,
    // and a flap hanging straight down would sink into it)
    const frontZ = (y: number) => { let z = -1e9; for (const q of D.P) if (Math.abs(q.x - cx) < hw * .35 && Math.abs(q.y - y) < D.rh * .75 && q.z > z) z = q.z; return z > -1e9 ? z : z1; };
    const nDrop = 24; for (let i = 1; i <= nDrop; i++) { const t = i / nDrop, y = ry + lift - (drop + lift) * t; line.push([Math.max(z1, frontZ(y)) + out, y, t]); }
    const acc = [0]; for (let i = 1; i < line.length; i++) acc.push(acc[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    const total = acc[acc.length - 1], rows = Math.max(3, Math.round(total / D.rh));
    const at = (sv: number) => { let i = 1; while (i < acc.length - 1 && acc[i] < sv) i++; const t = (sv - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]); const a = line[i - 1], b = line[i]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, b[2] < 0 ? -1 : (a[2] < 0 ? 0 : a[2]) + ((b[2]) - (a[2] < 0 ? 0 : a[2])) * t]; };
    const half = (u: number) => f.shape === "square" ? hw : f.shape === "triangle" ? hw * Math.max(.06, 1 - u) : hw * Math.sqrt(Math.max(.01, 1 - u * u));
    // the row's two ends from the middle (a slant keeps one edge and brings the other in; a triangle with a tip
    // left stops narrowing at the tip's width)
    const tipK = Math.max(.04, Math.min(1, f.tip ?? .06));
    const stairW = (u: number) => hw * (1 - (1 - tipK) * Math.min(f.steps!, Math.floor(Math.max(0, u) * (f.steps! + 1))) / f.steps!);
    const ext = (u: number): [number, number] => f.steps ? [-stairW(u), stairW(u)] : f.shape === "slant-l" ? [-hw + 2 * hw * (1 - tipK) * u, hw] : f.shape === "slant-r" ? [-hw, hw - 2 * hw * (1 - tipK) * u]
      : f.shape === "triangle" && f.tip != null ? [-hw * (1 - (1 - tipK) * u), hw * (1 - (1 - tipK) * u)] : [-half(u), half(u)];
    // its face down the front, where it truly is: inside the picked outline (반달 / 네모 / 세모), out from the wall
    // there (Kim: 덮개에 장식을 붙이면 덮개 위에)
    flapArea = { cx, hw, yTop: ry + lift, yBot: ry + lift - drop, out, face: (x, y) => {
      const u = (ry + lift - y) / (drop + lift); if (u < 0 || u > 1) return null;
      const [xa, xb] = ext(u); if (x - cx < xa || x - cx > xb) return null;
      return Math.max(z1, frontZ(y)) + out;
    } };
    let prev: THREE.Vector3[] | null = null, tip: THREE.Vector3 | null = null;
    const left: THREE.Vector3[] = [], right: THREE.Vector3[] = []; // the front part's edges, for its border
    // worked on from the back's own top edge (Kim: 뒤쪽 편물과 이어져야 - it lay on top like a lid): the back half of
    // the last round, across the flap's width only (a body with width: its back long side, the short sides left
    // out). The first rows start on that edge, following its curve and height, and turn into the line over the top
    const czm = (z0 + z1) / 2, back = top.idx.map(i => D.P[i]).filter(q => q.z < czm && Math.abs(q.x - cx) <= hw * 1.02).sort((a, b) => a.x - b.x);
    const rimAt = (x: number): [number, number] | null => {
      if (back.length < 2) return null;
      if (x <= back[0].x) return [back[0].z, back[0].y]; if (x >= back[back.length - 1].x) return [back[back.length - 1].z, back[back.length - 1].y];
      let j = 1; while (j < back.length - 1 && back[j].x < x) j++; const a = back[j - 1], b = back[j], t = (x - a.x) / Math.max(1e-9, b.x - a.x);
      return [a.z + (b.z - a.z) * t, a.y + (b.y - a.y) * t];
    };
    const JOIN = 3; // rows over which the flap leaves the back's edge for its own line
    for (let r0 = 0; r0 <= rows; r0++) {
      const [z, y, u] = at(total * r0 / rows), [xa, xb] = u < 0 ? [-hw, hw] : ext(u), n = Math.max(2, Math.round((xb - xa) / D.sw)), row: THREE.Vector3[] = [];
      const fj = r0 >= JOIN ? 1 : r0 / JOIN, ease = fj * fj * (3 - 2 * fj);
      for (let i = 0; i <= n; i++) {
        const x = cx + xa + (xb - xa) * i / n, rim = fj < 1 ? rimAt(x) : null;
        row.push(rim ? new THREE.Vector3(x, rim[1] + (y - rim[1]) * ease + R * .5 * (1 - ease), rim[0] + (z - rim[0]) * ease) : new THREE.Vector3(x, y, z));
      }
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
    const ex = pat.extras; if (!ex || !(ex.button || ex.label || ex.zipper || ex.tab || ex.items?.length) || !D.P.length) return;
    const b = boxOf(D), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, wall = b.my > D.rh * 3, U = 10 / MM; // U: 1cm
    const std = (color: number, rough = .8, metal = 0) => new THREE.MeshStandardMaterial({ color: lin(color), roughness: rough, metalness: metal, envMap: metal ? env() : null });
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
    // put where the flap covers the front (Kim: 덮개에 장식 - it sat under the flap, half hidden): on the flap's face
    // every decoration on the outermost face (Kim: 모든 장식은 가장 겉면 위에): over the flap's own face where the flap
    // is (its outline, its face's distance there, facing the front), else on the wall
    const place = (o: THREE.Object3D, p: THREE.Vector3, n: THREE.Vector3, lift: number) => {
      const fz = flapArea && n.z > 0 ? flapArea.face(p.x, p.y) : null;
      if (fz !== null && fz !== undefined) { face(o, new THREE.Vector3(0, 0, 1)); o.position.set(p.x, p.y, Math.max(fz, p.z) + R * 1.9 + lift); return; }
      face(o, n); o.position.copy(p).addScaledVector(n, R * 1.5 + lift);
    };
    // a dragged one follows the pointer over the front wall (pieces with walls only)
    if (wall) exPlace = (o, across, up) => {
      const { p, n } = at(up, across * Math.PI * .42); place(o, p, n, (o.userData.btn ? .16 : .05) * U);
    };
    // 단추 고리 (Kim's round handbag): a short crocheted strap from inside the opening, over the rim at the front's
    // middle and down the front wall, its end where the button sits
    let tabTip: { p: THREE.Vector3; n: THREE.Vector3 } | null = null;
    if (ex.tab && wall && !flapTip) {
      const top = at(1, 0), low = at(ex.buttonAt?.[1] ?? .74, 0), n0 = top.n, side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), n0).normalize();
      const path: THREE.Vector3[] = [
        top.p.clone().addScaledVector(n0, -R * 3.5).setY(top.p.y - D.rh * 1.5),
        top.p.clone().addScaledVector(n0, -R * 1.2).setY(top.p.y + R * 2.6),
        top.p.clone().addScaledVector(n0, R * 2.2).setY(top.p.y + R * 1.6),
      ];
      const steps = 8; for (let i = 1; i <= steps; i++) { const y = top.p.y + (low.p.y - top.p.y) * i / steps, q = at(y / b.my, 0); path.push(q.p.clone().addScaledVector(q.n, R * 2.3).setY(y)); }
      const cv = new THREE.CatmullRomCurve3(path), U2 = 10 / MM, tw = 1.5 * U2, k = Math.max(3, Math.round(tw / (R * 1.8))), color = colorOf(D.C[D.C.length - 1].ci), mat = yarnMat(R);
      for (let j = 0; j < k; j++) {
        const o = (j - (k - 1) / 2) * tw / (k - 1), sp = cv.getSpacedPoints(Math.max(24, Math.ceil(cv.getLength() / (R * .6)))).map(q => q.clone().addScaledVector(side, o));
        const g = buildYarn(sp, R, { M: LOD.M, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m);
      }
      const end = path[path.length - 1]; tabTip = { p: end.clone().setY(end.y + D.rh * .3).addScaledVector(low.n, R * .8), n: low.n };
    }
    if (ex.button) {
      const ba = ex.buttonAt, gold = ex.buttonColor === "gold";
      const { p, n } = ba && !tabTip ? (wall ? at(ba[1], ba[0] * Math.PI * .42) : { p: new THREE.Vector3(cx + ba[0] * (b.x1 - b.x0) / 2, b.my, cz - (ba[1] - .5) * (b.z1 - b.z0)), n: new THREE.Vector3(0, 1, 0) })
        : flapTip ?? tabTip ?? (wall ? at(.72, 0) : { p: new THREE.Vector3(cx, b.my, cz), n: new THREE.Vector3(0, 1, 0) });
      const bp = extraPic(ex.buttonPic), r = (ba?.[2] ?? bp?.cm ?? 1.9) / 2 * U;
      const g = bp ? picCard(bp.id, r * 2 * Math.min(1, bp.r), r * 2 / Math.max(1, bp.r), .14 * U) : new THREE.Group();
      if (bp) { /* Kim's picture */ } else if (gold) {
        // a gold dome, as on a handbag's clasp
        const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd4af37, .28, .9)); dome.rotation.x = Math.PI / 2; dome.scale.set(1, .55, 1); g.add(dome);
      } else {
        const col = ex.buttonColor && /^#[0-9a-f]{6}$/i.test(ex.buttonColor) ? parseInt(ex.buttonColor.slice(1), 16) : 0xb88a5a;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .16 * U * 2, 32), std(col, .62)); disc.rotation.x = Math.PI / 2; g.add(disc);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(r * .82, .05 * U * 2, 8, 32), std(col, .6)); rim.position.z = .15 * U; g.add(rim);
        for (const [hx, hy] of [[-.28, .28], [.28, .28], [-.28, -.28], [.28, -.28]]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.13 * U, .13 * U, .36 * U, 10), std(0x4a372a, .9)); h.rotation.x = Math.PI / 2; h.position.set(hx * r, hy * r, 0); g.add(h); }
      }
      if (wall && ba && !tabTip) place(g, p, n, .16 * U); else { face(g, n); g.position.copy(p).addScaledVector(n, R * 1.5 + .16 * U); } put(g);
      if (wall && !tabTip && !(flapTip && !ba)) { g.userData.extra = "button"; g.userData.btn = true; exObjs.push(g); }
    }
    if (ex.label) {
      const la = ex.labelAt;
      const { p, n } = la ? (wall ? at(la[1], la[0] * Math.PI * .42) : at(1, la[0])) : wall ? at(.34, .5) : at(1, .9);
      const lp = extraPic(ex.labelPic), w = (la?.[2] ?? lp?.cm ?? 2.8) * U, h = lp ? w / lp.r : w / 2;
      const g = lp ? picCard(lp.id, w, h, .06 * U) : new THREE.Group();
      if (!lp) {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, .07 * U), std(0xf4ebdd, .95)));
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w * .86, h * .72)), new THREE.LineDashedMaterial({ color: lin(0xb99447), dashSize: .12 * U, gapSize: .1 * U })); edge.computeLineDistances(); edge.position.z = .045 * U; g.add(edge);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w * .42, h * .1, .02 * U), std(0x9c5d63, .9)); bar.position.z = .045 * U; g.add(bar);
      }
      if (wall) place(g, p, n, .05 * U); else { g.rotation.x = -Math.PI / 2; g.rotation.z = -.3; g.position.copy(p).addScaledVector(n, R * 1.5 + .05 * U); g.position.x -= w * .3; g.position.z -= h * .6; } put(g);
      if (wall) { g.userData.extra = "label"; exObjs.push(g); }
    }
    // more of them (Kim: 여러 개): each its picture, where it was put, as big as it was made
    (ex.items ?? []).forEach((it, i) => {
      const pc = extraPic(it.pic); if (!pc) return;
      const btn = it.pic.startsWith("b-"), w = it.at[2] * U, h = btn ? w / Math.max(1, pc.r) * Math.min(1, pc.r) : w / pc.r;
      const g = picCard(pc.id, btn ? w * Math.min(1, pc.r) : w, h, (btn ? .14 : .06) * U);
      const { p, n } = wall ? at(it.at[1], it.at[0] * Math.PI * .42) : { p: new THREE.Vector3(cx + it.at[0] * (b.x1 - b.x0) / 2, b.my, cz - (it.at[1] - .5) * (b.z1 - b.z0)), n: new THREE.Vector3(0, 1, 0) };
      if (wall) place(g, p, n, (btn ? .16 : .05) * U); else { face(g, n); g.position.copy(p).addScaledVector(n, R * 1.5 + (btn ? .16 : .05) * U); } put(g);
      if (wall) { g.userData.extra = "item:" + i; g.userData.btn = btn; exObjs.push(g); }
    });
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
      const zc = ex.zipColor === "silver" ? 0xc9cbd0 : ex.zipColor === "brass" ? 0xb08d4a : 0xd4af37, open = Math.max(0, Math.min(1, ex.zipOpen ?? 0)), shut = Math.round(N * (1 - open)), gap = .55 * U;
      const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(.2 * U, .18 * U, .26 * U), std(zc, .35, .85), N * 2), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      let k4 = 0;
      for (let i = 0; i < N; i++) {
        const q = sp[i], t = cv.getTangent(i / N), nr = new THREE.Vector3(q.x - cx, 0, q.z - cz).normalize(); q4.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(t.x, 0, t.z).normalize());
        const sides = i < shut ? [0] : [-gap / 2, gap / 2];
        for (const o of sides) { m4.compose(new THREE.Vector3(q.x + nr.x * o, q.y + R * .4, q.z + nr.z * o), q4, one); teeth.setMatrixAt(k4++, m4); }
      }
      teeth.count = k4; put(teeth);
      const sq = sp[Math.min(N - 1, shut)], st0 = cv.getTangent(Math.min(N - 1, shut) / N), pull = new THREE.Group();
      pull.add(new THREE.Mesh(new THREE.BoxGeometry(.5 * U, .45 * U, .5 * U), std(zc, .3, .85)));
      const tab = new THREE.Mesh(new THREE.BoxGeometry(.32 * U, 1.1 * U, .08 * U), std(zc, .3, .85)); tab.position.set(0, -.7 * U, .3 * U); pull.add(tab);
      const pn = new THREE.Vector3(sq.x - cx, 0, sq.z - cz).normalize(); face(pull, pn); pull.position.set(sq.x, sq.y + R * .4, sq.z); void st0; put(pull);
    }
  }
  // knitted stockinette: one row = one strand of joined loops (the prototype's buildKnit)
  function* buildKnit(D: ItemData, R: number, mat: THREE.Material, geos: THREE.BufferGeometry[]): Generator<void, void, void> {
    const K = D.knit!, w = K.wk, Hh = 1.05 * w, a = .22 * w, d = Math.min(R, w * .3), per = page ? 10 : 14, q = Math.round(per * .25), rowC = D.C;
    // a purl stitch is a knit stitch seen from behind: its loop's front and back are swapped. The sign
    // blends over a fifth of a stitch where a knit meets a purl, so the strand passes through the fabric.
    const kf = stitchOf(pat.shape.kind === "rows" ? pat.shape.stitch : undefined).f; // read now: the pattern can change without a new shape
    const sg = (j: number, u: number) => {
      const n = Math.floor(u), fr = u - n, c = (k: number) => kf(j, ((k % K.W) + K.W) % K.W);
      return fr < .1 ? c(n - 1) + (c(n) - c(n - 1)) * (.5 + fr / .2) : fr > .9 ? c(n) + (c(n + 1) - c(n)) * ((fr - .9) / .2) : c(n);
    };
    for (let j = 0; j < K.H; j++) {
      if (over()) yield;
      const pts: THREE.Vector3[] = [], tb = K.type === "tube";
      for (let i = tb ? 0 : -q; i < (tb ? K.W * per : K.W * per + q + 1); i++) {
        // 3D 정밀 (Kim): knit stitches stand forward and purl ones sink back - the ribs of 고무뜨기, the ridges of
        // 가터, the pebbles of 멍석 (the fabric was flat, the two only told apart by the loop's shape)
        const u = i / per, ac = w * u + a * Math.sin(4 * Math.PI * u), lp = (Hh / 2) * Math.cos(2 * Math.PI * u), sgn = sg(j, u), dz = d * Math.cos(4 * Math.PI * u) * sgn, relief = d * .9 * sgn;
        if (tb) { const th = ac / K.rho, r = K.rho - dz + relief; pts.push(new THREE.Vector3(Math.cos(th) * r, j * K.rk - lp + Hh / 2, Math.sin(th) * r)); }
        else { const al = (j - (K.H - 1) / 2) * K.rk - lp, x = ac - K.W * w / 2, y = d - dz + relief; pts.push(K.swap ? new THREE.Vector3(al, y, x) : new THREE.Vector3(x, y, al)); }
      }
      // as many points round the strand as the crochet's, so its plies twist here too (Kim: 대바늘도)
      const cv = new THREE.CatmullRomCurve3(pts, tb), g = buildYarn(cv.getSpacedPoints(Math.ceil(cv.getLength() / (R * .5 * LOD.step))), R, { M: LOD.M, closed: tb, color: colorOf(rowC[j]?.ci ?? j) }), m = new THREE.Mesh(g, mat);
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
    if (s.kind === "chart") { opts.onInfo({ round: false, widthCm: s.wCm, depthCm: s.hCm, heightCm: null, fit, skip: null }); return { my: D.rh, mr: Math.max(dx, dz) / 2 }; }
    if (s.kind === "form") { const r1 = (v: number) => Math.round(v * 10) / 10; opts.onInfo({ round: Math.abs(s.size[0] - s.size[1]) < .05, widthCm: r1(s.size[0]), depthCm: r1(s.size[1]), heightCm: s.size[2] == null ? null : r1(s.size[2]), fit, skip: null }); return { my, mr: Math.max(dx, dz) / 2 }; }
    if (s.kind === "grid") { opts.onInfo({ round: false, widthCm: s.wCm, depthCm: s.hCm, heightCm: null, fit, skip: D.skip }); return { my, mr: Math.max(dx, my) / 2 }; }
    opts.onInfo({ round, widthCm: cm(Math.max(dx, dz)), depthCm: cm(Math.min(dx, dz)), heightCm: h, fit, skip: D.skip });
    return { my, mr: Math.max(dx, dz) / 2 };
  }
  const disposeTree = (g: THREE.Object3D) => g.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; if (mt) (Array.isArray(mt) ? mt : [mt]).forEach(x => { if (!x.userData.keep) x.dispose(); }); });
  function clearGroup() {
    if (anim) { cancelAnimationFrame(anim); anim = 0; }
    disposeTree(group);
    while (group.children.length) group.remove(group.children[0]);
    meshes = []; halos = []; fz = null; holo = null; exObjs = []; exPlace = null;
  }
  // ---------- the yarn being made, a frame's share at a time
  /** the piece being put together: its generator, what is on the stage meanwhile, and what to do once it is whole */
  let job: { gen: Generator<void, void, void>; D: ItemData; old: THREE.Group; then?: () => void; built?: boolean; ready?: boolean } | null = null, sliceEnd = 0;
  /** what left the stage, let go a frame later: its shader programs are still in use by the new piece's first
   *  frame then, and are kept instead of being compiled again */
  let trash: THREE.Object3D[] = [];
  const SLICE_MS = 10;
  /** this frame's share of the work is used up */
  const over = () => performance.now() >= sliceEnd;
  /** `then`: once the piece is on the stage (at once for the structure view; frames later for the yarn) */
  function showItem(then?: () => void) {
    const D = IT.data!; let carry: (() => void) | undefined;
    if (job) {
      // made again before it was whole: the half-made one is let go, what is on the stage stays; what was to
      // follow it (the camera, 생성 중 put away) follows the new one, when it is the same piece
      if (job.D === D) carry = job.then;
      disposeTree(group); group = job.old; job = null;
    }
    const done = carry && then ? () => { carry!(); then(); } : then ?? carry;
    if (IT.view === "yarn" && D.done) {
      if (anim) { cancelAnimationFrame(anim); anim = 0; }
      // a 제작 시뮬레이션 stopped midway: what stays on the stage meanwhile is shown whole
      meshes.forEach(m => m.geometry.setDrawRange(0, Infinity)); if (fz) fz.visible = true; halos.forEach(h => { h.visible = true; }); exObjs.forEach(o => { o.visible = true; });
      const old = group; group = new THREE.Group();
      meshes = []; halos = []; fz = null; holo = null; exObjs = []; exPlace = null;
      job = { gen: buildItemYarn(D), D, old, then: done };
      schedule();
    } else {
      clearGroup(); holo = buildHolo(D); updateHolo(D); group.add(holo);
      kick(); done?.();
    }
  }
  // The frame a new piece first shows in used to do everything the graphics card needs at once (the yarn's shader
  // put together, every vertex handed over): a pause of a quarter second. Both are done while the yarn is made:
  //  - the shader as the making starts (compileAsync: in the driver's own thread where the browser can)
  //  - each mesh's vertices in the frame it is finished, by drawing it once into a 1px picture nobody sees
  const WARM_GEO = (() => { const g = new THREE.BufferGeometry(); for (const [k, n] of [["position", 3], ["normal", 3], ["color", 3], ["uv", 2]] as const) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n * 3), n)); return g; })();
  function warmProgram(mat: THREE.Material) { const m = new THREE.Mesh(WARM_GEO, mat), h = new THREE.Group(); m.castShadow = true; h.add(m); renderer.compileAsync(h, cam, scene).catch(() => { /* drawn the usual way then */ }); }
  const warmRT = new THREE.WebGLRenderTarget(1, 1), warmScene = new THREE.Scene(), warmMat = new THREE.MeshBasicMaterial(); let warmed = new WeakSet<THREE.BufferGeometry>();
  function warmGeometry() {
    group.traverse(o => { const g = (o as THREE.Mesh).geometry; if (!g || warmed.has(g)) return; warmed.add(g); const m = new THREE.Mesh(g, warmMat); m.frustumCulled = false; warmScene.add(m); });
    if (!warmScene.children.length) return;
    const rt = renderer.getRenderTarget(); renderer.setRenderTarget(warmRT); renderer.render(warmScene, cam); renderer.setRenderTarget(rt);
    warmScene.clear();
  }
  /** a frame's share of the yarn; true while there is more to make */
  function stepJob() {
    if (!job) return false;
    if (!job.built) {
      sliceEnd = performance.now() + SLICE_MS;
      const r = job.gen.next();
      warmGeometry();
      if (!r.done) return true;
      // made: it goes on the stage once every shader it needs is put together (the yarn's has been since the
      // start; buttons, labels and hairs bring their own) - 4 seconds at most, then drawn the usual way
      const made = job; made.built = true;
      Promise.race([renderer.compileAsync(group, cam, scene).catch(() => { /* drawn the usual way */ }), new Promise(res => setTimeout(res, 4000))]).then(() => { made.ready = true; schedule(); });
      return true;
    }
    if (!job.ready) return true;
    const j = job; job = null; slowPiece = false;
    scene.remove(j.old); trash.push(j.old); scene.add(group);
    kick(); j.then?.();
    return false;
  }
  // ---------- a knitted or crocheted piece is not rigid (Kim): once the shape has settled, a piece with
  // walls gives a little under its own weight - the top drops and leans in, the belly comes out, the rim is
  // no perfect circle; a flat piece lifts at its edge. How much: the material (a cord basket stands, mohair
  // slumps) and how loose it is worked. The settled shape is kept (rest), so another material starts from it.
  // Phones too (Kim, 11/25: 탄성 적용이 전혀 안 된다 - it was left off on phones).
  let rest: Float32Array | null = null;
  // the top closed (Kim: 덮개 설정에 따라 가방 윗면을 다물어지게; a zipper closes it too): the front and back walls
  // come together over the top part, to the gap asked (0: shut as a zipper's), the width kept a little wider
  function closeTop(D: ItemData) {
    // 오므리기 (Kim): the stitches stay as they are - the same count in every round - so a round pressed shallower
    // grows wider by as much: each height keeps its round's length, front and back coming together while the
    // sides go out (a cylinder's top becomes a wide, flat line; seen from the front the bag flares to the top)
    const ex = pat.extras, zip = !!ex?.zipper && !pat.flap;
    if (pat.topGap == null && !zip) return;
    const b = boxOf(D), H = b.my; if (H < D.rh * 3) return;
    const wide = wideX(b), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, NB = 24;
    const uv = (p: THREE.Vector3) => wide ? [p.x - cx, p.z - cz] : [p.z - cz, p.x - cx];
    const ua = new Array(NB + 1).fill(0), vb = new Array(NB + 1).fill(0), bin = (y: number) => Math.max(0, Math.min(NB, Math.round(y / H * NB)));
    for (const p of D.P) { const k = bin(p.y), [u, v] = uv(p); ua[k] = Math.max(ua[k], Math.abs(u)); vb[k] = Math.max(vb[k], Math.abs(v)); }
    const hd = vb[NB] || vb[NB - 1]; if (!hd) return;
    const want = zip ? Math.max(.12, Math.min(1, ex!.zipOpen ?? 0)) * hd : Math.max(R0() * 1.4, (pat.topGap ?? 0) * 10 / MM / 2);
    if (want >= hd) return;
    const per = (a: number, c: number) => Math.PI * (3 * (a + c) - Math.sqrt((3 * a + c) * (a + 3 * c)));
    // each height's new half-width and half-depth, its length kept
    const sa = new Array(NB + 1).fill(1), sb = new Array(NB + 1).fill(1), fk = new Array(NB + 1).fill(0), cw = new Array(NB + 1).fill(0), tuck = pat.topFold === "tuck";
    for (let k = 0; k <= NB; k++) {
      const a = ua[k], c = vb[k]; if (!a || !c) continue;
      const u = Math.max(0, Math.min(1, (k / NB - .05) / .95)), f = u ** 1.4; if (!f) continue; // from the round bottom up to the closed top, little by little (Kim's sketch)
      const c2 = c - (c - Math.min(c, want)) * f, L = per(a, c); let a2 = a;
      if (tuck) { fk[k] = f; cw[k] = c2; continue; } // folded in: worked out per stitch below
      for (let i = 0; i < 24; i++) a2 *= L / per(a2, c2);
      sa[k] = a2 / a; sb[k] = c2 / c;
    }
    for (const p of D.P) {
      // between two heights' measures, smoothly (no steps from one band to the next)
      const fb = Math.max(0, Math.min(NB, p.y / H * NB)), k0 = Math.floor(fb), k1 = Math.min(NB, k0 + 1), t = fb - k0;
      const [u, v] = uv(p);
      let u2: number, v2: number;
      if (tuck) {
        // folded in (as a paper bag's sides): the front and the back stay as wide as the round (a), and what is left
        // of the round's length past them goes in at each side as a V, its point where the side's middle was
        const kk = t < .5 ? k0 : k1, a = ua[kk], c = vb[kk], f = fk[kk];
        if (!a || !c || !f) { u2 = u; v2 = v; }
        else {
          const Lq = per(a, c) / 4, c2 = cw[kk], phi = Math.atan2(Math.abs(v) / c, Math.abs(u) / a); // 0 at the side, pi/2 at the front's middle
          const fromFront = Lq * (1 - phi / (Math.PI / 2)), leg = Math.max(1e-6, Lq - a);
          let tu: number, tv: number;
          if (fromFront <= a || Lq <= a) { tu = Math.min(a, fromFront); tv = c2; }
          else { const l = Math.min(leg, fromFront - a); tu = a - l; tv = c2 * (1 - l / leg); }
          u2 = u + (Math.sign(u || 1) * tu - u) * f; v2 = v + (Math.sign(v || 1) * tv - v) * f;
        }
      } else { u2 = u * (sa[k0] + (sa[k1] - sa[k0]) * t); v2 = v * (sb[k0] + (sb[k1] - sb[k0]) * t); }
      if (wide) { p.x = cx + u2; p.z = cz + v2; } else { p.z = cz + u2; p.x = cx + v2; }
    }
  }
  function soften(D: ItemData) {
    const restored = !((D.fixed && pat.shape.kind !== "rows") || !rest || rest.length !== D.P.length * 3);
    softenBody(D);
    if (restored) closeTop(D);
  }
  function softenBody(D: ItemData) {
    // a known shape stays as built - except a flat piece in rows (the yarn check's swatch, a scarf): a soft yarn
    // lies soft (Kim: 단단한 실이 아니면 흐물흐물하게)
    if ((D.fixed && pat.shape.kind !== "rows") || !rest || rest.length !== D.P.length * 3) return;
    for (let i = 0; i < D.P.length; i++) D.P[i].set(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]);
    const b = boxOf(D), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, H = b.my, rm = Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 || 1;
    // the opening first: a pouch's long sides come together along the top (its ends spread a little, the
    // same fabric lying flatter); a bucket bag's top is gathered in
    if (pat.top && H > D.rh * 3) {
      const longX = wideX(b);
      for (const p of D.P) {
        if (p.y <= D.rh * .5) continue;
        const t = Math.min(1, p.y / H);
        if (pat.top === "pinch") { const f = t ** 1.25, sq = 1 - f * .94, wd = 1 + f * .1; if (longX) { p.z = cz + (p.z - cz) * sq; p.x = cx + (p.x - cx) * wd; } else { p.x = cx + (p.x - cx) * sq; p.z = cz + (p.z - cz) * wd; } }
        else { const u = Math.max(0, (t - .7) / .3), f = u * u * (3 - 2 * u), th = Math.atan2(p.z - cz, p.x - cx), k = 1 - f * (.2 + .03 * Math.sin(9 * th)); p.x = cx + (p.x - cx) * k; p.z = cz + (p.z - cz) * k; }
      }
    }
    // a drawn body: its rounds laid on the drawing's own outline - nothing else bends it afterwards
    if (pat.outline && layOnOutline(D, pat.outline, wideX(b), cx, cz)) { if (pat.gravity) drape(D); return; }
    if (pat.depth && pat.depth.length >= 2 && H > D.rh * 3) pressFlat(D, pat.depth, b, cx, cz, H);
    // every yarn a notch softer than its own measure (Kim: 좀만 더 흐물거리게); a stiff one (cord, raffia, jute) stays stiff
    const raw = pat.firm ? 0 : st.soft * 1.25 * (pat.softK ?? 1) * (.6 + .4 * Math.min(2, pat.hookMm / pat.yarnMm));
    const s = Math.max(0, Math.min(1, raw));
    // past fully soft (탄성 turned far up): limp but held up by its top, as if hung on a hook (Kim: it keeps its
    // form, no slumping) - the height stays, the walls fall in at the waist and the bottom sags round under the weight
    const o = Math.max(0, Math.min(1, (raw - 1) / 2));
    if (s < .03) return;
    if (H < D.rh * 3) { // flat: the edge lifts in three soft waves
      const soft = Math.max(0, s - .25) / .75, A = Math.min(D.rh, rm * .07); // soft: 0 for firm yarns (cotton, cord), up to 1 for mohair; A: gentle against the piece's size
      for (const p of D.P) {
        const u = (p.x - cx) / rm, v = (p.z - cz) / rm, k = (Math.hypot(u, v)) ** 2.4;
        const edge = .5 + .5 * Math.sin(3 * Math.atan2(v, u) + 1.3);
        const ripple = (.5 + .5 * Math.sin(u * 3.4 + 1.7) * Math.cos(v * 2.6 + .4)) * (.35 + .65 * Math.max(Math.abs(u), Math.abs(v)));
        // 탄성 turned up (Kim: 무늬 테스트에서도 보이게): a limper piece lies in bigger waves and soft rumples
        const rumple = o * A * 1.6 * Math.sin(u * 5.1 + .6) * Math.cos(v * 4.3 + 1.2) * (.4 + .6 * Math.min(1, k + .2));
        p.y += s * A * (.7 + 1.3 * soft) * (1 + 1.8 * o) * k * edge + soft * A * .9 * (1 + o) * ripple + rumple;
      }
      return;
    }
    const slim = Math.min(1.6, H / (rm * 2)); // a tall, narrow wall gives more
    for (const p of D.P) {
      if (p.y <= D.rh * .5) continue;
      const t = p.y / H, th = Math.atan2(p.z - cz, p.x - cx);
      const k = (1 + s * (.07 * Math.sin(Math.PI * Math.min(1, t * 1.1)) - .055 * t * t) * (.6 + .4 * slim)) * (1 + s * .04 * t * (Math.sin(2 * th + .6) + .5 * Math.sin(3 * th + 2.1)));
      p.x = cx + (p.x - cx) * k; p.z = cz + (p.z - cz) * k; p.y -= s * .075 * t * t * H * (.6 + .4 * slim);
      if (o > 0) {
        // hung: the top edge where it is; the wall drawn in most a little above the middle, with soft folds round it
        const waist = Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * .35), fold = .5 + .5 * Math.sin(5 * th + 1.1);
        const ko = 1 - o * waist * (.13 + .06 * fold);
        p.x = cx + (p.x - cx) * ko; p.z = cz + (p.z - cz) * ko;
      }
    }
    // hung and very soft: the bottom sags into a round under its weight (its middle lowest), the top stays put
    if (o > 0) {
      const hx = (b.x1 - b.x0) / 2 || 1, hz = (b.z1 - b.z0) / 2 || 1;
      for (const p of D.P) {
        const r2 = Math.min(1, ((p.x - cx) / hx) ** 2 + ((p.z - cz) / hz) ** 2), low = Math.max(0, 1 - p.y / (H * .45));
        p.y -= o * Math.min(hx, hz) * .32 * (1 - r2) * low * low;
      }
    }
    // a soft yarn's bag rounds at its bottom (Kim): the bottom's edge comes up and the wall's foot comes in - a U
    // seen from the front, not a box's square corners; the firmer the yarn, the less
    const soft = Math.max(0, s - .25) / .75;
    if (soft > 0) {
      const hx = (b.x1 - b.x0) / 2 || 1, hz = (b.z1 - b.z0) / 2 || 1, foot = Math.min(H * .24, Math.min(hx, hz) * .7), lift = soft * Math.min(foot * .6, Math.min(hx, hz) * .22);
      for (const p of D.P) {
        const r = Math.min(1.2, Math.hypot((p.x - cx) / hx, (p.z - cz) / hz));
        // the bottom: its middle stays down, its edge comes up; the wall's foot comes up and in with it
        const q = p.y <= D.rh * .5 ? Math.min(1, r) ** 3 : p.y < foot ? (1 - p.y / foot) ** 2 : 0;
        if (!q) continue;
        const kin = 1 - soft * .1 * q;
        p.y += lift * q; p.x = cx + (p.x - cx) * kin; p.z = cz + (p.z - cz) * kin;
      }
    }
  }
  // how firmly the yarn holds a shape, 0-1 (Kim: nylon and cord stand, then cotton; the others are limp)
  const firm = () => (st.preset === "cord" || st.preset === "nylon" ? .92 : st.preset === "raffia" || st.preset === "jute" ? .8 : st.preset === "cotton" || st.preset === "linen" || st.preset === "tshirt" ? .5 : Math.max(.06, .3 - st.soft * .3));
  // The piece under its own weight, as animation cloth is settled: every stitch is pulled down, kept at its
  // distance from its neighbours (the fabric neither stretches nor shrinks: the wall has to fold or belly out),
  // kept above the table, and drawn back towards the shape it was made in by as much as the yarn is firm.
  function drape(D: ItemData) {
    const n = D.P.length, G = D.P.map(p => p.clone()), f = firm(), rest = D.E.map(e => G[e[0]].distanceTo(G[e[1]])), d = new THREE.Vector3();
    let H = 0; G.forEach(p => { if (p.y > H) H = p.y; }); if (H < D.rh * 3) return;
    const g = H * .012 * (1 - f) ** 1.2, pull = .02 + .5 * f ** 2, IT_N = 160;
    let cx = 0, cz = 0; G.forEach(p => { cx += p.x; cz += p.z; }); cx /= n; cz /= n;
    for (let it = 0; it < IT_N; it++) {
      for (let i = 0; i < n; i++) { const p = D.P[i], q = G[i]; if (q.y < D.rh * .5) continue; p.y -= g;
        // a wall that is pushed down goes outwards rather than through itself; one side gives first
        const k = g * .35 * (1 + .5 * Math.sin(3 * Math.atan2(q.z - cz, q.x - cx) + q.y)); p.x += (q.x - cx) / (Math.hypot(q.x - cx, q.z - cz) || 1) * k; p.z += (q.z - cz) / (Math.hypot(q.x - cx, q.z - cz) || 1) * k; }
      for (let k = 0; k < 4; k++) for (let e = 0; e < D.E.length; e++) { const ed = D.E[e], a = D.P[ed[0]], b = D.P[ed[1]]; d.subVectors(b, a); const len = d.length() || 1e-6, c = (len - rest[e]) / len * .5; a.addScaledVector(d, c); b.addScaledVector(d, -c); }
      for (let i = 0; i < n; i++) { const p = D.P[i], q = G[i]; p.lerp(q, pull * .12); const lo = q.y * (.42 + .58 * f); if (p.y < lo) p.y = lo; /* folded fabric piles up: it cannot lie thinner than that */ if (q.y < D.rh * .5) { p.y = q.y; } }
    }
  }
  // Every round on the drawn outline (lib/outline): the round's own place among the pattern's rounds gives its
  // width, depth and height; its stitches are spaced evenly round that ellipse, starting where the settled
  // round started and going the way it went (so the stitches still stand over one another).
  function layOnOutline(D: ItemData, o: Outline, longX: boolean, cx: number, cz: number) {
    const cs = D.C.filter(c => c.closed && c.idx.length >= 3); if (cs.length < 3 || o.prof.length < 2 || !(o.prof[0] > 0)) return false;
    const U = 10 / MM, ciMax = Math.max(...cs.map(c => c.ci)), ciMin = Math.min(...cs.map(c => c.ci));
    let turn = 0;
    for (const c of cs) {
      const r = ciMax === ciMin ? 0 : (c.ci - ciMin) / (ciMax - ciMin) * (o.rounds - 1), s = roundSection(o, Math.round(r));
      const n = c.idx.length, p0 = D.P[c.idx[0]], p1 = D.P[c.idx[1]];
      const ang = (p: THREE.Vector3) => longX ? Math.atan2(p.z - cz, p.x - cx) : Math.atan2(p.x - cx, p.z - cz);
      const a0 = ang(p0); let da = ang(p1) - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      if (!turn) turn = da < 0 ? -1 : 1;
      const M = Math.max(n * 4, 96), ring = ellipseRing(s.hw * U, s.hd * U, M), k0 = ((Math.round(a0 / (Math.PI * 2) * M) % M) + M) % M;
      // the settled round's first stitch at its own angle: the ring's point nearest that angle
      let best = k0, bd = 1e9; for (let k = 0; k < M; k++) { const [x, z] = ring[k]; let d = Math.abs(Math.atan2(z, x) - a0); if (d > Math.PI) d = Math.PI * 2 - d; if (d < bd) { bd = d; best = k; } }
      for (let i = 0; i < n; i++) {
        const [u, v] = ring[(((best + turn * Math.round(i * M / n)) % M) + M) % M], q = D.P[c.idx[i]];
        if (longX) { q.x = cx + u; q.z = cz + v; } else { q.z = cz + u; q.x = cx + v; }
        q.y = s.y * U;
      }
    }
    return true;
  }
  // the body pressed to a depth (YarnPattern.depth): at each height its section now (half-width a, half-depth b,
  // read off the stitches there) becomes an ellipse of the asked depth : width with the same round length
  function pressFlat(D: ItemData, depth: number[], b: { x0: number; x1: number; z0: number; z1: number }, cx: number, cz: number, H: number) {
    const longX = wideX(b), NB = 24, u0 = new Array(NB + 1).fill(1e9), u1 = new Array(NB + 1).fill(-1e9), v0 = new Array(NB + 1).fill(1e9), v1 = new Array(NB + 1).fill(-1e9);
    const uv = (p: THREE.Vector3) => longX ? [p.x - cx, p.z - cz] : [p.z - cz, p.x - cx];
    for (const p of D.P) { const k = Math.max(0, Math.min(NB, Math.round(p.y / H * NB))), [u, v] = uv(p); u0[k] = Math.min(u0[k], u); u1[k] = Math.max(u1[k], u); v0[k] = Math.min(v0[k], v); v1[k] = Math.max(v1[k], v); }
    const A = u0.map((x, k) => u1[k] > x ? (u1[k] - x) / 2 : 0), B = v0.map((x, k) => v1[k] > x ? (v1[k] - x) / 2 : 0);
    for (let k = 0; k <= NB; k++) if (!A[k]) { let j = 1; while (j <= NB && !A[k - j] && !A[k + j]) j++; A[k] = A[k - j] || A[k + j] || 0; B[k] = B[k - j] || B[k + j] || 0; }
    const per = (a: number, c: number) => Math.PI * (3 * (a + c) - Math.sqrt((3 * a + c) * (a + 3 * c)));
    const want = (t: number) => { const f = t * (depth.length - 1), i = Math.min(depth.length - 2, Math.floor(f)), r = f - i; return Math.max(.12, Math.min(1, depth[i] + (depth[i + 1] - depth[i]) * r)); };
    for (const p of D.P) {
      const t = Math.max(0, Math.min(1, p.y / H)), f = t * NB, i = Math.min(NB - 1, Math.floor(f)), r = f - i;
      const a = A[i] + (A[i + 1] - A[i]) * r, c = B[i] + (B[i + 1] - B[i]) * r; if (a < 1e-6 || c < 1e-6) continue;
      const k = want(t), a2 = per(a, c) / per(1, k), su = a2 / a, sv = k * a2 / c;
      if (longX) { p.x = cx + (p.x - cx) * su; p.z = cz + (p.z - cz) * sv; } else { p.z = cz + (p.z - cz) * su; p.x = cx + (p.x - cx) * sv; }
    }
  }
  let t0 = 0, hold = 0;
  function startItem() {
    rest = null;
    // 생성 중 (Kim: when it is slow, say so and make it anyway): the screen is told first, and the work waits
    // two frames so the notice is painted before it begins
    opts.onBusy?.(true); hold = 2;
    opts.onInfo(null); t0 = performance.now(); IT.data = makeItem(); lodFor(IT.data.knit ? IT.data.knit.W * IT.data.knit.H * 1.6 : IT.data.P.length * 3.2); // crochet: a head and legs per stitch, about three strands' worth
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
    if (hold > 0) { hold--; return; }
    const big = Math.max(1, D.E.length / 40000), ppf = Math.max(1, Math.round(8 / big)), iters = big > 1 ? Math.max(40, Math.round(150 / big)) : 150;
    if (!D.fixed) { relax(D, ppf); D.iter++; if (holo && holo.parent) updateHolo(D); }
    if (D.iter >= (reduced() ? 1 : iters)) {
      if (!D.fixed && D.iter < iters) relax(D, Math.round(ppf * iters * .75));
      if (D.fixed && !D.form) relax(D, 0); // centre it on the ground (a form is set over its stand already)
      D.done = true;
      rest = new Float32Array(D.P.length * 3); D.P.forEach((q, i) => { rest![i * 3] = q.x; rest![i * 3 + 1] = q.y; rest![i * 3 + 2] = q.z; }); soften(D);
      // the straps' height is known once the yarn is on: the camera, and 생성 중 put away, follow it
      showItem(() => { frameOn(D); opts.onBuilt?.(performance.now() - t0); opts.onBusy?.(false); });
    }
  }
  // ---------- the whole piece in view (opts.fit)
  const HOME = new THREE.Vector3(0, .63, .77).normalize();
  let touched = false; // the reader moved the camera: a resize leaves it alone
  const viewDir = () => { const d = cam.position.clone().sub(ctl.target); return d.lengthSq() > 1e-6 ? d.normalize() : HOME.clone(); };
  /** which way the piece is wide (its face to the front, where the handle's arch and the flap are): a round bottom
   *  is as wide one way as the other, so a hair's difference must not turn it - it always faces front (x); other
   *  shapes take their longer side, x when the two are within 2% */
  const R0 = () => (pat.yarnMm / 2) / MM;
  const wideX = (b: { x0: number; x1: number; z0: number; z1: number }) => pat.shape.kind === "round" || b.x1 - b.x0 >= (b.z1 - b.z0) * .98;
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
    if (job) return; // still being made
    if (anim) cancelAnimationFrame(anim);
    if (reduced()) return;
    // the order it is made (Kim): the body, then the flap (worked on from the back), then the handle - and what is
    // sewn on (단추, 라벨) last, once the piece is whole
    const rank = (m: THREE.Mesh) => m.userData.part === "flap" ? 1 : m.userData.part === "strap" ? 2 : 0;
    const order = [...meshes].sort((a, b) => rank(a) - rank(b));
    if (fz) fz.visible = false; halos.forEach(h => h.visible = false); exObjs.forEach(o => { o.visible = false; });
    const totals = order.map(m => m.geometry.index!.count), sum = totals.reduce((a, b) => a + b, 0); order.forEach(m => m.geometry.setDrawRange(0, 0));
    const s0 = performance.now(), dur = Math.min(9000, 3500 + IT.data.C.length * 60);
    const stepFn = (now: number) => {
      let k = Math.min(1, (now - s0) / dur) * sum;
      order.forEach((m, i) => { const pr = m.geometry.userData.perRing, c = Math.max(0, Math.min(totals[i], k)); m.geometry.setDrawRange(0, Math.floor(c / pr) * pr); k -= totals[i]; });
      if (now - s0 < dur) anim = requestAnimationFrame(stepFn); else { order.forEach(m => m.geometry.setDrawRange(0, Infinity)); if (fz) fz.visible = true; halos.forEach(h => h.visible = true); exObjs.forEach(o => { o.visible = true; }); anim = 0; }
      kick();
    };
    anim = requestAnimationFrame(stepFn);
  }

  // ---------- drawing only when something changes: the shape settling, the camera moving (damping
  // included), the order animation. Nothing runs while it sits still.
  let raf = 0, alive = true, shadowDirty = true, needDraw = true;
  // The very first frame: nothing is drawn until the scene's shaders are put together (compileAsync: in the
  // driver's own thread where the browser can). Drawing with a shader not ready holds the page still until it is -
  // measured 0.9s at the first frame of every viewer
  let compileDirty = true, compiling = false;
  // Turning a heavy piece on a slow graphics card (Kim: 렉은 안 된다): when the frames come slower than ~33 a second
  // while it turns, it is drawn at 0.6 of the resolution for as long as it turns, and sharp again 0.2s after it
  // rests. A piece that turned out slow starts its next turn that way; a new piece is measured anew.
  const fullPR = renderer.getPixelRatio(); let lowRes = false, slowPiece = false, moveT = 0, moveN = 0, ema = 0, restT = 0;
  const setRes = (low: boolean) => { if (low === lowRes) return; lowRes = low; renderer.setPixelRatio(low ? Math.max(.6, fullPR * .6) : fullPR); needDraw = true; };
  const paceAt = new THREE.Vector3();
  function pace(moved: boolean) {
    // turning, as far as this goes: the camera going more than a hair a frame - the glide after the pointer lets go
    // runs on for seconds, slower and slower, and the picture should be sharp again long before it ends
    const d2 = cam.position.distanceToSquared(paceAt), far = cam.position.distanceToSquared(ctl.target); paceAt.copy(cam.position);
    if (!moved || job || d2 < far * 4e-6) { moveN = 0; return; }
    const now = performance.now(), dt = now - moveT; moveT = now;
    if (dt > 250) moveN = 0; // a new turn
    if (moveN++ === 0) { if (slowPiece) setRes(true); }
    else { ema = moveN === 2 ? dt : ema * .7 + dt * .3; if (!lowRes && moveN > 6 && ema > 30) { slowPiece = true; setRes(true); } }
    if (lowRes) { clearTimeout(restT); restT = window.setTimeout(() => { setRes(false); schedule(); }, 220); }
  }
  function frame() {
    raf = 0; if (!alive) return;
    const settling = !!IT.data && !IT.data.done;
    tickItem();
    const building = stepJob();
    const moved = ctl.update(); pace(moved);
    // drawn when something is to be seen anew; while the yarn is only being made, the stage is left as it is
    if (needDraw || settling || moved || anim) {
      if (compileDirty) { compileDirty = false; compiling = true; Promise.race([renderer.compileAsync(scene, cam).catch(() => { /* drawn the usual way */ }), new Promise(res => setTimeout(res, 4000))]).then(() => { compiling = false; camKick(); }); }
      if (compiling) needDraw = true; // not yet: this frame is drawn once the shaders are ready
      else {
        needDraw = false;
        if (shadowDirty || settling || anim) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
        renderer.render(scene, cam); rules(); frameBox();
        if (trash.length) { trash.forEach(disposeTree); trash = []; }
      }
    }
    if (settling || moved || anim) camKick(); else if (building) schedule();
  }
  /** the next frame, nothing asked of it */
  function schedule() { if (alive && !raf) raf = requestAnimationFrame(frame); }
  /** a frame for the camera alone: drawn, the shadow as it is */
  function camKick() { needDraw = true; schedule(); }
  /** a frame after something in the scene changed: the shadow is drawn again too */
  function kick() { shadowDirty = true; camKick(); }
  ctl.addEventListener("change", camKick); ctl.addEventListener("start", () => { touched = true; camKick(); });
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
    // outside the fabric as the screen shows it (Kim: 점선이 편물 안에 침범하지 않도록): past the stitches' outermost
    // points on the screen by the yarn's thickness and its hairs' reach (angora, mohair... reach far), and a gap
    const reach = yarnR(D) * (1 + 1.4 * (.35 + Math.min(6, fuzzOf())) * st.hair * hk()) , q0 = px(b.x1, 0, b.z1), q1 = px(b.x1 + reach, 0, b.z1);
    const mPx = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) + 10;
    let sx = -1e9, sy = -1e9; D.P.forEach(v => { const [x, y] = px(v.x, v.y, v.z); if (x > sx) sx = x; if (y > sy) sy = y; });
    const w0 = out[0], dy = Math.max(0, sy + mPx - Math.min(w0.y1, w0.y2)); w0.y1 += dy; w0.y2 += dy;
    const h0 = out[1], dx = Math.max(0, sx + mPx - Math.min(h0.x1, h0.x2)); h0.x1 += dx; h0.x2 += dx;
    const key = out.map(o => [o.x1, o.y1, o.x2, o.y2, o.cm].map(Math.round).join()).join(";");
    if (key !== lastRule) { lastRule = key; opts.onRuler(out); }
  }
  // ---------- 크기 틀: the box round the piece's body as the screen shows it (its handles are drawn by the page)
  let boxOn = false, lastFrame = "";
  function frameBox() {
    const D = IT.data; if (!boxOn || !opts.onFrame || !D || !D.done) { if (lastFrame) { lastFrame = ""; opts.onFrame?.(null); } return; }
    const b = boxOf(D), v = new THREE.Vector3(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const x of [b.x0, b.x1]) for (const y of [0, b.my]) for (const z of [b.z0, b.z1]) { v.set(x, y, z).project(cam); const sx = (v.x + 1) / 2 * lastW, sy = (1 - v.y) / 2 * lastH; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    const out: [number, number, number, number] = [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)], key = out.join();
    if (key !== lastFrame) { lastFrame = key; opts.onFrame(out); }
  }
  let lastW = 0, lastH = 0;
  const resize = () => {
    // the book's pages are zoomed (CSS zoom): the drawn size is the box on the screen
    const r = canvas.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height); if (!w || !h || (w === lastW && h === lastH)) return;
    lastW = w; lastH = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); kick();
    if (opts.fit && !touched && IT.data && !(pat.focus === "fabric" && IT.data.knit)) fitAll(IT.data, viewDir());
  };
  // ---------- dragging 단추 / 라벨 (Kim: moved freely on the piece). Pressed on one, the camera holds still and
  // the thing follows the pointer: the stitch nearest the pointer on the side facing the camera says where.
  // Only the thing moves while dragging (the yarn is not built again); where it was let go goes back to the
  // page (onExtraMove), which puts it there for good.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const ndcOf = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); };
  const hitExtra = (e: PointerEvent) => { if (!exObjs.length || job) return null; ndcOf(e); ray.setFromCamera(ndc, cam); const h = ray.intersectObjects(exObjs, true)[0]; let o: THREE.Object3D | null = h?.object ?? null; while (o && !o.userData.extra) o = o.parent; return o; };
  const spotOf = (e: PointerEvent): [number, number] | null => {
    const D = IT.data; if (!D?.P.length) return null; ndcOf(e);
    const b = boxOf(D), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, v = new THREE.Vector3(); let best: THREE.Vector3 | null = null, bd = 1e9;
    for (const q of D.P) {
      // the side facing the camera only
      if ((q.x - cx) * (cam.position.x - q.x) + (q.z - cz) * (cam.position.z - q.z) <= 0) continue;
      v.copy(q).project(cam); const d = (v.x - ndc.x) ** 2 + (v.y - ndc.y) ** 2; if (d < bd) { bd = d; best = q; }
    }
    if (!best || !b.my) return null;
    const a = Math.atan2(best.x - cx, best.z - cz) / (Math.PI * .42);
    return [Math.max(-1, Math.min(1, a)), Math.max(.05, Math.min(1, best.y / b.my))];
  };
  let hoverK: string | null = null;
  let dragO: THREE.Object3D | null = null, dragAt: [number, number] | null = null, downXY: [number, number] = [0, 0];
  const exDown = (e: PointerEvent) => {
    if (!opts.onExtraMove || e.button !== 0) return; const o = hitExtra(e); if (!o || !exPlace) return;
    e.stopImmediatePropagation(); e.preventDefault(); dragO = o; dragAt = null; downXY = [e.clientX, e.clientY]; ctl.enabled = false; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing";
    opts.onExtraGrab?.(); // pressed: straight into moving it (Kim) - the screen puts its tools away
  };
  const exMove = (e: PointerEvent) => {
    if (!dragO) {
      if (opts.onExtraMove && e.buttons === 0) { const o = hitExtra(e); canvas.style.cursor = o ? "grab" : ""; if (o && o.userData.extra !== hoverK) opts.onExtraHover?.(o.userData.extra, e.clientX, e.clientY); else if (!o && hoverK) opts.onExtraHover?.(null, e.clientX, e.clientY); hoverK = o ? o.userData.extra : null; }
      return;
    }
    if (!dragAt && Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) < 4) return; // a press, not yet a drag
    const s = spotOf(e); if (!s || !exPlace) return; dragAt = s; exPlace(dragO, s[0], s[1]); kick();
  };
  const exUp = (e: PointerEvent) => {
    if (!dragO) return; const k = dragO.userData.extra as string, at = dragAt;
    dragO = null; dragAt = null; ctl.enabled = true; canvas.style.cursor = ""; try { canvas.releasePointerCapture(e.pointerId); } catch { /* gone */ }
    if (at) opts.onExtraMove?.(k, Math.round(at[0] * 100) / 100, Math.round(at[1] * 100) / 100);
    else opts.onExtraPick?.(k, e.clientX, e.clientY); // pressed and let go: picked, to be made bigger or smaller
  };
  canvas.addEventListener("pointerdown", exDown, true); canvas.addEventListener("pointermove", exMove); canvas.addEventListener("pointerup", exUp); canvas.addEventListener("pointercancel", exUp);

  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  ctl.target.set(0, 0, 0); fit();
  startItem();

  // what changes the shape (counts, yarn and hook, strap): anything else is colour
  // the stitch pattern of a knitted piece changes its yarn, not its shape
  // (a strap is put on with the yarn: its length and width do not settle the shape again)
  // (a form is named by its key: its thousands of places are not written out to be compared)
  const shapeKey = (p: YarnPattern) => JSON.stringify([p.shape.kind === "form" ? p.shape.key : { ...p.shape, stitch: undefined }, p.yarnMm, p.hookMm, p.stand ? [p.stand.kind, p.stand.fitTo, p.stand.prof.length, p.stand.prof[p.stand.prof.length - 1]] : null]);
  return {
    setPattern(p) {
      const reshape = shapeKey(p) !== shapeKey(pat), mat = p.material !== pat.material, refocus = p.focus !== pat.focus;
      if (p.shape.kind !== pat.shape.kind) { framed = false; touched = false; }
      const zk = (q: YarnPattern) => JSON.stringify([q.softK ?? 1, q.topFold ?? null, q.topGap ?? null, !!q.extras?.zipper, q.extras?.zipOpen ?? 0, !!q.flap]);
      const retop = zk(p) !== zk(pat) || p.top !== pat.top || p.gravity !== pat.gravity || JSON.stringify(p.outline ?? null) !== JSON.stringify(pat.outline ?? null) || JSON.stringify(p.depth ?? null) !== JSON.stringify(pat.depth ?? null); // another kind of piece: the camera starts over
      const heldCh = p.marlMat !== pat.marlMat;
      pat = p;
      if (mat || heldCh) { Object.assign(st, presetOf(p.material)); withHeld(); }
      if (reshape) startItem();
      else if (IT.data?.done) {
        // colour, material or stitch pattern: the yarn again, the shape as it is (a softer yarn gives more). A big
        // piece takes a moment: 생성 중 is shown first and the work starts once it is on the screen
        const D = IT.data, big = D.P.length > 1500 && !!opts.onBusy;
        // the yarn is made over the coming frames (the piece as it was stays on the stage meanwhile): no waiting for
        // 생성 중 to be painted first, as when the making held the page still
        if (big) opts.onBusy!(true);
        if (mat || retop) soften(D);
        showItem(() => { if (refocus) frameOn(D); else if (opts.fit && framed && needsFit(D) && !(pat.focus === "fabric" && D.knit)) fitAll(D, viewDir()); opts.onBusy?.(false); });
      }
    },
    setMaterial(m) {
      if (m === st.preset) return;
      Object.assign(st, presetOf(m));
      if (IT.data?.done) { soften(IT.data); showItem(); }
    },
    setView(v) { IT.view = v; if (IT.data) showItem(); },
    playDraw,
    zoom(f) { const v = cam.position.clone().sub(ctl.target), l = Math.min(ctl.maxDistance, Math.max(ctl.minDistance, v.length() * f)); cam.position.copy(ctl.target).addScaledVector(v.normalize(), l); touched = true; ctl.update(); camKick(); },
    home() { touched = false; framed = true; if (IT.data) { cam.position.copy(ctl.target).addScaledVector(HOME, 10); wasFab = false; if (opts.fit) fitAll(IT.data, HOME.clone()); else frameOn(IT.data); } },
    viewShot() {
      // the view as it is now, at the canvas's own size (checking how the stitches look up close)
      setRes(false); renderer.render(scene, cam); return renderer.domElement.toDataURL("image/jpeg", .82);
    },
    snapshot() {
      const D = IT.data; if (!D?.done || job) return null; // not while the yarn is being made (the stage shows what was there before)
      const pos = cam.position.clone(), tgt = ctl.target.clone(); setRes(false);
      fitAll(D, new THREE.Vector3(0, .1, 1)); renderer.render(scene, cam);
      const big = renderer.domElement, k = Math.min(1, 560 / Math.max(big.width, big.height)), c = document.createElement("canvas");
      c.width = Math.round(big.width * k); c.height = Math.round(big.height * k);
      const x = c.getContext("2d")!; x.fillStyle = "#F6F0E4"; x.fillRect(0, 0, c.width, c.height); x.drawImage(big, 0, 0, c.width, c.height);
      cam.position.copy(pos); ctl.target.copy(tgt); ctl.update(); kick();
      return c.toDataURL("image/jpeg", .86);
    },
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
    setFrame(on) { boxOn = on; kick(); },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); clearGroup(); job = null; trash.forEach(disposeTree); trash = []; ctl.dispose(); // (a half-made piece is `group`, just cleared; what it was to replace is still in the scene, let go below)
      canvas.removeEventListener("pointerdown", exDown, true); canvas.removeEventListener("pointermove", exMove); canvas.removeEventListener("pointerup", exUp); canvas.removeEventListener("pointercancel", exUp);
      scene.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mt = m.material as THREE.Material | undefined; if (mt) mt.dispose(); });
      pics.forEach(t => t.dispose()); WARM_GEO.dispose(); warmRT.dispose(); warmMat.dispose(); FTEX.dispose(); HTEX.dispose(); envSrc.dispose(); ENV?.dispose(); pmrem.dispose(); holoMats.forEach(m => m.dispose()); clearTimeout(restT); sun.shadow.map?.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
