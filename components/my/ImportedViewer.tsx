"use client";
// 가져온 도안 · 보면서 따라 뜨기 (/my/imported/[id], web, Kim: mockup S_D). Left: the pages as small thumbnails (the
// one shown gold-edged) and "2 / 6쪽"; middle: the page on white paper - a PDF drawn by pdf.js onto a canvas at
// the screen's pixel density, a photo as it is - with 크게 보기 / 작게 보기 and 쪽 돌리기 (a quarter turn); over
// it the row band (see-through dusty rose with thin lines above and below, "지금" at its left; dragged to move,
// its lower edge dragged to resize), the part above it (already knitted) faded with ivory. Right: the title on
// the cloth label, 지금 뜨는 단 (− n단 +: + moves the band down by its own height, − back up; Space = 한 단 끝,
// Backspace = 되돌리기, not while typing), 내 메모 on ruled paper (saved as it is typed), then 완성으로 표시 ·
// 정보 고치기 · 지우기 (asked on a memo slip in the page). The 단, band, page and zoom are kept: it opens where
// it was left. The first 한 단 끝 makes it 뜨는 중 and the days log counts it (lib/knitLog, as 따라 뜨기).
// Not here yet: writing on the page with a pen (the next piece of work).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPE } from "react";
import { finishImported, pdfjs, removeImported, stepRow, updateImported, useImported, type Imported } from "@/lib/imported";
import { MyImport } from "./MyImport";
import "./imported.css";

type PdfDoc = Awaited<ReturnType<Awaited<ReturnType<typeof pdfjs>>["getDocument"]>["promise"]>;
const ZOOMS = [.6, .8, 1, 1.25, 1.5, 2, 2.5];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** one page drawn onto a canvas: the PDF's page at the width asked (× the pixel density), or the photo */
async function drawPage(c: HTMLCanvasElement, p: Imported, doc: PdfDoc | null, idx: number, cssW: number, turns: number) {
  const dpr = Math.min(3, window.devicePixelRatio || 1), quarter = ((turns % 4) + 4) % 4, side = quarter % 2 === 1;
  let src: CanvasImageSource, sw: number, sh: number, cleanup = () => {};
  if (p.kind === "pdf" && doc) {
    const page = await doc.getPage(idx + 1), v0 = page.getViewport({ scale: 1 });
    // the page drawn at the size it will show (sideways: its height becomes the width)
    const scale = (cssW * dpr) / (side ? v0.height : v0.width), vp = page.getViewport({ scale });
    const off = document.createElement("canvas"); off.width = Math.round(vp.width); off.height = Math.round(vp.height);
    const g = off.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, off.width, off.height);
    await page.render({ canvas: off, canvasContext: g, viewport: vp }).promise;
    src = off; sw = off.width; sh = off.height;
  } else {
    const blob = p.pages?.[idx]; if (!blob) return;
    const bmp = await createImageBitmap(blob); src = bmp; sw = bmp.width; sh = bmp.height; cleanup = () => bmp.close();
  }
  const outW = Math.round(cssW * dpr), k = outW / (side ? sh : sw), outH = Math.round((side ? sw : sh) * k);
  c.width = outW; c.height = outH; c.style.width = cssW + "px"; c.style.height = outH / dpr + "px";
  const g = c.getContext("2d")!; g.save(); g.fillStyle = "#fff"; g.fillRect(0, 0, outW, outH);
  g.translate(outW / 2, outH / 2); g.rotate(quarter * Math.PI / 2); g.drawImage(src, -sw * k / 2, -sh * k / 2, sw * k, sh * k); g.restore();
  cleanup();
}

function Thumb({ p, doc, idx, on, onPick }: { p: Imported; doc: PdfDoc | null; idx: number; on: boolean; onPick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current && (p.kind === "photo" || doc)) drawPage(ref.current, p, doc, idx, 76, p.turns?.[idx] ?? 0).catch(() => {}); }, [p.kind, p.pages, p.turns, doc, idx]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <li><button type="button" className={"iv-thumb" + (on ? " is-on" : "")} aria-current={on ? "page" : undefined} aria-label={`${idx + 1}쪽`} onClick={onPick}><canvas ref={ref} /></button></li>
  );
}

