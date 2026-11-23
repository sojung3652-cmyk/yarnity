"use client";
// 직접 그리기 · 자유롭게 (web; Kim: "like an ordinary paint program"). A sheet of squared paper, one square a
// stitch-sized cell; what is painted is the piece, the paper left bare is a hole (a bag's handle opening, a
// window in a panel). Tools as paint programs have them: 붓, 지우개, 채우기; the brush size; 좌우 대칭 as an
// option (every stroke mirrored about the middle); 되돌리기 / 다시 하기; colours of its own. While drawing, the
// squares fill under the pen and a ring shows the brush where the pointer is, so you always see what you draw.
// What comes out is a PaintShape (lib/pattern.ts): worked flat in rows from the bottom (planPaint), and the 3D
// stands it up, holes and colours as painted.
import { useEffect, useRef, useState } from "react";
import type { PaintShape } from "@/lib/pattern";
import { Slide } from "./WebPages";

const GW = 48, GH = 48, PX = 420, CELL = PX / GW, EMPTY = ".";
type Tool = "brush" | "eraser" | "fill";
const TOOLS: [Tool, string, string][] = [
  ["brush", "붓", "M4 20c2.5 0 4-1.5 4-3.5S9.5 13 11 13l7-7a2 2 0 0 0-3-3l-7 7c0 1.5-1 3-3.5 3S4 15.5 4 20z"],
  ["eraser", "지우개", "M8 20h12M5.5 14.5l7-7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12 20H9.5l-4-4a1 1 0 0 1 0-1.5z"],
  ["fill", "채우기", "M4 11l7-7 8 8-7 7a2 2 0 0 1-2.8 0L4 13.8a2 2 0 0 1 0-2.8zM4 11h15M20 15s1.5 2 1.5 3a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3z"],
];
const Ic = ({ d }: { d: string }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

const blank = () => EMPTY.repeat(GW * GH);
// an example to start from: a tote's front - a body and a handle with its opening
function toteExample(): string {
  const a = blank().split("");
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const body = y >= 16 && y <= 45 && x >= 7 && x <= 40;
    const handle = y >= 3 && y < 16 && x >= 14 && x <= 33 && !(y >= 7 && x >= 19 && x <= 28);
    if (body || handle) a[y * GW + x] = "0";
  }
  return a.join("");
}

