// Yarn engine: a finished round pattern (coaster, bag) as one strand of twisted yarn in 3D.
// Ported from docs/yarn-engine-prototype.html (three.js r128, global script) to three r187, React-free.
// Taken over: buildYarn, fuzzLines, yarnMat, fiberTex, ENV, makeItem, relax, buildHolo, updateHolo,
// buildItemYarn, sizeInfo, tickItem, playDraw and the material presets PRE. Left out: the knitting /
// chain / single-strand demo scenes (knitRows, chainPath, strandPath).
// Changes from the prototype:
//  - makeItem takes the pattern's own stitch counts per round (the prototype made up 9 rounds / 7+12)
//  - every round has its own colour (rounds[r].color); the 2-round stripe logic is gone
//  - colour management: r187 converts hex colours to linear by itself, so the prototype's
//    convertSRGBToLinear() calls are dropped (they would convert twice and darken the yarn). Where the
//    prototype handed a hex to three r128 *unconverted* (lights, line colours, the shadow tint, the white
//    fuzz), r128 used the number as linear; lin() does the same here so the colours match the prototype.
//  - lights: r155+ has no legacy light scale, so the prototype's intensities are multiplied by PI to light
//    the same. NoToneMapping stays (ACES greys the colours).
//  - detail drops with the total stitch count (tube sides, points per stitch, fuzz), and further on phones.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type YarnMaterial = "cotton" | "wool" | "mohair" | "cord" | "fur" | "metal";
export type YarnStrap = "none" | "two" | "long";
export interface YarnPattern {
  rounds: { count: number; color: string }[];
  yarnMm: number;
  hookMm: number;
  strap: YarnStrap;
  material: YarnMaterial;
}
export interface YarnInfo { diameterCm: number; heightCm: number | null; fit: string }
export interface YarnViewer {
  setMaterial(m: YarnMaterial): void;
  setView(v: "yarn" | "holo"): void;
  playDraw(): void;
  dispose(): void;
}
export interface ViewerOpts { phone: boolean; onInfo: (i: YarnInfo | null) => void; onBuilt?: (ms: number) => void }

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

type Edge = [number, number, number, number];
interface ItemData { P: THREE.Vector3[]; E: Edge[]; counts: number[]; start: number[]; rh: number; sw: number; iter: number; done: boolean }

