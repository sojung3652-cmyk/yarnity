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

export type YarnMaterial = "cotton" | "wool" | "mohair" | "cord" | "fur" | "metal";
export type YarnStrap = "none" | "two" | "long";
/** what is drawn, in the pattern's own counts (stitches per course, bottom first) */
export type YarnShape =
  | { kind: "round"; counts: number[]; flat: number }                       // magic ring; `flat` = rounds that lie flat (the bottom)
  | { kind: "oval"; chain: number; bottom: number[]; body: number[] }        // around a base chain, then a body (wall)
  | { kind: "rect"; chain: number; bottom: number[]; body: number[] }
  | { kind: "rows"; W: number; H: number; wCm: number; hCm: number; knit: boolean } // back and forth (knit: stockinette)
  | { kind: "tube"; W: number; H: number; circCm: number; hCm: number };   // in the round, no bottom
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
}
export interface YarnInfo { round: boolean; widthCm: number; depthCm: number; heightCm: number | null; fit: string; skip: { stitch: number; row: number } | null }
export interface YarnViewer {
  setPattern(p: YarnPattern): void;
  setMaterial(m: YarnMaterial): void;
  setView(v: "yarn" | "holo"): void;
  playDraw(): void;
  dispose(): void;
}
export interface ViewerOpts { phone: boolean; detail?: "full" | "page"; onInfo: (i: YarnInfo | null) => void; onBuilt?: (ms: number) => void }

