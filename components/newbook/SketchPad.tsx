"use client";
// 그려서 만들기 (Kim: "the bag in my head"). A small paint program on three sheets - 앞면, 옆면, 뒷면 - so the
// piece can be drawn from every side: a pen in any colour (the palette, as paint programs have it), 채우기 to
// colour an area, a 지우개, and 유동화 (liquify) to push the drawing's shape around with a drag. A sketch or photo
// can be brought onto a sheet. 이 그림으로 만들기 sends the sheets that have something on them, side by side and
// named, with a short note, to Claude (app/api/shape), which reads the piece: its silhouette as widths up its
// height (a round, slouchy hobo is a curve, not a box), the side's depth, a flap, handles, a button, and the
// colours of each part. The draft follows (lib/sketchShape), and with it the pattern and the 3D.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { readSpec, type ShapeSpec } from "@/lib/sketchShape";
import { maskOf, measure, withMeasure } from "@/lib/sketchMeasure";
import { Slide } from "./WebPages";

const S = 560; // a sheet's pixels (shown at the column's width)
type View = "front" | "side" | "back";
type Tool = "pen" | "fill" | "eraser" | "liquify";
const VIEWS: [View, string][] = [["front", "앞면"], ["side", "옆면"], ["back", "뒷면"]];
const TOOLS: [Tool, string, string, string][] = [
  ["pen", "펜", "B", "M4 20l1-4.5L16.5 4a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19zM14.5 6l3.5 3.5"],
  ["fill", "채우기", "G", "M4 11l7-7 8 8-7 7a2 2 0 0 1-2.8 0L4 13.8a2 2 0 0 1 0-2.8zM4 11h15M20 15s1.5 2 1.5 3a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3z"],
  ["eraser", "지우개", "E", "M8 20h12M5.5 14.5l7-7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12 20H9.5l-4-4a1 1 0 0 1 0-1.5z"],
  ["liquify", "유동화", "L", "M4 14c3-6 5 4 8-2s5 2 8-4M4 19c3-4 5 2 8-1s5 1 8-2"],
];
const INKS = ["#2B2523", "#E8A6B4", "#F6D2D8", "#D9565C", "#A9B79C", "#9BB7D4", "#D4AF37", "#FFFDF8"];
const Ic = ({ d }: { d: string }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const ERR: Record<string, string> = {
  not_configured: "지금은 AI가 연결되어 있지 않습니다. 칸 그림판이나 옆모습 반쪽으로 그려 주십시오.",
  not_granted: "AI 사용 권한이 없습니다. 칸 그림판이나 옆모습 반쪽으로 그려 주십시오.",
  rate_limited: "AI가 잠시 바쁩니다. 조금 뒤에 다시 눌러 주십시오.",
  image_rejected: "그림을 보내지 못했습니다. 다시 눌러 주십시오.",
};
const hexRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

export function SketchPad({ onShape }: { onShape: (s: ShapeSpec) => void }) {
  const cv = useRef<HTMLCanvasElement>(null), file = useRef<HTMLInputElement>(null);
  // each sheet: its own ink layer (transparent where nothing is drawn) and its undo steps
  const sheets = useRef<Record<View, HTMLCanvasElement | null>>({ front: null, side: null, back: null });
  const undos = useRef<Record<View, ImageData[]>>({ front: [], side: [], back: [] });
  const [view, setView] = useState<View>("front"), [tool, setTool] = useState<Tool>("pen");
  const [ink, setInk] = useState(INKS[0]), [width, setWidth] = useState(4);
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState<string | null>(null);
  // 크게 그리기 (Kim): the pad spread over the 3D stage, its tools down its side; it folds back once the piece is made
  const [big, setBig] = useState(false), [canBig, setCanBig] = useState(false), root = useRef<HTMLDivElement>(null);
  useEffect(() => { setCanBig(!!root.current?.closest(".yw")); }, []);
  const [, redraw] = useState(0), last = useRef<[number, number] | null>(null), hover = useRef<[number, number] | null>(null);
  const sheet = (v: View) => { let c = sheets.current[v]; if (!c) { c = document.createElement("canvas"); c.width = S; c.height = S; sheets.current[v] = c; } return c; };
  const has = (v: View) => { const c = sheets.current[v]; if (!c) return false; const d = c.getContext("2d")!.getImageData(0, 0, S, S).data; for (let i = 3; i < d.length; i += 16) if (d[i] > 20) return true; return false; };

  // the paper, the sheet, the brush ring
  const draw = () => {
    const c = cv.current; if (!c) return; if (c.width !== S) { c.width = S; c.height = S; }
    const x = c.getContext("2d")!; x.fillStyle = "#FFFDF8"; x.fillRect(0, 0, S, S);
    x.strokeStyle = "rgba(150,120,90,.10)"; x.lineWidth = 1; x.beginPath(); for (let i = 40; i < S; i += 40) { x.moveTo(i + .5, 0); x.lineTo(i + .5, S); x.moveTo(0, i + .5); x.lineTo(S, i + .5); } x.stroke();
    x.drawImage(sheet(view), 0, 0);
    const hv = hover.current;
    if (hv && tool !== "fill") { x.strokeStyle = tool === "pen" ? ink : "rgba(58,46,41,.6)"; x.lineWidth = 1.5; x.beginPath(); x.arc(hv[0], hv[1], tool === "liquify" ? width * 9 : tool === "eraser" ? width * 3 : Math.max(2, width / 2), 0, Math.PI * 2); x.stroke(); }
  };
  useEffect(draw);

  const at = (e: { clientX: number; clientY: number }): [number, number] => { const r = cv.current!.getBoundingClientRect(), k = S / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
  const snap = () => { const u = undos.current[view], g = sheet(view).getContext("2d")!; u.push(g.getImageData(0, 0, S, S)); if (u.length > 30) u.shift(); };
  const stroke = (a: [number, number], b: [number, number]) => {
    const g = sheet(view).getContext("2d")!; g.save();
    g.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    g.strokeStyle = ink; g.lineWidth = tool === "eraser" ? width * 6 : width; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore();
  };
  // 채우기: the area of one colour (or of bare paper) around the point, up to the lines, in the ink
  const fill = (p: [number, number]) => {
    const g = sheet(view).getContext("2d")!, img = g.getImageData(0, 0, S, S), d = img.data, sx = Math.floor(p[0]), sy = Math.floor(p[1]);
    const i0 = (sy * S + sx) * 4, from = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]], [r, gg, b] = hexRgb(ink);
    const same = (i: number) => from[3] < 30 ? d[i + 3] < 90 : Math.abs(d[i] - from[0]) + Math.abs(d[i + 1] - from[1]) + Math.abs(d[i + 2] - from[2]) < 90 && d[i + 3] > 90;
    if (from[3] > 200 && Math.abs(from[0] - r) + Math.abs(from[1] - gg) + Math.abs(from[2] - b) < 6) return;
    const seen = new Uint8Array(S * S), st = [sx + sy * S];
    while (st.length) {
      const k = st.pop()!; if (seen[k]) continue; seen[k] = 1; const i = k * 4; if (!same(i)) continue;
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
      const x = k % S, y = (k - x) / S;
      if (x > 0) st.push(k - 1); if (x < S - 1) st.push(k + 1); if (y > 0) st.push(k - S); if (y < S - 1) st.push(k + S);
    }
    g.putImageData(img, 0, 0);
  };
  // 유동화: the drawing under the brush is pushed along the drag, most at the centre (as photo editors do it)
  const liquify = (a: [number, number], b: [number, number]) => {
    const g = sheet(view).getContext("2d")!, rad = Math.round(width * 9), dx = b[0] - a[0], dy = b[1] - a[1];
    const x0 = Math.max(0, Math.floor(b[0] - rad)), y0 = Math.max(0, Math.floor(b[1] - rad)), w = Math.min(S, Math.ceil(b[0] + rad)) - x0, h = Math.min(S, Math.ceil(b[1] + rad)) - y0;
    if (w < 2 || h < 2) return;
    const src = g.getImageData(0, 0, S, S), out = g.getImageData(x0, y0, w, h), sd = src.data, od = out.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x0 + x, py = y0 + y, dd = ((px - b[0]) ** 2 + (py - b[1]) ** 2) / (rad * rad); if (dd >= 1) continue;
      const f = (1 - dd) ** 2, sxp = Math.round(px - dx * f), syp = Math.round(py - dy * f);
      if (sxp < 0 || syp < 0 || sxp >= S || syp >= S) continue;
      const si = (syp * S + sxp) * 4, oi = (y * w + x) * 4; od[oi] = sd[si]; od[oi + 1] = sd[si + 1]; od[oi + 2] = sd[si + 2]; od[oi + 3] = sd[si + 3];
    }
    g.putImageData(out, x0, y0);
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault(); cv.current!.focus({ preventScroll: true }); cv.current!.setPointerCapture(e.pointerId); const p = at(e); snap(); setMsg(null);
    if (tool === "fill") { fill(p); redraw(n => n + 1); return; }
    last.current = p; if (tool !== "liquify") stroke(p, [p[0] + .01, p[1]]); draw();
  };
  const onMove = (e: React.PointerEvent) => {
    const p = at(e); hover.current = p;
    if (last.current) { if (tool === "liquify") liquify(last.current, p); else stroke(last.current, p); last.current = p; }
    draw();
  };
  const onUp = () => { if (last.current) { last.current = null; redraw(n => n + 1); } };
  const undo = () => { const u = undos.current[view].pop(); if (u) { sheet(view).getContext("2d")!.putImageData(u, 0, 0); redraw(n => n + 1); } };
  const clear = () => { snap(); sheet(view).getContext("2d")!.clearRect(0, 0, S, S); redraw(n => n + 1); };
  const onFile = (f?: File) => {
    if (!f || !f.type.startsWith("image/")) return; const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => { snap(); const g = sheet(view).getContext("2d")!, k = Math.min(S / im.width, S / im.height), w = im.width * k, h = im.height * k; g.drawImage(im, (S - w) / 2, (S - h) / 2, w, h); redraw(n => n + 1); }; im.src = String(r.result); };
    r.readAsDataURL(f);
  };

  // the drawn sheets side by side on white, each named, as one picture for the AI
  const composite = () => {
    const used = VIEWS.filter(([v]) => has(v)); if (!used.length) return null;
    const c = document.createElement("canvas"); c.width = S * used.length; c.height = S + 40; const x = c.getContext("2d")!;
    x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, c.width, c.height);
    used.forEach(([v, label], i) => { x.drawImage(sheet(v), i * S, 40); x.fillStyle = "#333"; x.font = "bold 26px sans-serif"; x.fillText(label, i * S + 16, 30); if (i) { x.fillStyle = "#ccc"; x.fillRect(i * S, 0, 2, c.height); } });
    return c.toDataURL("image/png").split(",")[1];
  };
  const make = async () => {
    const data = composite(); if (!data) { setMsg("먼저 뜨고 싶은 모양을 그려 주십시오."); return; }
    setBusy(true); setMsg("그림을 읽고 있습니다…");
    try {
      const res = await fetch("/api/shape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: { mediaType: "image/png", data }, note }) });
      const j = await res.json().catch(() => ({}));
      const spec = res.ok ? readSpec(j.shape) : null;
      if (!spec) { setMsg(ERR[j.error as string] ?? "그림을 읽지 못했습니다. 다시 눌러 주십시오."); return; }
      const m = (v: View) => { if (!has(v)) return null; const mk = maskOf(sheet(v).getContext("2d")!.getImageData(0, 0, S, S).data, S, S); return mk ? measure(mk) : null; };
      onShape(withMeasure(spec, m("front"), m("side"))); setMsg(spec.summary ?? "그림대로 모양을 만들었습니다."); setBig(false);
    } catch { setMsg("AI에 닿지 못했습니다. 인터넷을 확인하고 다시 눌러 주십시오."); }
    finally { setBusy(false); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); undo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).tagName === "INPUT") return;
    const t = TOOLS.find(x => x[2] === e.key.toUpperCase()); if (t) { e.preventDefault(); setTool(t[0]); }
    if (e.key === "Escape" && big) { e.preventDefault(); setBig(false); }
  };

  const controls = <>
      <div className="sk-head">
        <div className="sk-views" role="tablist" aria-label="그리는 면">
          {VIEWS.map(([v, label]) => <button key={v} type="button" role="tab" aria-selected={view === v} className={"sk-view" + (has(v) ? " is-drawn" : "")} onClick={() => setView(v)}>{label}{has(v) && <i aria-hidden="true" />}</button>)}
        </div>
        {canBig && <button type="button" className="pp-mini sk-bigbtn" aria-pressed={big} onClick={() => setBig(b => !b)}>{big ? "작게" : "크게 그리기"}</button>}
      </div>
      <div className="sk-tools" role="toolbar" aria-label="그리기 도구">
        {TOOLS.map(([k, label, key, d]) => <button key={k} type="button" className="sk-tool" aria-pressed={tool === k} title={`${label} (${key})`} onClick={() => setTool(k)}><Ic d={d} />{label}<kbd>{key}</kbd></button>)}
      </div>
      <div className="sk-inks" role="radiogroup" aria-label="펜 색">
        <span className="pp-lb">색</span>
        {INKS.map(h => <button key={h} type="button" role="radio" aria-checked={ink === h} aria-label={h} className="sk-ink" style={{ background: h }} onClick={() => { setInk(h); if (tool === "eraser" || tool === "liquify") setTool("pen"); }} />)}
        <label className="pp-add" title="다른 색"><span aria-hidden="true">+</span><input type="color" aria-label="다른 색" value={ink} onChange={e => { setInk(e.target.value); if (tool !== "fill") setTool("pen"); }} /></label>
      </div>
      <div className="pp-line">
        {tool !== "fill" ? <Slide label={tool === "liquify" ? "붓 크기" : tool === "eraser" ? "지우개 크기" : "펜 굵기"} min={1} max={12} step={1} value={width} onChange={setWidth} text={`${width}`} /> : <span className="pp-hint">선 안쪽을 누르면 칠해집니다</span>}
      </div>
      <div className="sk-acts">
        <button type="button" className="pp-mini" onClick={undo} title="되돌리기 (Ctrl+Z)"><Ic d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />되돌리기</button>
        <button type="button" className="pp-mini" onClick={clear}>이 면 지우기</button>
        <button type="button" className="pp-mini" onClick={() => file.current?.click()}><Ic d="M4 7h3l2-2.5h6L17 7h3v12H4zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7z" />사진 불러오기</button>
        <input ref={file} type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0])} />
      </div>
  </>;
  const paper = (
      <canvas ref={cv} className={"pp-pad sk-pad is-" + tool} style={{ touchAction: "none" }} tabIndex={0}
        aria-label={`${VIEWS.find(v => v[0] === view)![1]}을 그리는 종이`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => { hover.current = null; draw(); }} />
  );
  const after = <>
      <label className="sk-note"><span>메모</span>
        <input value={note} maxLength={120} placeholder="예: 분홍색 가방에 금색 단추" onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); make(); } }} />
      </label>
      <div className="sk-go">
        <button type="button" className="sk-make" onClick={make} disabled={busy}>{busy ? "읽는 중…" : "이 그림으로 만들기"}</button>
        {msg && <p className="nb-help" role="status">{msg}</p>}
      </div>
      <p className="nb-help sk-tip">앞면은 꼭, 옆면은 두께를 알려 줍니다. 안을 칠하면 모양을 더 정확히 잽니다.</p>
  </>;
  // 크게 그리기: the paper and its tools moved onto the 3D stage beside the panel, the panel saying where they went
  const stage = big && root.current ? root.current.closest(".yw")?.querySelector(".yw-stage") : null;
  if (stage) return (
    <div ref={root} className="pp sk sk-away">
      <p className="nb-help">왼쪽 큰 종이에서 그리는 중입니다.</p>
      <button type="button" className="pp-mini" onClick={() => setBig(false)}>작게 돌아오기</button>
      {createPortal(<div className="sk-big" onKeyDown={onKey}><div className="sk-paper">{paper}</div><div className="pp sk sk-side">{controls}{after}</div></div>, stage)}
    </div>
  );
  return (
    <div ref={root} className="pp sk" onKeyDown={onKey}>
      {controls}
      {paper}
      {after}
    </div>
  );
}