export function createYarnViewer(canvas: HTMLCanvasElement, pat: YarnPattern, opts: ViewerOpts): YarnViewer | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 400); cam.position.set(0, 11, 13.5);
  const ctl = new OrbitControls(cam, canvas); ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.enablePan = false; ctl.minDistance = 3; ctl.maxDistance = 40;
  // light from the upper right -> shadows fall to the lower left
  scene.add(new THREE.HemisphereLight(lin(0xfffaf2), lin(0xd8c4a8), 0.78 * Math.PI));
  const sun = new THREE.DirectionalLight(lin(0xfff6ea), 0.95 * Math.PI); sun.position.set(7, 9, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 40; sun.shadow.bias = -0.0006; sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(lin(0xf2e9df), 0.16 * Math.PI); fill.position.set(-8, -2, 6); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: lin(0x5a4632), opacity: .2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.3; ground.receiveShadow = true; scene.add(ground);
  const group = new THREE.Group(); scene.add(group);

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

  const st = { preset: pat.material, thick: 1, ...PRE[pat.material], fur: pat.material === "fur", metal: pat.material === "metal" ? .85 : 0 };
  const IT = { view: "yarn" as "yarn" | "holo", data: null as ItemData | null, strap: pat.strap, ymm: pat.yarnMm, hmm: pat.hookMm };

  // ---------- level of detail from the total stitch count
  const total = pat.rounds.reduce((a, r) => a + r.count, 0);
  const VERT_BUDGET = opts.phone ? 500_000 : 1_400_000, BASE_VPS = 187; // ~17 points x 11 ring vertices per stitch at full detail
  const want = VERT_BUDGET / Math.max(1, total);
  const LOD = want >= BASE_VPS ? { M: 10, step: 1 } : { M: want >= BASE_VPS * .6 ? 8 : 6, step: 1 };
  if (want < BASE_VPS) LOD.step = Math.min(4, Math.max(1, (17 * (LOD.M + 1)) / want));
  const FUZZ_CAP = opts.phone ? (st.fur ? 9_000 : 14_000) : 60_000;

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
    if (st.fuzz <= 0.01) return null;
    const v: number[] = [], col: number[] = [], cc = new THREE.Color(), WH = lin(0xffffff); const d = new THREE.Vector3(), p = new THREE.Vector3(), jit = new THREE.Vector3();
    const per = (g: THREE.BufferGeometry) => { const fr = g.userData.frames; return fr[fr.length - 1].s / g.userData.R * st.fuzz * (st.fur ? 46 : 26); };
    const raw = geos.reduce((a, g) => a + per(g), 0), scale = Math.min(1, FUZZ_CAP / Math.max(1, raw));
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
    const rh = (IT.ymm + IT.hmm) / MM, sw = 2 * Math.PI * rh / 6, counts = pat.rounds.map(r => Math.max(1, Math.round(r.count)));
    const P = [new THREE.Vector3(0, 0, 0)], start: number[] = [], E: Edge[] = []; let rho = 0, y = 0;
    counts.forEach((c, r) => {
      start.push(P.length); const cr = c * sw / (2 * Math.PI); let amp = 0;
      if (cr <= rho + rh) { const dr = Math.max(-rh * .98, cr - rho); y += Math.sqrt(Math.max(0, rh * rh - dr * dr)); rho = Math.max(.05, cr); }
      else { rho += rh; const q = c * sw / (2 * Math.PI * rho); amp = rho / 6 * Math.sqrt(Math.max(0, 2 * (q * q - 1))); }
      for (let i = 0; i < c; i++) { const th = (i + .5) / c * 2 * Math.PI; P.push(new THREE.Vector3(Math.cos(th) * rho, y + amp * Math.sin(6 * th) + (Math.random() - .5) * .01, Math.sin(th) * rho)); }
      const s0 = start[r];
      for (let i = 0; i < c; i++) { E.push([s0 + i, s0 + (i + 1) % c, sw, 1]); if (c >= 6) E.push([s0 + i, s0 + (i + 2) % c, 2 * cr * Math.sin(2 * Math.PI / c), .3]); }
      if (r === 0) { for (let i = 0; i < c; i++) E.push([s0 + i, 0, Math.max(cr, .2), 1]); }
      else {
        const pc = counts[r - 1], ps = start[r - 1];
        for (let i = 0; i < c; i++) {
          const f = (i + .5) / c * pc, p = Math.floor(f), fr = f - p - .5, q = fr >= 0 ? p + 1 : p - 1;
          E.push([s0 + i, ps + ((p % pc) + pc) % pc, Math.hypot(rh, fr * sw), 1]); E.push([s0 + i, ps + ((q % pc) + pc) % pc, Math.hypot(rh, (1 - Math.abs(fr)) * sw), .35]);
        }
      }
    });
    return { P, E, counts, start, rh, sw, iter: 0, done: false };
  }
  function relax(D: ItemData, passes: number) {
    const d = new THREE.Vector3();
    for (let k = 0; k < passes; k++) for (let e = 0; e < D.E.length; e++) { const ed = D.E[e], a = D.P[ed[0]], b = D.P[ed[1]]; d.subVectors(b, a); const len = d.length() || 1e-6, c = (len - ed[2]) / len * .5 * ed[3]; a.addScaledVector(d, c); b.addScaledVector(d, -c); }
    const o = D.P[0].clone(); D.P.forEach(p => { p.x -= o.x; p.z -= o.z; });
    let miny = 1e9; D.P.forEach(p => { if (p.y < miny) miny = p.y; }); D.P.forEach(p => { p.y -= miny; });
  }
  let holo: THREE.Group | null = null;
  function buildHolo(D: ItemData) {
    const n = D.P.length, pos = new Float32Array(n * 3); const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const ring: number[] = [], vert: number[] = []; D.E.forEach(e => { if (e[3] === 1) (e[2] === D.sw ? ring : vert).push(e[0], e[1]); });
    const mk = (idx: number[], color: number, op: number) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", pg.getAttribute("position")); g.setIndex(idx); return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: lin(color), transparent: true, opacity: op })); };
    const lc = D.counts[D.counts.length - 1], last = D.start[D.start.length - 1], hi: number[] = []; for (let i = 0; i < lc; i++) hi.push(last + i, last + (i + 1) % lc);
    const g = new THREE.Group(); g.add(mk(vert, 0xb99447, .28), mk(ring, 0xb08a3e, .9), mk(hi, 0xc0787e, 1), new THREE.Points(pg, new THREE.PointsMaterial({ color: lin(0xa8823a), size: .11, sizeAttenuation: true })));
    g.userData.pos = pg.getAttribute("position"); return g;
  }
  function updateHolo(D: ItemData) { const a = holo!.userData.pos as THREE.BufferAttribute; for (let i = 0; i < D.P.length; i++) a.setXYZ(i, D.P[i].x, D.P[i].y, D.P[i].z); a.needsUpdate = true; }

  let meshes: THREE.Mesh[] = [], fz: THREE.LineSegments | null = null, anim = 0;
  function buildItemYarn(D: ItemData) {
    const R = IT.ymm / 2 / MM * st.thick * (st.preset === "mohair" ? .8 : 1), geos: THREE.BufferGeometry[] = [];
    const mat = yarnMat(R), M = LOD.M, step = LOD.step;
    D.counts.forEach((c, r) => {
      const s0 = D.start[r], tops: THREE.Vector3[] = [], saw: THREE.Vector3[] = [], color = pat.rounds[r].color;
      for (let i = 0; i < c; i++) {
        const top = D.P[s0 + i]; let bot: THREE.Vector3;
        if (r === 0) bot = D.P[0].clone().lerp(top, .25);
        else { const pc = D.counts[r - 1], ps = D.start[r - 1], fb = (i + 1) / c * pc - .5, pb = Math.floor(fb), t = fb - pb; bot = D.P[ps + ((pb % pc) + pc) % pc].clone().lerp(D.P[ps + (((pb + 1) % pc) + pc) % pc], t); }
        tops.push(top.clone()); saw.push(top.clone(), bot);
      }
      [saw, tops].forEach((arr, ix) => {
        if (arr.length < 3) return; const cv = new THREE.CatmullRomCurve3(arr, true, "catmullrom", .5), Rr = ix ? R * .9 : R;
        const pts = cv.getSpacedPoints(Math.max(24, Math.ceil(cv.getLength() / (Rr * .75 * step))));
        const g = buildYarn(pts, Rr, { M, closed: true, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; group.add(m); meshes.push(m); geos.push(g);
      });
    });
    if (IT.strap !== "none") {
      const c = D.counts[D.counts.length - 1], s0 = D.start[D.start.length - 1], color = pat.rounds[pat.rounds.length - 1].color; let ry = 0, rr = 0;
      for (let i = 0; i < c; i++) { const q = D.P[s0 + i]; ry += q.y; rr += Math.hypot(q.x, q.z); } ry /= c; rr /= c;
      const arcs: [number, number, number, number][] = IT.strap === "long" ? [[0, Math.PI, rr * 2.3, 0]] : [[Math.PI / 2 - .62, Math.PI / 2 + .62, rr * 1.25, 1], [-Math.PI / 2 - .62, -Math.PI / 2 + .62, rr * 1.25, -1]];
      arcs.forEach(([a, b, H, side]) => {
        const A = new THREE.Vector3(Math.cos(a) * rr, ry, Math.sin(a) * rr), B = new THREE.Vector3(Math.cos(b) * rr, ry, Math.sin(b) * rr), w = new THREE.Vector3().subVectors(B, A).normalize(), nrm = new THREE.Vector3(-w.z, 0, w.x);
        [-1, 0, 1].forEach(k => {
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= 40; i++) { const t = i / 40, q = A.clone().lerp(B, t); q.y += H * Math.sin(Math.PI * t) - R * 1.2 * (1 - Math.sin(Math.PI * t)); q.addScaledVector(nrm, k * R * 1.75 + side * rr * .12 * Math.sin(Math.PI * t)); pts.push(q); }
          const cv = new THREE.CatmullRomCurve3(pts), g = buildYarn(cv.getSpacedPoints(Math.ceil(cv.getLength() / (R * .6 * step))), R, { M, color }), m = new THREE.Mesh(g, mat); m.castShadow = true; group.add(m); meshes.push(m); geos.push(g);
        });
      });
    }
    fz = fuzzLines(geos); if (fz) group.add(fz);
  }
  function sizeInfo(D: ItemData) {
    let my = 0, mr = 0; D.P.forEach(q => { if (q.y > my) my = q.y; const r = Math.hypot(q.x, q.z); if (r > mr) mr = r; });
    const cm = (v: number) => Math.round(v * MM) / 10, k = IT.hmm / IT.ymm;
    const fit = k < .8 ? "바늘이 가늘어서 빡빡하고 단단한 편물이 됩니다." : k > 1.45 ? "바늘이 굵어서 성글고 부드러운 편물이 됩니다." : "실과 바늘이 잘 맞습니다.";
    opts.onInfo({ diameterCm: cm(mr * 2), heightCm: my > D.rh * 2 ? cm(my) : null, fit });
    return { my, mr };
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
  }
  let t0 = 0;
  function startItem() { opts.onInfo(null); t0 = performance.now(); IT.data = makeItem(); showItem(); }
  // (portrait phones: 0.95, not the prototype's 1.45, so the piece is not tiny on a narrow screen)
  function fit() { const k = Math.max(1, (cam.aspect < .8 ? .95 : 1.45) / cam.aspect); cam.position.sub(ctl.target).multiplyScalar(k).add(ctl.target); ctl.update(); }
  function tickItem() {
    const D = IT.data; if (!D || D.done) return;
    // the prototype: 8 passes a frame for 150 frames (1200 passes). Past ~40k springs that took 150ms a frame
    // (a 120cm rug: 23s), so big pieces do fewer passes a frame and fewer in all; their first layout (rings at
    // the right radius) is already close to the rest shape
    const big = Math.max(1, D.E.length / 40000), ppf = Math.max(1, Math.round(8 / big)), iters = big > 1 ? Math.max(40, Math.round(150 / big)) : 150;
    relax(D, ppf); D.iter++; if (holo && holo.parent) updateHolo(D);
    if (D.iter >= (reduced() ? 1 : iters)) {
      if (D.iter < iters) relax(D, Math.round(ppf * iters * .75)); D.done = true;
      const z = sizeInfo(D), sh = IT.strap === "two" ? z.mr * 1.25 : IT.strap === "long" ? z.mr * 2.3 : 0, tot = z.my + sh, ext = Math.max(z.mr * 2, tot);
      // the target sits a little below the middle and the camera a little further than the prototype's, so the
      // piece stands clear of the labels along the bottom of the screen
      const dir = cam.position.clone().sub(ctl.target).normalize(); ctl.target.set(0, tot * .32, 0);
      const dist = (ext * (st.fur ? 2.45 : 2.1) + 3) * 1.25; cam.position.copy(ctl.target).addScaledVector(dir, dist); ctl.maxDistance = Math.max(40, dist * 2.2);
      // the shadow camera grows with a big piece so its shadow is not cut off
      const half = Math.max(10, ext * 1.4); ground.scale.setScalar(Math.max(1, half / 12)); sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.far = Math.max(40, half * 4); sun.position.set(7, 9, 10).multiplyScalar(half / 10); sc.updateProjectionMatrix();
      fit(); showItem(); opts.onBuilt?.(performance.now() - t0);
    }
  }
  // 뜨는 순서: the yarn grows round by round (draw range over the meshes, which are in round order);
  // in the structure view the shape is worked out again from the start, as in the prototype
  function playDraw() {
    if (IT.view === "holo" || !IT.data?.done) { startItem(); return; }
    if (anim) cancelAnimationFrame(anim);
    if (reduced()) return;
    if (fz) fz.visible = false; const totals = meshes.map(m => m.geometry.index!.count), sum = totals.reduce((a, b) => a + b, 0); meshes.forEach(m => m.geometry.setDrawRange(0, 0));
    const s0 = performance.now(), dur = Math.min(9000, 3500 + pat.rounds.length * 120);
    const stepFn = (now: number) => {
      let k = Math.min(1, (now - s0) / dur) * sum;
      meshes.forEach((m, i) => { const pr = m.geometry.userData.perRing, c = Math.max(0, Math.min(totals[i], k)); m.geometry.setDrawRange(0, Math.floor(c / pr) * pr); k -= totals[i]; });
      if (now - s0 < dur) anim = requestAnimationFrame(stepFn); else { meshes.forEach(m => m.geometry.setDrawRange(0, Infinity)); if (fz) fz.visible = true; anim = 0; }
    };
    anim = requestAnimationFrame(stepFn);
  }

  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  ctl.target.set(0, 0, 0); fit();
  startItem();
  let raf = 0, alive = true;
  const loop = () => { if (!alive) return; tickItem(); ctl.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);

  return {
    setMaterial(m) {
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
