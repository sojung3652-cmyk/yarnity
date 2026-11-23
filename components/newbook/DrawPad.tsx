"use client";
// 직접 그리기 (web; Kim): a pad to draw a piece's shape on, and to colour it.
//   모양 그리기 - the side view's right half is drawn in one line (the dashed line is the middle). When the line
//     is let go it is tidied: evenly spaced points, corners rounded twice (Chaikin), kept on the right of the
//     middle; an end near the middle is closed onto it, and a line that starts away from it gets a flat bottom.
//   색 칠하기 - dragging up or down over the shape gives the rounds at those heights the picked colour.
// What comes out is a FreeShape (lib/pattern.ts): the profile from the bottom up as shares of the height, the
// height in cm, the colours by height. The pattern's rounds (planFree) and the 3D follow it at once.
import { useEffect, useRef, useState } from "react";
import type { FreeShape } from "@/lib/pattern";
import { COLORS } from "./YarnStep";
import { Slide } from "./WebPages";

const N = 340, AX = 46, BASE_Y = 306, DRAW_H = 250, SLOTS = 50, PAPER = "#FFFDF8";
type Pt = [number, number];

const resample = (p: Pt[], step: number): Pt[] => {
  const out: Pt[] = [p[0]]; let carry = 0;
  for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1], [bx, by] = p[i], d = Math.hypot(bx - ax, by - ay); let t = step - carry;
    while (t <= d) { out.push([ax + (bx - ax) * t / d, ay + (by - ay) * t / d]); t += step; }
    carry = d - (t - step);
  }
  out.push(p[p.length - 1]); return out;
};
const chaikin = (p: Pt[]): Pt[] => {
  const o: Pt[] = [p[0]];
  for (let i = 0; i < p.length - 1; i++) { const [ax, ay] = p[i], [bx, by] = p[i + 1]; o.push([ax * .75 + bx * .25, ay * .75 + by * .25], [ax * .25 + bx * .75, ay * .25 + by * .75]); }
  o.push(p[p.length - 1]); return o;
};
/** the drawn line, tidied (canvas pixels, bottom first), or null when it is too short to be a shape */
function tidy(raw: Pt[]): Pt[] | null {
  if (raw.length < 4) return null;
  let pts = resample(raw, 7); if (pts.length < 4) return null;
  if (pts[0][1] < pts[pts.length - 1][1]) pts.reverse(); // drawn from the top: the bottom comes first
  pts = chaikin(chaikin(pts.map(([x, y]): Pt => [Math.max(AX, x), y])));
  const b = pts[0], t = pts[pts.length - 1];
  if (Math.max(...pts.map(q => q[1])) - Math.min(...pts.map(q => q[1])) < 24) return null;
  if (b[0] - AX < 12) pts[0] = [AX, b[1]]; else pts.unshift([AX, b[1]]);
  if (t[0] - AX < 12) pts[pts.length - 1] = [AX, t[1]];
  return pts;
}
const span = (pts: Pt[]) => { const ys = pts.map(q => q[1]), yb = Math.max(...ys), yt = Math.min(...ys); return { yb, h: Math.max(20, yb - yt) }; };
const toShape = (pts: Pt[]): [number, number][] => { const { yb, h } = span(pts); return pts.map(([x, y]) => [Math.round((x - AX) / h * 1000) / 1000, Math.round((yb - y) / h * 1000) / 1000]); };
const fromShape = (s: [number, number][]): Pt[] => s.map(([r, y]) => [AX + r * DRAW_H, BASE_Y - y * DRAW_H]);
const toBands = (slots: string[]): [number, string][] => { const out: [number, string][] = []; slots.forEach((c, i) => { if (i === 0 ? c : c !== slots[i - 1]) out.push([i / SLOTS, c]); }); return out; };
const fromBands = (b?: [number, string][]): string[] => { const s = Array<string>(SLOTS).fill(""); (b ?? []).slice().sort((x, y) => x[0] - y[0]).forEach(([from, hex]) => { for (let i = Math.round(from * SLOTS); i < SLOTS; i++) s[i] = hex; }); return s; };

