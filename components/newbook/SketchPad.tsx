"use client";
// 그려서 만들기 (Kim: "the bag in my head"): draw the whole piece as you see it - a pen on plain paper, as in a
// drawing app - or bring in a sketch or photo, add a short note (colours, a gold button...), and press
// 이 그림으로 만들기. Claude reads the shape (app/api/shape), and the item, sizes, body, flap, handles and what is
// sewn on are set from it (lib/sketchShape), so the pattern and the 3D follow. The line is drawn under the pen
// as you go. When the AI cannot be reached the drawing stays and the reader can pick from the list instead.
import { useEffect, useRef, useState } from "react";
import { readSpec, type ShapeSpec } from "@/lib/sketchShape";
import { Slide } from "./WebPages";

const PX = 420;
type Stroke = { pts: [number, number][]; w: number; erase: boolean };
const Ic = ({ d }: { d: string }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const ERR: Record<string, string> = {
  not_configured: "지금은 AI가 연결되어 있지 않습니다. 목록에서 고르거나 칸 그림판을 써 주십시오.",
  not_granted: "AI 사용 권한이 없습니다. 목록에서 고르거나 칸 그림판을 써 주십시오.",
  rate_limited: "AI가 잠시 바쁩니다. 조금 뒤에 다시 눌러 주십시오.",
  image_rejected: "그림을 보내지 못했습니다. 조금 더 작은 그림으로 다시 해 주십시오.",
};

export function SketchPad({ onShape }: { onShape: (s: ShapeSpec) => void }) {
  const cv = useRef<HTMLCanvasElement>(null), file = useRef<HTMLInputElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]), redo = useRef<Stroke[]>([]);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [erase, setErase] = useState(false), [width, setWidth] = useState(3);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<string | null>(null);
  const live = useRef<Stroke | null>(null), hover = useRef<[number, number] | null>(null);

  const paint = (x: CanvasRenderingContext2D, st: Stroke) => {
    if (st.pts.length < 1) return;
    x.save(); x.globalCompositeOperation = st.erase ? "destination-out" : "source-over";
    x.strokeStyle = "#2B2523"; x.lineWidth = st.erase ? st.w * 5 : st.w; x.lineCap = "round"; x.lineJoin = "round";
    x.beginPath(); x.moveTo(st.pts[0][0], st.pts[0][1]);
    // smoothed through the midpoints, so a quick stroke is not jagged
    for (let i = 1; i < st.pts.length - 1; i++) { const [ax, ay] = st.pts[i], [bx, by] = st.pts[i + 1]; x.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2); }
    const l = st.pts[st.pts.length - 1]; x.lineTo(l[0], l[1]); if (st.pts.length === 1) x.lineTo(l[0] + .1, l[1]);
    x.stroke(); x.restore();
  };
  const draw = () => {
    const c = cv.current; if (!c) return; const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== PX * dpr) { c.width = PX * dpr; c.height = PX * dpr; }
    const x = c.getContext("2d")!; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, PX, PX);
    // the ink on its own layer (the eraser takes ink only), over the paper and the photo
    const ink = document.createElement("canvas"); ink.width = c.width; ink.height = c.height; const ix = ink.getContext("2d")!; ix.setTransform(dpr, 0, 0, dpr, 0, 0);
    strokes.forEach(st => paint(ix, st)); if (live.current) paint(ix, live.current);
    x.fillStyle = "#FFFDF8"; x.fillRect(0, 0, PX, PX);
    if (photo) { const k = Math.min(PX / photo.width, PX / photo.height), w = photo.width * k, h = photo.height * k; x.globalAlpha = .9; x.drawImage(photo, (PX - w) / 2, (PX - h) / 2, w, h); x.globalAlpha = 1; }
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(ink, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hv = hover.current;
    if (hv && erase) { x.strokeStyle = "rgba(58,46,41,.6)"; x.lineWidth = 1; x.beginPath(); x.arc(hv[0], hv[1], width * 2.5, 0, Math.PI * 2); x.stroke(); }
  };
  useEffect(draw);

  const at = (e: { clientX: number; clientY: number }): [number, number] => { const r = cv.current!.getBoundingClientRect(), k = PX / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
  const onDown = (e: React.PointerEvent) => { e.preventDefault(); cv.current!.setPointerCapture(e.pointerId); live.current = { pts: [at(e)], w: width, erase }; draw(); };
  const onMove = (e: React.PointerEvent) => { const p = at(e); hover.current = p; if (live.current) live.current.pts.push(p); draw(); };
  const onUp = () => { const s = live.current; live.current = null; if (s) { redo.current = []; setStrokes(v => [...v, s]); setMsg(null); } };
  const undo = () => setStrokes(v => { if (!v.length) return v; redo.current.push(v[v.length - 1]); return v.slice(0, -1); });
  const again = () => { const s = redo.current.pop(); if (s) setStrokes(v => [...v, s]); };
  const clear = () => { setStrokes([]); setPhoto(null); redo.current = []; setMsg(null); };
  const onFile = (f?: File) => { if (!f || !f.type.startsWith("image/")) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => setPhoto(im); im.src = String(r.result); }; r.readAsDataURL(f); };

  const make = async () => {
    if (!strokes.length && !photo) { setMsg("먼저 뜨고 싶은 모양을 그려 주십시오."); return; }
    setBusy(true); setMsg("그림을 읽고 있습니다…");
    try {
      const data = cv.current!.toDataURL("image/png").split(",")[1];
      const res = await fetch("/api/shape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: { mediaType: "image/png", data }, note }) });
      const j = await res.json().catch(() => ({}));
      const spec = res.ok ? readSpec(j.shape) : null;
      if (!spec) { setMsg(ERR[j.error as string] ?? "그림을 읽지 못했습니다. 다시 눌러 주시거나 목록에서 골라 주십시오."); return; }
      onShape(spec); setMsg(spec.summary ?? "그림대로 모양을 만들었습니다.");
    } catch { setMsg("AI에 닿지 못했습니다. 인터넷을 확인하고 다시 눌러 주십시오."); }
    finally { setBusy(false); }
  };
  const onKey = (e: React.KeyboardEvent) => { const m = e.ctrlKey || e.metaKey; if (m && (e.key === "z" || e.key === "Z")) { e.preventDefault(); if (e.shiftKey) again(); else undo(); } };

  return (
    <div className="pp sk" onKeyDown={onKey}>
      <div className="pp-bar" role="toolbar" aria-label="스케치 도구">
        <button type="button" className="pp-tool" aria-pressed={!erase} onClick={() => setErase(false)}><Ic d="M4 20l1-4.5L16.5 4a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19zM14.5 6l3.5 3.5" />펜</button>
        <button type="button" className="pp-tool" aria-pressed={erase} onClick={() => setErase(true)}><Ic d="M8 20h12M5.5 14.5l7-7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12 20H9.5l-4-4a1 1 0 0 1 0-1.5z" />지우개</button>
        <span className="pp-sep" aria-hidden="true" />
        <button type="button" className="pp-tool" onClick={() => file.current?.click()}><Ic d="M4 7h3l2-2.5h6L17 7h3v12H4zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7z" />사진·그림 불러오기</button>
        <input ref={file} type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0])} />
      </div>
      <div className="pp-line">
        <Slide label="펜 굵기" min={1} max={8} step={1} value={width} onChange={setWidth} text={`${width}`} />
        <button type="button" className="pp-mini" onClick={undo} disabled={!strokes.length}><Ic d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />되돌리기</button>
        <button type="button" className="pp-mini" onClick={clear} disabled={!strokes.length && !photo}>모두 지우기</button>
      </div>
      <canvas ref={cv} className={"pp-pad sk-pad" + (erase ? " is-eraser" : "")} style={{ touchAction: "none" }} tabIndex={0}
        aria-label="뜨고 싶은 것을 통째로 그리는 종이" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => { hover.current = null; draw(); }} />
      <label className="sk-note"><span>메모</span>
        <input value={note} maxLength={120} placeholder="예: 분홍색 가방에 금색 단추" onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); make(); } }} />
      </label>
      <div className="sk-go">
        <button type="button" className="sk-make" onClick={make} disabled={busy}>{busy ? "읽는 중…" : "이 그림으로 만들기"}</button>
        {msg && <p className="nb-help" role="status">{msg}</p>}
      </div>
      <p className="nb-help">완성된 모습 전체를 그려 주십시오. 바닥 모양, 몸통이 좁아지거나 넓어지는지, 덮개와 손잡이, 단추 위치까지 그림대로 읽어서 도안과 3D를 만듭니다.</p>
    </div>
  );
}