export function ImportedViewer({ id }: { id: string }) {
  const { ready, list } = useImported(), router = useRouter();
  const p = list.find(x => x.id === id) ?? null;
  const [doc, setDoc] = useState<PdfDoc | null>(null), [bad, setBad] = useState(false);
  const [view, setView] = useState<{ page: number; zoom: number; markerY: number; markerH: number; turns: Record<number, number> } | null>(null);
  const [memo, setMemo] = useState<string | null>(null);
  const [editing, setEditing] = useState(false), [asking, setAsking] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null), canvasRef = useRef<HTMLCanvasElement>(null), stageRef = useRef<HTMLDivElement>(null);
  const [paperH, setPaperH] = useState(0), [stageW, setStageW] = useState(0);
  const cur = useRef<Imported | null>(null); cur.current = p;
  const viewRef = useRef(view); viewRef.current = view;

  // the saved state, once
  useEffect(() => { if (p && !view) { setView({ page: clamp(p.page, 0, p.pageCount - 1), zoom: p.zoom || 1, markerY: p.markerY, markerH: p.markerH, turns: p.turns ?? {} }); setMemo(p.memo); } }, [p, view]);
  // the PDF, read once
  useEffect(() => {
    if (!p || p.kind !== "pdf" || !p.pdf || doc) return;
    let alive = true;
    (async () => {
      try { const lib = await pdfjs(); const t = lib.getDocument({ data: new Uint8Array(await p.pdf!.arrayBuffer()) }); taskRef.current = t; const d = await t.promise; if (alive) setDoc(d); }
      catch { if (alive) setBad(true); }
    })();
    return () => { alive = false; };
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // the PDF let go when the page is left
  const taskRef = useRef<{ destroy: () => unknown } | null>(null);
  useEffect(() => () => { taskRef.current?.destroy(); }, []);
  // the middle column's width (the page fits it at 100%)
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth)); ro.observe(el); setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, [p?.id, !!view]); // eslint-disable-line react-hooks/exhaustive-deps -- the column exists once the state is in
  // the page drawn
  useEffect(() => {
    if (!p || !view || !canvasRef.current || !stageW || (p.kind === "pdf" && !doc)) return;
    let alive = true;
    // at 100% the page fills the middle column (S_D); 크게 / 작게 보기 scale it from there
    const w = Math.max(240, Math.round(stageW * view.zoom));
    drawPage(canvasRef.current, p, doc, view.page, w, view.turns[view.page] ?? 0).then(() => { if (alive && canvasRef.current) setPaperH(canvasRef.current.getBoundingClientRect().height); }).catch(() => setBad(true));
    return () => { alive = false; };
  }, [p?.id, p?.pages, doc, view?.page, view?.zoom, view?.turns, stageW]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the view (단 is saved by its own step)
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keep = useCallback((v: NonNullable<typeof view>) => {
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(() => { updateImported(id, { page: v.page, zoom: v.zoom, markerY: v.markerY, markerH: v.markerH, turns: v.turns }).catch(() => {}); }, 400);
  }, [id]);
  const set = (patch: Partial<NonNullable<typeof view>>) => setView(v => { if (!v) return v; const n = { ...v, ...patch }; keep(n); return n; });
  // the memo, saved as it is typed
  const memoT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeMemo = (t: string) => { setMemo(t); if (memoT.current) clearTimeout(memoT.current); memoT.current = setTimeout(() => updateImported(id, { memo: t }).catch(() => {}), 500); };

  // 한 단 끝 / 되돌리기: the 단 and the band move together
  const step = useCallback(async (d: 1 | -1) => {
    const q = cur.current, v = viewRef.current; if (!q || !v || q.row + d < 0) return;
    const y = clamp(v.markerY + d * v.markerH, 0, 1 - v.markerH);
    setView({ ...v, markerY: y });
    await stepRow(q, d, { markerY: y }).catch(() => {});
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (editing || asking) return;
      if (e.key === " " || e.code === "Space") { e.preventDefault(); step(1); }
      else if (e.key === "Backspace") { e.preventDefault(); step(-1); }
    };
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key);
  }, [step, editing, asking]);

  // the band: dragged to move; its lower edge dragged to change its height
  const drag = useRef<{ mode: "move" | "size"; y0: number; top0: number; h0: number } | null>(null);
  const down = (mode: "move" | "size") => (e: RPE<HTMLDivElement>) => {
    if (!view || !paperH) return; e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, y0: e.clientY, top0: view.markerY, h0: view.markerH };
  };
  const move = (e: RPE<HTMLDivElement>) => {
    const d = drag.current; if (!d || !paperH) return;
    const dy = (e.clientY - d.y0) / paperH;
    if (d.mode === "move") setView(v => (v ? { ...v, markerY: clamp(d.top0 + dy, 0, 1 - v.markerH) } : v));
    else setView(v => (v ? { ...v, markerH: clamp(d.h0 + dy, .015, .4 - 0), markerY: Math.min(v.markerY, 1 - clamp(d.h0 + dy, .015, .4)) } : v));
  };
  const up = () => { if (drag.current && view) keep(view); drag.current = null; };

  if (!ready) return null;
  if (!p) return (
    <div className="iv-missing"><p>이 도안을 찾지 못했습니다.</p><Link href="/my" className="my-btn is-sub">나의 도안집으로</Link></div>
  );
  if (!view) return null;
  const pageN = p.pageCount, top = view.markerY * paperH, bh = view.markerH * paperH;
  const zi = ZOOMS.indexOf(view.zoom) >= 0 ? ZOOMS.indexOf(view.zoom) : 2;
  return (
    <div className="iv">
      <aside className="iv-pages">
        <Link href="/my" className="iv-back">← 가져온 도안</Link>
        <ol className="iv-thumbs" aria-label="쪽">
          {Array.from({ length: pageN }, (_, i) => <Thumb key={i} p={{ ...p, turns: view.turns }} doc={doc} idx={i} on={i === view.page} onPick={() => set({ page: i })} />)}
        </ol>
        <p className="iv-count">{view.page + 1} / {pageN}쪽</p>
      </aside>

      <div className="iv-stage" ref={stageRef}>
        {bad ? <p className="iv-bad">이 쪽을 그리지 못했습니다.</p> : (
          <div className="iv-paper" ref={paperRef} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <canvas ref={canvasRef} className="iv-canvas" role="img" aria-label={`${p.title} ${view.page + 1}쪽`} />
            {paperH > 0 && <>
              <div className="iv-done" style={{ height: top }} aria-hidden="true" />
              <div className="iv-band" style={{ top, height: bh }} onPointerDown={down("move")} role="slider" aria-label="줄 표시" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.markerY * 100)} tabIndex={0}
                onKeyDown={e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); set({ markerY: clamp(view.markerY + (e.key === "ArrowDown" ? .005 : -.005), 0, 1 - view.markerH) }); } }}>
                <span className="iv-now" aria-hidden="true">지금</span>
                <span className="iv-grip" onPointerDown={down("size")} aria-hidden="true" />
              </div>
            </>}
          </div>
        )}
      </div>

      <aside className="iv-side">
        <h1 className="iv-title"><span>{p.title}</span></h1>
        <section className="iv-card iv-counter" aria-labelledby="ivRow">
          <p id="ivRow" className="iv-label">지금 뜨는 단</p>
          <div className="iv-count-row">
            <button type="button" className="iv-step" aria-label="되돌리기" disabled={p.row <= 0} onClick={() => step(-1)}>−</button>
            <p className="iv-num" aria-live="polite"><b>{p.row}</b><span>단</span></p>
            <button type="button" className="iv-step" aria-label="한 단 끝" onClick={() => step(1)}>+</button>
          </div>
          <p className="iv-help">줄 표시가 같이 내려갑니다 · Space 한 단 끝</p>
        </section>
        <section className="iv-card iv-memo">
          <label htmlFor="ivMemo" className="iv-label">내 메모</label>
          <textarea id="ivMemo" value={memo ?? ""} maxLength={2000} onChange={e => typeMemo(e.target.value)} />
        </section>
        <p className="iv-links">
          <button type="button" onClick={() => set({ turns: { ...view.turns, [view.page]: ((view.turns[view.page] ?? 0) + 1) % 4 } })}>쪽 돌리기</button>
          <span aria-hidden="true">·</span>
          <button type="button" disabled={zi >= ZOOMS.length - 1} onClick={() => set({ zoom: ZOOMS[zi + 1] })}>크게 보기</button>
          <span aria-hidden="true">·</span>
          <button type="button" disabled={zi <= 0} onClick={() => set({ zoom: ZOOMS[zi - 1] })}>작게 보기</button>
          {view.zoom !== 1 && <span className="iv-zoom">{Math.round(view.zoom * 100)}%</span>}
        </p>
        <p className="iv-links is-sub">
          {p.status === "done"
            ? <button type="button" onClick={() => finishImported(p, false)}>다시 뜨는 중으로</button>
            : <button type="button" onClick={() => finishImported(p, true)}>완성으로 표시</button>}
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => setEditing(true)}>정보 고치기</button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => setAsking(true)}>지우기</button>
        </p>
        {p.status === "done" && <p className="iv-done-note">완성했습니다{p.finishedAt ? ` · ${new Date(p.finishedAt).toLocaleDateString("ko-KR")}` : ""}</p>}
      </aside>

      {editing && <MyImport edit={p} onClose={() => setEditing(false)} />}
      {asking && (
        <div className="my-dim" onMouseDown={e => { if (e.target === e.currentTarget) setAsking(false); }}>
          <div className="my-sheet im-ask" role="alertdialog" aria-modal="true" aria-label="도안 지우기">
            <h2>이 도안을 지우시겠습니까?</h2>
            <p className="my-sheet-text">{p.title} · 되돌릴 수 없습니다.</p>
            <div className="my-sheet-foot">
              <button type="button" className="my-btn is-sub" autoFocus onClick={() => setAsking(false)}>취소</button>
              <button type="button" className="my-btn" onClick={async () => { await removeImported(p.id).catch(() => {}); router.push("/my"); }}>지우기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