export function PaintPad({ value, base, onChange, info }: { value: PaintShape | undefined; base: string; onChange: (f: PaintShape | undefined) => void; info?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [cells, setCells] = useState<string>(() => (value && value.gw === GW && value.gh === GH ? value.cells : blank()));
  const [palette, setPalette] = useState<string[]>(() => (value?.palette.length ? value.palette : [base]));
  const [ink, setInk] = useState(0);
  const [tool, setTool] = useState<Tool>("brush");
  const [size, setSize] = useState(2);
  const [mirror, setMirror] = useState(false);
  const [wCm, setW] = useState(value?.wCm ?? 30), [hCm, setH] = useState(value?.hCm ?? 30), [pieces, setPieces] = useState<1 | 2>(value?.pieces ?? 1);
  const undo = useRef<string[]>([]), redo = useRef<string[]>([]);
  const work = useRef<string[] | null>(null), last = useRef<[number, number] | null>(null), hover = useRef<[number, number] | null>(null);

  // the first colour follows the yarn colour picked elsewhere while it is the only one
  useEffect(() => { if (palette.length === 1 && palette[0] !== base) setPalette([base]); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (c: string, pal = palette, w = wCm, h = hCm, pc = pieces) =>
    onChange(/[0-9a-z]/.test(c) ? { gw: GW, gh: GH, cells: c, palette: pal, wCm: w, hCm: h, pieces: pc } : undefined);

  // the paper: squares, the painted cells, the mirror line, the brush ring
  const draw = () => {
    const c = cv.current; if (!c) return; const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== PX * dpr) { c.width = PX * dpr; c.height = PX * dpr; }
    const x = c.getContext("2d")!; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = "#FFFDF8"; x.fillRect(0, 0, PX, PX);
    x.strokeStyle = "rgba(150,120,90,.12)"; x.lineWidth = 1; x.beginPath();
    for (let i = 1; i < GW; i++) { x.moveTo(i * CELL + .5, 0); x.lineTo(i * CELL + .5, PX); x.moveTo(0, i * CELL + .5); x.lineTo(PX, i * CELL + .5); }
    x.stroke();
    const cur = work.current ?? cells.split("");
    for (let y = 0; y < GH; y++) for (let k = 0; k < GW; k++) {
      const ch = cur[y * GW + k]; if (ch === EMPTY) continue;
      x.fillStyle = palette[parseInt(ch, 36)] ?? base; x.fillRect(k * CELL, y * CELL, CELL + .5, CELL + .5);
    }
    if (mirror) { x.setLineDash([5, 5]); x.strokeStyle = "#B99447"; x.lineWidth = 1; x.beginPath(); x.moveTo(PX / 2, 0); x.lineTo(PX / 2, PX); x.stroke(); x.setLineDash([]); }
    const hv = hover.current;
    if (hv && tool !== "fill") {
      const ring = (hx: number) => { x.beginPath(); x.arc(hx, hv[1], Math.max(CELL * .6, size * CELL / 2 + CELL * .3), 0, Math.PI * 2); x.stroke(); };
      x.strokeStyle = tool === "eraser" ? "rgba(58,46,41,.7)" : "#9C5D63"; x.lineWidth = 1.5; ring(hv[0]); if (mirror) { x.globalAlpha = .45; ring(PX - hv[0]); x.globalAlpha = 1; }
    }
  };
  useEffect(draw);

  const at = (e: { clientX: number; clientY: number }): [number, number] => { const r = cv.current!.getBoundingClientRect(), k = PX / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
  const stamp = (a: string[], px: number, py: number, ch: string) => {
    const cx = px / CELL, cy = py / CELL, rad = Math.max(.5, size / 2);
    for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) for (let k = Math.floor(cx - rad); k <= Math.ceil(cx + rad); k++) {
      if (y < 0 || y >= GH || k < 0 || k >= GW) continue;
      if (Math.hypot(k + .5 - cx, y + .5 - cy) <= rad + .15) a[y * GW + k] = ch;
    }
  };
  // a stroke from the last point to this one, every half cell, mirrored when 좌우 대칭 is on
  const line = (a: string[], from: [number, number], to: [number, number], ch: string) => {
    const n = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / (CELL / 2)));
    for (let i = 0; i <= n; i++) { const px = from[0] + (to[0] - from[0]) * i / n, py = from[1] + (to[1] - from[1]) * i / n; stamp(a, px, py, ch); if (mirror) stamp(a, PX - px, py, ch); }
  };
  const fill = (a: string[], px: number, py: number, ch: string) => {
    const sx = Math.floor(px / CELL), sy = Math.floor(py / CELL); if (sx < 0 || sy < 0 || sx >= GW || sy >= GH) return;
    const from = a[sy * GW + sx]; if (from === ch) return;
    const st = [[sx, sy]];
    while (st.length) { const [k, y] = st.pop()!; if (k < 0 || y < 0 || k >= GW || y >= GH || a[y * GW + k] !== from) continue; a[y * GW + k] = ch; st.push([k + 1, y], [k - 1, y], [k, y + 1], [k, y - 1]); }
  };
  const inkCh = () => (tool === "eraser" ? EMPTY : ink.toString(36));
  const commit = (next: string) => { undo.current.push(cells); if (undo.current.length > 60) undo.current.shift(); redo.current = []; setCells(next); emit(next); };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault(); cv.current!.setPointerCapture(e.pointerId);
    const p = at(e), a = cells.split("");
    if (tool === "fill") { fill(a, p[0], p[1], ink.toString(36)); if (mirror) fill(a, PX - p[0], p[1], ink.toString(36)); commit(a.join("")); return; }
    work.current = a; last.current = p; line(a, p, p, inkCh()); draw();
  };
  const onMove = (e: React.PointerEvent) => {
    const p = at(e); hover.current = p;
    if (work.current && last.current) { line(work.current, last.current, p, inkCh()); last.current = p; }
    draw();
  };
  const onUp = () => { if (!work.current) return; const next = work.current.join(""); work.current = null; last.current = null; commit(next); };
  const onLeave = () => { hover.current = null; draw(); };

  const doUndo = () => { const u = undo.current.pop(); if (u == null) return; redo.current.push(cells); setCells(u); emit(u); };
  const doRedo = () => { const r = redo.current.pop(); if (r == null) return; undo.current.push(cells); setCells(r); emit(r); };
  const clearAll = () => commit(blank());
  const example = () => { const ex = toteExample(); setPieces(2); setW(34); setH(38); undo.current.push(cells); setCells(ex); emit(ex, palette, 34, 38, 2); };
  const addColor = (hex: string) => { if (palette.length >= 36) return; const pal = [...palette, hex]; setPalette(pal); setInk(pal.length - 1); setTool("brush"); emit(cells, pal); };
  const setColor = (i: number, hex: string) => { const pal = palette.slice(); pal[i] = hex; setPalette(pal); emit(cells, pal); };

  // keys while the pad is in use: Ctrl/⌘+Z, Ctrl/⌘+Shift+Z (Ctrl+Y), B / E / G for the tools
  const onKey = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === "z" || e.key === "Z")) { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); }
    else if (mod && e.key === "y") { e.preventDefault(); doRedo(); }
    else if (!mod && e.key === "b") setTool("brush"); else if (!mod && e.key === "e") setTool("eraser"); else if (!mod && e.key === "g") setTool("fill");
  };

  return (
    <div className="pp" onKeyDown={onKey}>
      <div className="pp-bar" role="toolbar" aria-label="그리기 도구">
        {TOOLS.map(([k, label, d]) => <button key={k} type="button" className="pp-tool" aria-pressed={tool === k} onClick={() => setTool(k)} title={`${label} (${k === "brush" ? "B" : k === "eraser" ? "E" : "G"})`}><Ic d={d} />{label}</button>)}
        <span className="pp-sep" aria-hidden="true" />
        <button type="button" className="pp-tool" aria-pressed={mirror} onClick={() => setMirror(m => !m)} title="좌우 대칭으로 그리기"><Ic d="M12 3v18M9 6 4 12l5 6V6zM15 6l5 6-5 6V6z" />좌우 대칭</button>
      </div>
      <div className="pp-line">
        {tool !== "fill" ? <Slide label={tool === "eraser" ? "지우개 크기" : "붓 크기"} min={1} max={8} step={1} value={size} onChange={setSize} text={`${size}칸`} /> : <span className="pp-hint">닫힌 곳을 누르면 그 안이 칠해집니다.</span>}
        <button type="button" className="pp-mini" onClick={doUndo} disabled={!undo.current.length} title="되돌리기 (Ctrl+Z)"><Ic d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />되돌리기</button>
        <button type="button" className="pp-mini" onClick={doRedo} disabled={!redo.current.length} title="다시 하기 (Ctrl+Shift+Z)"><Ic d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />다시 하기</button>
      </div>

      <canvas ref={cv} className={"pp-pad is-" + tool} style={{ touchAction: "none" }} tabIndex={0}
        aria-label="그림을 그리는 종이 - 칠한 곳이 편물, 칠하지 않은 곳은 구멍이 됩니다"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onLeave} />

      <div className="pp-colors" role="radiogroup" aria-label="칠할 색">
        <span className="pp-lb">칠할 색</span>
        {palette.map((hex, i) => (
          <label key={i} className="pp-sw" title={i === 0 ? "실 색 (색 1)" : `색 ${i + 1}`}>
            <input type="radio" name="pp-ink" checked={ink === i && tool !== "eraser"} onChange={() => { setInk(i); if (tool === "eraser") setTool("brush"); }} aria-label={`색 ${i + 1}`} />
            <i style={{ background: hex }} />
            <input type="color" className="pp-edit" value={hex} aria-label={`색 ${i + 1} 바꾸기`} onChange={e => setColor(i, e.target.value.toUpperCase())} />
          </label>
        ))}
        {palette.length < 36 && <label className="pp-add" title="색 더하기"><span aria-hidden="true">+</span><input type="color" aria-label="색 더하기" defaultValue="#A9B79C" onChange={e => addColor(e.target.value.toUpperCase())} /></label>}
      </div>

      <div className="pp-size">
        <Slide label="가로" min={5} max={120} step={1} value={wCm} onChange={v => { setW(v); emit(cells, palette, v); }} text={`${wCm}cm`} />
        <Slide label="세로" min={5} max={150} step={1} value={hCm} onChange={v => { setH(v); emit(cells, palette, wCm, v); }} text={`${hCm}cm`} />
        <label className="pp-check"><input type="checkbox" checked={pieces === 2} onChange={e => { const pc = e.target.checked ? 2 : 1; setPieces(pc); emit(cells, palette, wCm, hCm, pc); }} />같은 모양 2장 (가방처럼 앞판과 뒤판)</label>
      </div>

      <p className="pp-acts">
        <button type="button" className="nb-link" onClick={example}>예시: 손잡이 구멍이 있는 가방</button>
        <button type="button" className="nb-link" onClick={clearAll}>모두 지우기</button>
        {info && <span>{info}</span>}
      </p>
      <p className="nb-help">칠한 곳이 편물이 되고, 칠하지 않은 곳은 구멍이 됩니다. 아래에서부터 한 단씩 왕복으로 뜹니다.</p>
    </div>
  );
}