// an example to start from: a strawberry - a pointed tip, wide shoulders, a green top
const BERRY: FreeShape = {
  pts: [[0, 0], [.07, .04], [.17, .14], [.27, .28], [.35, .44], [.4, .58], [.41, .7], [.37, .81], [.28, .9], [.16, .96], [.05, .995], [0, 1]],
  hCm: 9, bands: [[0, "#D9565C"], [.84, "#7FA670"]],
};

export function DrawPad({ value, base, onChange, info }: { value: FreeShape | undefined; base: string; onChange: (f: FreeShape | undefined) => void; info?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"shape" | "color">("shape");
  const [pts, setPts] = useState<Pt[] | null>(() => (value ? fromShape(value.pts) : null));
  const [slots, setSlots] = useState<string[]>(() => fromBands(value?.bands));
  const [hCm, setHCm] = useState(value?.hCm ?? 10);
  const [ink, setInk] = useState<string>(COLORS[1]?.[1] ?? "#F0C1CA");
  const raw = useRef<Pt[]>([]), rawScr = useRef<Pt[]>([]), down = useRef(false), y0 = useRef(0), slotsNow = useRef(slots);
  const emit = (p: Pt[] | null, sl: string[], h: number) => onChange(p ? { pts: toShape(p), hCm: h, bands: toBands(sl) } : undefined);

  // the pad: the shape filled round by round in its colours, mirrored about the middle; the line being drawn
  const draw = () => {
    const c = cv.current; if (!c) return; const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== N * dpr) { c.width = N * dpr; c.height = N * dpr; }
    const x = c.getContext("2d")!; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = PAPER; x.fillRect(0, 0, N, N);
    const cx = N / 2; // the shape is shown whole, about the pad's middle; it is drawn at its right
    const sx = (px: number, side: 1 | -1) => cx + side * (px - AX);
    if (pts) {
      const { yb, h } = span(pts);
      x.save(); x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(sx(px, 1), py) : x.moveTo(sx(px, 1), py))); for (let i = pts.length - 1; i >= 0; i--) x.lineTo(sx(pts[i][0], -1), pts[i][1]); x.closePath(); x.clip();
      for (let i = 0; i < SLOTS; i++) { x.fillStyle = slots[i] || base; x.fillRect(0, yb - (i + 1) / SLOTS * h - .5, N, h / SLOTS + 1); }
      x.restore();
      x.lineWidth = 2; x.lineJoin = "round"; x.lineCap = "round";
      for (const side of [1, -1] as const) { x.strokeStyle = side === 1 ? "#9C5D63" : "rgba(156,93,99,.4)"; x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(sx(px, side), py) : x.moveTo(sx(px, side), py))); x.stroke(); }
    }
    x.setLineDash([4, 4]); x.strokeStyle = "#B5A894"; x.lineWidth = 1; x.beginPath(); x.moveTo(cx, 8); x.lineTo(cx, N - 8); x.stroke(); x.setLineDash([]);
    x.fillStyle = "#7A6F68"; x.font = '12px "Noto Serif KR", serif'; x.fillText("가운데", cx + 6, 20);
    // the line being drawn, under the pen (and its mirror, lighter, on the other side)
    if (down.current && mode === "shape" && rawScr.current.length > 1) for (const m of [false, true]) { x.strokeStyle = m ? "rgba(192,120,126,.35)" : "#C0787E"; x.lineWidth = 2.5; x.lineCap = "round"; x.lineJoin = "round"; x.beginPath(); rawScr.current.forEach(([px, py], i) => { const q = m ? N - px : px; if (i) x.lineTo(q, py); else x.moveTo(q, py); }); x.stroke(); }
  };
  useEffect(draw); // every render: the state is small and the pad is cheap to draw

  const pos = (e: React.PointerEvent): Pt => { const r = cv.current!.getBoundingClientRect(), k = N / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
  // the pad's own x (from the middle line) -> the profile's x (from AX), on whichever side it was drawn
  const px = ([x, y]: Pt): Pt => [AX + Math.abs(x - N / 2), y];
  const paint = (ya: number, yb2: number) => {
    if (!pts) return; const { yb, h } = span(pts), a = Math.max(0, Math.min(SLOTS - 1, Math.floor((yb - Math.max(ya, yb2)) / h * SLOTS))), b = Math.max(0, Math.min(SLOTS - 1, Math.floor((yb - Math.min(ya, yb2)) / h * SLOTS)));
    const n = slotsNow.current.slice(); for (let i = a; i <= b; i++) n[i] = ink; slotsNow.current = n; setSlots(n);
  };
  const onDown = (e: React.PointerEvent) => { e.preventDefault(); cv.current!.setPointerCapture(e.pointerId); down.current = true; const p = pos(e); if (mode === "shape") { raw.current = [px(p)]; rawScr.current = [p]; } else { y0.current = p[1]; paint(p[1], p[1]); } draw(); };
  const onMove = (e: React.PointerEvent) => { if (!down.current) return; const p = pos(e); if (mode === "shape") { raw.current.push(px(p)); rawScr.current.push(p); draw(); } else paint(y0.current, p[1]); };
  const onUp = () => {
    if (!down.current) return; down.current = false;
    if (mode === "shape") { const t = tidy(raw.current); raw.current = []; rawScr.current = []; if (t) { setPts(t); emit(t, slots, hCm); } else draw(); }
    else emit(pts, slotsNow.current, hCm);
  };
  const berry = () => { const p = fromShape(BERRY.pts), sl = fromBands(BERRY.bands); slotsNow.current = sl; setPts(p); setSlots(sl); setHCm(BERRY.hCm); emit(p, sl, BERRY.hCm); };
  const clear = () => { const e = Array<string>(SLOTS).fill(""); slotsNow.current = e; setPts(null); setSlots(e); setMode("shape"); onChange(undefined); };

  return (
    <div className="nb-draw">
      <div className="nb-tiles nb-tiles-2" role="radiogroup" aria-label="그리기 방식">
        <button type="button" role="radio" aria-checked={mode === "shape"} className="nb-tile" onClick={() => setMode("shape")}>모양 그리기</button>
        <button type="button" role="radio" aria-checked={mode === "color"} className="nb-tile" disabled={!pts} onClick={() => setMode("color")}>색 칠하기</button>
      </div>
      <canvas ref={cv} className={"nb-draw-pad" + (mode === "color" ? " is-color" : "")} style={{ touchAction: "none" }} aria-label={mode === "shape" ? "모양을 그리는 종이" : "색을 칠하는 종이"}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      {mode === "color" && (
        <div className="nb-dots nb-wdots" role="radiogroup" aria-label="칠할 색">
          {COLORS.map(([n, hex]) => <button key={n} type="button" role="radio" aria-checked={ink === hex} aria-label={n} title={n} className="nb-dot-color" style={{ background: hex }} onClick={() => setInk(hex)} />)}
          {["#D9565C", "#7FA670"].map(hex => <button key={hex} type="button" role="radio" aria-checked={ink === hex} aria-label={hex === "#D9565C" ? "빨강" : "초록"} className="nb-dot-color" style={{ background: hex }} onClick={() => setInk(hex)} />)}
          <label className="nb-picker" title="팔레트에서 색 고르기"><span className="nb-picker-dot" aria-hidden="true"><i className="nb-wheel" /></span><input type="color" aria-label="팔레트에서 색 고르기" value={ink} onChange={e => setInk(e.target.value)} /></label>
        </div>
      )}
      <Slide label="높이" min={3} max={60} step={1} value={hCm} onChange={v => { setHCm(v); if (pts) emit(pts, slots, v); }} text={`${hCm}cm`} />
      <p className="nb-draw-acts">
        <button type="button" className="nb-link" onClick={berry}>예시: 딸기</button>
        <button type="button" className="nb-link" onClick={clear} disabled={!pts}>지우기</button>
        {info && <span>{info}</span>}
      </p>
      <p className="nb-help">{mode === "shape" ? "가운데 점선의 한쪽에, 옆에서 본 모습의 절반을 한 줄로 그립니다. 선을 떼면 매끈하게 다듬습니다." : "모양 위에서 위아래로 끌면 그 높이의 단이 고른 색이 됩니다."}</p>
    </div>
  );
}
