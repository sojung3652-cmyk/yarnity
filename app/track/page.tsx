"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { THEME_EVENT } from "@/components/Nav";
import { drawTrack } from "@/lib/drawMap";
import { clamp, fmt, PART_KO, plan } from "@/lib/pattern";
import type { Project } from "@/lib/types";

function Measure({ p, onApply }: { p: Project; onApply: (h: number) => void }) {
  const pp = plan(p), exp = 6 * pp.g.h;
  const [val, setVal] = useState(fmt(exp));
  const v = +val;
  let preview: React.ReactNode = null;
  if (v > 0) {
    const hN = v / 6, q = plan({ ...p, measuredH: hN }), diff = Math.round((hN / pp.g.h - 1) * 100);
    const lines: [string, number, number][] = [[`바닥 ${p.shape === "circle" ? "지름 " + p.a : "폭 " + p.b}cm까지`, pp.bottomRounds, q.bottomRounds]];
    if (p.object === "bag") lines.push([`몸통 ${p.h}cm까지`, pp.bodyRows, q.bodyRows]);
    preview = <>
      <p className="small muted" style={{ marginBottom: 8 }}>{`${diff === 0 ? "예상과 같아요" : `예상보다 ${Math.abs(diff)}% ${diff > 0 ? "커요" : "작아요"}`} · 한 코 ${fmt(hN * 10)}mm`}</p>
      <div className="compare">{lines.map(([k, a, b]) => <Fragment key={k}><span>{k}</span><s>{a}단</s><span className="muted">→</span><span>{b}단</span></Fragment>)}</div>
    </>;
  }
  return (
    <div className="measure">
      <b>{p.shape === "circle" ? "지름" : "짧은 쪽 폭"}을 재 주세요</b>
      <span className="small muted">예상 {fmt(exp)}cm</span>
      <div className="m-row">
        <label htmlFor="mVal" className="sr">잰 길이 cm</label>
        <input id="mVal" className="txt" type="number" inputMode="decimal" step={0.1} min={1} max={20} value={val} onChange={e => setVal(e.target.value)} />
        <span className="muted">cm</span>
        <button className="btn btn-primary" id="mApply" type="button" onClick={() => { if (v > 0) onApply(v / 6); }}>다시 계산</button>
      </div>
      <div id="mPrev">{preview}</div>
    </div>
  );
}