interface Preset { plies: number; twist: number; fuzz: number; depth: number; braid: boolean; rough: number }
export const PRE: Record<YarnMaterial, Preset> = {
  cotton: { plies: 4, twist: 1, fuzz: .05, depth: .3, braid: false, rough: .8 },
  wool: { plies: 3, twist: .8, fuzz: .4, depth: .26, braid: false, rough: .96 },
  mohair: { plies: 2, twist: .5, fuzz: 1, depth: .16, braid: false, rough: 1 },
  cord: { plies: 8, twist: 1.3, fuzz: 0, depth: .2, braid: true, rough: .68 },
  fur: { plies: 2, twist: .6, fuzz: 1, depth: .12, braid: false, rough: 1 },
  metal: { plies: 3, twist: 1.5, fuzz: 0, depth: .3, braid: false, rough: .3 },
};

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
  scene.add(new THREE.HemisphereLight(lin(0xfffaf2), lin(0xd8c4a8), 0.78 * Math.PI));
  const sun = new THREE.DirectionalLight(lin(0xfff6ea), 0.95 * Math.PI); sun.position.set(7, 9, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(page ? 1024 : 2048, page ? 1024 : 2048); const sc = sun.shadow.camera; sc.near = 1; sun.shadow.bias = -0.0006; sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(lin(0xf2e9df), 0.16 * Math.PI); fill.position.set(-8, -2, 6); scene.add(fill);
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
  const st = { preset: pat.material, thick: 1, ...PRE[pat.material], fur: pat.material === "fur", metal: pat.material === "metal" ? .85 : 0 };
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
  const fuzzCap = () => page ? (st.fur ? 5_000 : 8_000) : opts.phone ? (st.fur ? 9_000 : 14_000) : 60_000;

  function yarnMat(R: number) {
    return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: st.rough, metalness: st.metal, envMap: st.metal ? ENV : null, envMapIntensity: 1.25, bumpMap: FTEX, bumpScale: R * .05 });
  }

  // ---------- yarn: centre line (points) -> twisted ply surface
  function buildYarn(pts: THREE.Vector3[], R: number, o: { M?: number; closed?: boolean; color: string }) {
    const n = pts.length, M = o.M || Math.max(14, st.plies * 6), N = o.M ? Math.min(st.plies, Math.floor(o.M / 4)) : st.plies, tau = st.twist * 0.75 / R, K = 3;
    const pos = new Float32Array(n * (M + 1) * 3), col = new Float32Array(n * (M + 1) * 3), uv = new Float32Array(n * (M + 1) * 2), frames: { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3; s: number }[] = [];
    const T = new THREE.Vector3(), Nv = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3();
    let s = 0; const base = new THREE.Color(o.color); // already linear in r187 (no convertSRGBToLinear)
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
        const e = o.closed ? 1 : Math.min(1, Math.sqrt(1 - Math.pow(1 - Math.min(i, n - 1 - i, K) / K, 2)) + .02); const r = R * (1 - st.depth + st.depth * f) * e, k = (i * (M + 1) + j);
        const cx = Math.cos(ph) * r, sx = Math.sin(ph) * r;
        pos[k * 3] = pts[i].x + Nv.x * cx + B.x * sx; pos[k * 3 + 1] = pts[i].y + Nv.y * cx + B.y * sx; pos[k * 3 + 2] = pts[i].z + Nv.z * cx + B.z * sx;
        const sh = .55 + .45 * f; col[k * 3] = base.r * sh; col[k * 3 + 1] = base.g * sh; col[k * 3 + 2] = base.b * sh;
        uv[k * 2] = s / (R * 7); uv[k * 2 + 1] = j / M * Math.max(1, N) - tau * s / (Math.PI * 2) * Math.max(1, N) * (st.braid ? 0 : 1);
      }
    }
    const idx: number[] = []; for (let i = 0; i < n - 1; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    g.userData = { frames, R, perRing: M * 6, color: o.color }; return g;
  }

  function fuzzLines(geos: THREE.BufferGeometry[]) {
    if (st.fuzz <= 0.01 || !geos.length) return null;
    const v: number[] = [], col: number[] = [], cc = new THREE.Color(), WH = lin(0xffffff); const d = new THREE.Vector3(), p = new THREE.Vector3(), jit = new THREE.Vector3();
    const per = (g: THREE.BufferGeometry) => { const fr = g.userData.frames; return fr[fr.length - 1].s / g.userData.R * st.fuzz * (st.fur ? 46 : 26); };
    const raw = geos.reduce((a, g) => a + per(g), 0), scale = Math.min(1, fuzzCap() / Math.max(1, raw));
    geos.forEach(g => {
      const fr = g.userData.frames, R = g.userData.R, count = Math.floor(per(g) * scale);
      // fur: the proper colour; the light fuzz: the prototype used the sRGB numbers as linear (lighter), so do the same
      cc.set(g.userData.color); if (!st.fur) { cc.convertLinearToSRGB(); cc.lerp(WH, .35); }
      for (let k = 0; k < count; k++) {
        const f = fr[Math.random() * fr.length | 0], ph = Math.random() * 6.283, c = Math.cos(ph), s = Math.sin(ph);
        d.set(0, 0, 0).addScaledVector(f.n, c).addScaledVector(f.b, s); p.copy(f.p).addScaledVector(d, R * .8);
        const L = R * (.25 + Math.random() * Math.random() * 2.2) * (.35 + st.fuzz) * (st.fur ? 3.4 : 1);
        d.addScaledVector(f.t, (Math.random() - .5) * 1.6).add(jit.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(.5)).normalize();
        v.push(p.x, p.y, p.z, p.x + d.x * L, p.y + d.y * L, p.z + d.z * L);
        const br = st.fur ? .5 + Math.random() * .5 : 1, k0 = st.fur ? .5 : .9;
        col.push(cc.r * br * k0, cc.g * br * k0, cc.b * br * k0, cc.r * br, cc.g * br, cc.b * br);
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: st.fur ? .6 : .22, depthWrite: false }));
  }

  // ---------- pattern -> 3D: stitch = point, joins = springs (the shape comes from the counts alone)
  function makeItem(): ItemData {
    const s = pat.shape, rh = (pat.yarnMm + pat.hookMm) / MM, sw = 2 * Math.PI * rh / 6;
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
        C.push({ idx, closed: true, bot, ci: ci++ }); prev = idx;
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
        ring(idx, true); C.push({ idx, closed: true, bot: linkNear(idx, prev, pcl), ci: ci++ }); prev = idx; pcl = true;
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
        ring(idx, true); C.push({ idx, closed: true, bot: linkFrac(idx, prev), ci: ci++ }); prev = idx;
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

    let knit: Knit | null = null, fixed = false, skip: ItemData["skip"] = null, rhOut = rh, swOut = sw;
    if (s.kind === "round") round(s.counts, s.flat);
    else if (s.kind === "oval" || s.kind === "rect") { const b = aroundChain(s.chain, s.bottom, s.kind === "oval" ? stad : rectPath); if (s.body.length) wall(b, s.body); }
    else if (s.kind === "rows") {
      const k = skipOf(s.W, s.H), W = Math.max(2, Math.round(s.W / k)), H = Math.max(2, Math.round(s.H / k));
      const ex = s.wCm * 10 / MM / W, ey = s.hCm * 10 / MM / H, swap = s.hCm > s.wCm;
      fixed = true; skip = k > 1 ? { stitch: k, row: k } : null; rhOut = ey; swOut = ex;
      rows(W, H, ex, ey, swap, midCi(k, s.H));
      if (s.knit) knit = { type: "flat", W, H, swap, wk: ex, rk: ey, rho: 0, R: 0 };
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

  let meshes: THREE.Mesh[] = [], fz: THREE.LineSegments | null = null, anim = 0, strapH = 0;
  const yarnR = (D: ItemData) => {
    const R = pat.yarnMm / 2 / MM * st.thick * (st.preset === "mohair" ? .8 : 1);
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
      [saw, tops].forEach((arr, ix) => {
        if (arr.length < 3) return; const cv = new THREE.CatmullRomCurve3(arr, c.closed, "catmullrom", .5), Rr = ix ? R * .9 : R;
        const pts = cv.getSpacedPoints(Math.max(24, Math.ceil(cv.getLength() / (Rr * .75 * step))));
        const g = buildYarn(pts, Rr, { M, closed: c.closed, color: colorOf(c.ci) }), m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; group.add(m); meshes.push(m); geos.push(g);
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
        [-1, 0, 1].forEach(k => {
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= 40; i++) { const t = i / 40, q = A.clone().lerp(B, t); q.y += H * Math.sin(Math.PI * t) - R * 1.2 * (1 - Math.sin(Math.PI * t)); q.addScaledVector(nrm, k * R * 1.75 + lean * rr * .12 * Math.sin(Math.PI * t)); pts.push(q); }
          const cv = new THREE.CatmullRomCurve3(pts), g = buildYarn(cv.getSpacedPoints(Math.ceil(cv.getLength() / (R * .6 * step))), R, { M, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
        });
      });
    }
    fz = fuzzLines(geos); if (fz) group.add(fz);
  }
  // knitted stockinette: one row = one strand of joined loops (the prototype's buildKnit)
  function buildKnit(D: ItemData, R: number, mat: THREE.Material, geos: THREE.BufferGeometry[]) {
    const K = D.knit!, w = K.wk, Hh = 1.05 * w, a = .22 * w, d = Math.min(R, w * .3), per = page ? 10 : 14, q = Math.round(per * .25), rowC = D.C;
    for (let j = 0; j < K.H; j++) {
      const pts: THREE.Vector3[] = [], tb = K.type === "tube";
      for (let i = tb ? 0 : -q; i < (tb ? K.W * per : K.W * per + q + 1); i++) {
        const u = i / per, ac = w * u + a * Math.sin(4 * Math.PI * u), lp = (Hh / 2) * Math.cos(2 * Math.PI * u), dz = d * Math.cos(4 * Math.PI * u);
        if (tb) { const th = ac / K.rho, r = K.rho - dz; pts.push(new THREE.Vector3(Math.cos(th) * r, j * K.rk - lp + Hh / 2, Math.sin(th) * r)); }
        else { const al = (j - (K.H - 1) / 2) * K.rk - lp, x = ac - K.W * w / 2, y = d - dz; pts.push(K.swap ? new THREE.Vector3(al, y, x) : new THREE.Vector3(x, y, al)); }
      }
      const cv = new THREE.CatmullRomCurve3(pts, tb), g = buildYarn(cv.getSpacedPoints(Math.ceil(cv.getLength() / (R * .6 * LOD.step))), R, { M: Math.min(8, LOD.M), closed: tb, color: colorOf(rowC[j]?.ci ?? j) }), m = new THREE.Mesh(g, mat);
      m.castShadow = true; m.receiveShadow = true; group.add(m); meshes.push(m); geos.push(g);
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
    opts.onInfo({ round, widthCm: cm(Math.max(dx, dz)), depthCm: cm(Math.min(dx, dz)), heightCm: h, fit, skip: D.skip });
    return { my, mr: Math.max(dx, dz) / 2 };
  }
  function clearGroup() {
    if (anim) { cancelAnimationFrame(anim); anim = 0; }
    group.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; if (mt) (Array.isArray(mt) ? mt : [mt]).forEach(x => x.dispose()); });
    while (group.children.length) group.remove(group.children[0]);
    meshes = []; fz = null; holo = null;
  }
  function showItem() {
    const D = IT.data!; clearGroup();
    if (IT.view === "yarn" && D.done) buildItemYarn(D); else { holo = buildHolo(D); updateHolo(D); group.add(holo); }
    kick();
  }
  let t0 = 0;
  function startItem() {
    opts.onInfo(null); t0 = performance.now(); IT.data = makeItem(); lodFor(IT.data.knit ? IT.data.knit.W * IT.data.knit.H * 1.6 : IT.data.P.length);
    if (IT.data.fixed) IT.data.iter = 1e9; // a known shape: nothing to settle
    showItem();
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
      const z = sizeInfo(D);
      showItem(); // the straps' height is known once the yarn is on
      const tot = z.my + strapH, ext = Math.max(z.mr * 2, tot);
      // the angle the reader turned it to stays; the distance follows the piece. The target sits a little
      // below the middle so the piece stands clear of the labels along the bottom
      const dir = cam.position.clone().sub(ctl.target).normalize(); ctl.target.set(0, tot * .32, 0);
      const dist = (ext * (st.fur ? 2.45 : z.my < D.rh * 3 ? 1.6 : 2.1) + 3) * 1.25; cam.position.copy(ctl.target).addScaledVector(dir, dist); ctl.maxDistance = Math.max(40, dist * 2.2);
      setShadow(Math.max(10, ext * 1.4)); fit(); opts.onBuilt?.(performance.now() - t0);
    }
  }
  // 뜨는 순서: the yarn grows course by course (draw range over the meshes, which are in course order);
  // in the structure view the shape is worked out again from the start, as in the prototype
  function playDraw() {
    if (IT.view === "holo" || !IT.data?.done) { startItem(); return; }
    if (anim) cancelAnimationFrame(anim);
    if (reduced()) return;
    if (fz) fz.visible = false; const totals = meshes.map(m => m.geometry.index!.count), sum = totals.reduce((a, b) => a + b, 0); meshes.forEach(m => m.geometry.setDrawRange(0, 0));
    const s0 = performance.now(), dur = Math.min(9000, 3500 + IT.data.C.length * 60);
    const stepFn = (now: number) => {
      let k = Math.min(1, (now - s0) / dur) * sum;
      meshes.forEach((m, i) => { const pr = m.geometry.userData.perRing, c = Math.max(0, Math.min(totals[i], k)); m.geometry.setDrawRange(0, Math.floor(c / pr) * pr); k -= totals[i]; });
      if (now - s0 < dur) anim = requestAnimationFrame(stepFn); else { meshes.forEach(m => m.geometry.setDrawRange(0, Infinity)); if (fz) fz.visible = true; anim = 0; }
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
    renderer.render(scene, cam);
    if (settling || moved || anim) kick();
  }
  function kick() { if (alive && !raf) raf = requestAnimationFrame(frame); }
  ctl.addEventListener("change", kick); ctl.addEventListener("start", kick);
  let lastW = 0, lastH = 0;
  const resize = () => {
    // the book's pages are zoomed (CSS zoom): the drawn size is the box on the screen
    const r = canvas.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height); if (!w || !h || (w === lastW && h === lastH)) return;
    lastW = w; lastH = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); kick();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  ctl.target.set(0, 0, 0); fit();
  startItem();

  // what changes the shape (counts, yarn and hook, strap): anything else is colour
  const shapeKey = (p: YarnPattern) => JSON.stringify([p.shape, p.yarnMm, p.hookMm, p.strap, p.strapCm]);
  return {
    setPattern(p) {
      const reshape = shapeKey(p) !== shapeKey(pat), mat = p.material !== pat.material;
      pat = p;
      if (mat) Object.assign(st, PRE[p.material], { preset: p.material, fur: p.material === "fur", metal: p.material === "metal" ? .85 : 0 });
      if (reshape) startItem();
      else if (IT.data?.done) showItem(); // colour or material: the yarn again, the shape as it is
    },
    setMaterial(m) {
      if (m === st.preset) return;
      Object.assign(st, PRE[m], { preset: m, fur: m === "fur", metal: m === "metal" ? .85 : 0 });
      if (IT.data?.done) showItem();
    },
    setView(v) { IT.view = v; if (IT.data) showItem(); },
    playDraw,
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); clearGroup(); ctl.dispose();
      scene.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mt = m.material as THREE.Material | undefined; if (mt) mt.dispose(); });
      FTEX.dispose(); envSrc.dispose(); ENV.dispose(); sun.shadow.map?.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