export default function TrackPage() {
  const { ready, active: p, updateProject } = useApp();
  const router = useRouter();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [wakeOn, setWakeOn] = useState(false);
  const wake = useRef<WakeLockSentinel | null>(null);

  useEffect(() => { if (ready && !p) router.replace("/new"); }, [ready, p, router]);

  const pp = useMemo(() => (p ? plan(p) : null), [p]), total = pp ? pp.rows.length : 0;
  const current = p ? clamp(p.current || 0, 0, total) : 0;

  // persist the clamped position (prototype renderTrack() ended with save())
  useEffect(() => { if (p && p.current !== current) updateProject(p.id, { current }); }, [p, current, updateProject]);

  const step = useCallback((d: number) => { if (!p) return; updateProject(p.id, { current: clamp((p.current || 0) + d, 0, plan(p).rows.length) }); }, [p, updateProject]);

  // canvas: redraw on change, resize (120ms debounce), theme toggle, OS colour-scheme change
  const redraw = useCallback(() => { if (p && pp && cvRef.current) drawTrack(cvRef.current, { ...p, current }, pp); }, [p, pp, current]);
  useEffect(() => {
    redraw();
    let rz: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(rz); rz = setTimeout(redraw, 120); };
    const mq = matchMedia("(prefers-color-scheme: dark)");
    addEventListener("resize", onResize); addEventListener(THEME_EVENT, redraw); mq.addEventListener("change", redraw);
    return () => { clearTimeout(rz); removeEventListener("resize", onResize); removeEventListener(THEME_EVENT, redraw); mq.removeEventListener("change", redraw); };
  }, [redraw]);

  // keyboard: Space = 한 단 끝, Backspace = 되돌리기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest?.("input,select,textarea,button")) return;
      if (e.code === "Space") { e.preventDefault(); step(1); }
      if (e.code === "Backspace") { e.preventDefault(); step(-1); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step]);

  // keep the screen on while tracking
  useEffect(() => {
    const keepAwake = async () => {
      try {
        if ("wakeLock" in navigator && !wake.current) {
          wake.current = await navigator.wakeLock.request("screen"); setWakeOn(true);
          wake.current.addEventListener("release", () => { wake.current = null; setWakeOn(false); });
        }
      } catch {}
    };
    keepAwake();
    const onVis = () => { if (document.visibilityState === "visible") keepAwake(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); wake.current?.release().catch(() => {}); };
  }, []);

  if (!ready || !p || !pp) return <main id="view-track" />;

  const done = current >= total, r = pp.rows[Math.min(current, total - 1)];
  const nx = pp.rows[current + 1];
  const flag = !done && r.part === "body" && pp.rows[r.idx - 1].part === "bottom" ? "여기부터 늘림 없이 위로."
    : !done && r.label === "테두리 1" ? "몸통 끝. 테두리로 마무리해요." : "";
  const showMeasure = current === 3 && !p.measuredH && pp.bottomRounds > 3;

  return (
    <main id="view-track">
      <div className="app-head">
        <div><div className="steps"><span>준비물과 모양</span><span>도안</span><span className="on">따라 뜨기</span></div><h1 id="trTitle">{p.name}</h1></div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><span className="small muted" id="wakeNote">{wakeOn ? "화면 켜짐 유지 중" : ""}</span><Link className="btn btn-line" href="/pattern">전체 도안</Link></div>
      </div>
      <div className="grid-track">
        <div className="map">
          <canvas id="trCanvas" ref={cvRef} role="img" aria-label="코 지도" />
          <div className="legend">
            <span><i className="sw" style={{ background: "var(--dot-now)" }} />지금 뜨는 단</span>
            <span><i className="sw" style={{ border: "1.5px solid var(--dot-now)" }} />늘림</span>
            <span><i className="sw" style={{ background: "var(--dot)" }} />뜬 코</span>
          </div>
        </div>
        <div className="card">
          <div className="meta"><span id="trPart">{done ? "완성" : `${PART_KO[r.part]} · ${r.label}`}</span><span id="trCount">{done ? "" : (r.part === "bottom" && (r.no as number) > 1 ? `${pp.rows[r.idx - 1].n} → ${r.n}코` : `${r.n}코`)}</span></div>
          <p className="now-row" id="trHow">{done ? "마지막 단까지 다 떴어요." : r.how}</p>
          <p className="small muted" id="trWhy">{done ? "" : r.why}</p>
          <div className="bar" aria-hidden="true"><i id="trBar" style={{ width: (current / total * 100) + "%" }} /></div>
          <div id="trFlag">{flag && <p className="flag">{flag}</p>}</div>
          <div id="trMeasure">{showMeasure && <Measure key={p.id} p={p} onApply={h => updateProject(p.id, { measuredH: h })} />}</div>
          <div className="acts">
            <button className="big undo" id="undoBtn" type="button" aria-label="한 단 되돌리기" disabled={current === 0} onClick={() => step(-1)}>−1</button>
            <button className="big done" id="doneBtn" type="button" disabled={done} onClick={() => step(1)}><span>한 단 끝</span><small id="doneNext">{done ? "" : (nx ? `다음 ${nx.label} · ${nx.n}코` : "마지막 단")}</small></button>
          </div>
          <p className="kbd"><kbd>Space</kbd> 한 단 끝 · <kbd>Backspace</kbd> 되돌리기</p>
          <div><span className="small muted">다음 단</span><div id="trNext">
            {pp.rows.slice(current + 1, current + 4).map(x => <div key={x.idx} className="row"><span className="no">{x.label}</span><span>{x.how}</span><span className="cnt">{x.n + "코"}</span></div>)}
          </div></div>
        </div>
      </div>
    </main>
  );
}
