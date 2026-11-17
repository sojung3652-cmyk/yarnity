"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { drawTrack } from "@/lib/drawMap";
import { StitchLegend } from "@/components/StitchLegend";
import "../pattern/pattern.css";
import "./track.css";
import type { StitchSym } from "@/lib/stitchSymbols";
import { clamp, fmt, PART_KO, plan, withChains, type Row } from "@/lib/pattern";
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

/** Flat pieces and tubes: after 5 rows, measure the width (circumference) and the height of those 5 rows.
 *  Stitch width / height are recalculated and the remaining rows corrected; the stitch count already on
 *  the hook stays. A width more than 10% off the plan is better started over. */
function MeasureRows({ p, onApply }: { p: Project; onApply: (h: number, w: number) => void }) {
  const pp = plan(p), tube = p.object === "tube", n = pp.last, target = p.a;
  const [wv, setW] = useState(fmt(n * pp.g.w)), [hv, setH] = useState(fmt(5 * pp.g.h));
  const w = +wv, h = +hv;
  let preview: React.ReactNode = null;
  if (w > 0 && h > 0) {
    const q = plan({ ...p, measuredH: h / 5, measuredW: w / n }), off = Math.round((w / target - 1) * 100);
    preview = <>
      <p className="small muted" style={{ marginBottom: 8 }}>{`${tube ? "둘레" : "폭"} ${off === 0 ? "계획과 같아요" : `계획보다 ${Math.abs(off)}% ${off > 0 ? "넓어요" : "좁아요"}`} · 한 코 ${fmt((h / 5) * 10)}mm 높이`}</p>
      <div className="compare"><span>{`${tube ? "높이" : "길이"} ${tube ? p.h : p.b}cm까지`}</span><s>{pp.bodyRows}단</s><span className="muted">→</span><span>{q.bodyRows}단</span></div>
      {Math.abs(off) >= 10 && <p className="flag" style={{ marginTop: 8 }}>{tube ? "둘레" : "폭"}가 10% 넘게 달라요. 바늘이나 실을 바꿔서 다시 시작하는 걸 추천해요.</p>}
    </>;
  }
  return (
    <div className="measure">
      <b>5단을 떴어요. {tube ? "둘레" : "폭"}와 5단 높이를 재 주세요</b>
      <span className="small muted">{`예상 ${tube ? "둘레" : "폭"} ${fmt(n * pp.g.w)}cm · 5단 높이 ${fmt(5 * pp.g.h)}cm (코 수 ${n}코는 그대로 둬요)`}</span>
      <div className="m-row">
        <label htmlFor="mW" className="sr">{tube ? "둘레" : "폭"} cm</label>
        <input id="mW" className="txt" type="number" inputMode="decimal" step={0.1} min={1} value={wv} onChange={e => setW(e.target.value)} /><span className="muted">cm</span>
        <label htmlFor="mH" className="sr">5단 높이 cm</label>
        <input id="mH" className="txt" type="number" inputMode="decimal" step={0.1} min={0.5} value={hv} onChange={e => setH(e.target.value)} /><span className="muted">cm</span>
        <button className="btn btn-primary" id="mApplyRows" type="button" onClick={() => { if (w > 0 && h > 0) onApply(h / 5, w / n); }}>다시 계산</button>
      </div>
      <div id="mPrev">{preview}</div>
    </div>
  );
}

// 따라 뜨기 on the pattern sheet (Kim's pick after trying the focus mode: everything in view, like the
// pattern sheet): one sheet of cream paper - a header (the work, the section, how far along), the stitch
// chart on graph paper on the left (always visible, the row being made in lavender) with its key, the
// row being made as an index card on the right with a wide ribbon for 한 단 끝 (and 되돌리기), and the
// rows below it: the last ones done ticked in pencil, this one marked, the next ones; "전체 단" shows all.
// Space = 한 단 끝, Backspace = 되돌리기. The screen is kept on while this page is open.
export default function TrackPage() {
  const { ready, active: p, updateProject } = useApp();
  const router = useRouter();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [wakeOn, setWakeOn] = useState(false);
  const [allRows, setAllRows] = useState(false);
  // 이전 단 / 다음 단: the card can show another row to read ahead or look back; the progress stays put
  // (only 한 단 끝 / 되돌리기 move it). Back to the row being made whenever the progress moves.
  const [view, setView] = useState<number | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);

  useEffect(() => { if (ready && !p) router.replace("/new"); }, [ready, p, router]);

  const pp = useMemo(() => (p ? withChains(plan(p)) : null), [p]), total = pp ? pp.rows.length : 0;
  const current = p ? clamp(p.current || 0, 0, total) : 0;

  // persist the clamped position (prototype renderTrack() ended with save())
  useEffect(() => { if (p && p.current !== current) updateProject(p.id, { current }); }, [p, current, updateProject]);

  // knitting a row makes the work 뜨는 중 again (or 완성 at the last row)
  const step = useCallback((d: number) => {
    if (!p) return; const total = plan(p).rows.length, cur = clamp((p.current || 0) + d, 0, total);
    updateProject(p.id, { current: cur, status: cur >= total ? "done" : "knitting", pausedAt: null });
  }, [p, updateProject]);

  // canvas: redraw on change and on resize (120ms debounce)
  const redraw = useCallback(() => { if (p && pp && cvRef.current) drawTrack(cvRef.current, { ...p, current }, pp); }, [p, pp, current]);
  useEffect(() => {
    redraw();
    let rz: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(rz); rz = setTimeout(redraw, 120); };
    addEventListener("resize", onResize);
    return () => { clearTimeout(rz); removeEventListener("resize", onResize); };
  }, [redraw]);

  useEffect(() => { setView(null); }, [current]);
  const peek = useCallback((d: number) => setView(v => clamp((v ?? Math.min(current, total - 1)) + d, 0, Math.max(0, total - 1))), [current, total]);
  // keyboard: Space = 한 단 끝, Backspace = 되돌리기, ← / → = 이전 단 / 다음 단 (to read)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest?.("input,select,textarea,button")) return;
      if (e.code === "Space") { e.preventDefault(); step(1); }
      if (e.code === "Backspace") { e.preventDefault(); step(-1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); peek(e.key === "ArrowLeft" ? -1 : 1); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, peek]);

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
  const flag = !done && r.part === "rounds" && r.no === 1 ? "고리로 둥글게 이어 떠요. 단마다 첫 코에 빼뜨기로 닫아요."
    : !done && r.part === "rows" && r.no === 2 ? "단 끝마다 사슬 1코를 세우고 뒤집어요."
    : !done && r.part === "body" && pp.rows[r.idx - 1].part === "bottom" ? (pp.rows.some(x => x.part === "body" && x.inc) ? "여기부터 위로. 단마다 늘림 수만큼 고르게 늘려요." : "여기부터 늘림 없이 위로.")
    : !done && r.part === "flap" && r.label === "덮개 1" ? "뒤판 가운데에서 시작해 왕복으로 떠요."
    : !done && r.label === "테두리 1" ? "몸통 끝. 테두리로 마무리해요."
    : !done && (r as Row & { turn?: number }).turn && !pp.rows.slice(0, r.idx).some(x => (x as Row & { turn?: number }).turn) ? (p.object === "rows" ? "단 끝에서 기둥사슬 1코를 세우고 뒤집어서 떠요. 짧은뜨기의 기둥사슬은 코 수에 세지 않아요." : "기둥사슬은 앞 단을 빼뜨기로 닫은 바로 그 자리 위에 세워요. 짧은뜨기의 기둥사슬은 코 수에 세지 않아요.") : "";
  const flat = p.object === "rows" || p.object === "tube";
  const showMeasure = !flat && current === 3 && !p.measuredH && pp.bottomRounds > 3;
  const showMeasureRows = flat && current === 6 && !p.measuredH && pp.bodyRows > 5; // start chain + 5 rows done
  // the symbols this work's chart uses, in the order of a symbol table
  const syms: StitchSym[] = flat
    ? ["ch", "sc"]
    : [p.shape === "circle" ? "ring" : "ch", "sc", "inc", ...(p.object === "bag" && pp.rows.some(x => x.part === "rim") ? ["sl" as const] : [])];
  // sections in pattern order (01 바닥, 02 몸통...), as on the pattern sheet
  const parts = pp.rows.map(x => x.part).filter((x, i, a) => a.indexOf(x) === i);
  const secNo = (part: Row["part"]) => String(parts.indexOf(part) + 1).padStart(2, "0");
  // the row the card shows: the one being made, or another one looked at with 이전 단 / 다음 단
  const v = view ?? Math.min(current, total - 1), vr = pp.rows[v], other = view != null && v !== current;
  const fromN = pp.rows[vr.idx - 1] && ((vr.part === "bottom" && (vr.no as number) > 1) || (vr.part === "body" && vr.inc)) ? pp.rows[vr.idx - 1].n : null;
  // the rows under the card: two done, this one, five to come (or all of them)
  const shown = allRows ? pp.rows : pp.rows.slice(Math.max(0, current - 2), current + 6);

  return (
    <main id="view-track" className="tk-main">
      <article className="tk-sheet-page" aria-labelledby="trTitle">
        <header className="tk-head">
          <div className="tk-head-l">
            <p className="tk-kicker" lang="en">Yarnity · Knitting along</p>
            <h1 id="trTitle">{p.name}</h1>
          </div>
          <div className="tk-head-r">
            <span className="tk-wake" id="wakeNote">{wakeOn ? "화면 켜짐 유지 중" : ""}</span>
            <Link className="ps-label tk-label" href="/pattern"><span>도안 보기</span></Link>
          </div>
        </header>
        <div className="tk-progress">
          <span className="tk-sec" id="trPart">{done ? "완성" : r.part === "start" ? <><b>{secNo(r.part)}</b>시작 사슬</> : <><b>{secNo(r.part)}</b>{PART_KO[r.part]} · {r.label}</>}</span>
          <div className="tk-bar" aria-hidden="true"><i id="trBar" style={{ width: (current / total * 100) + "%" }} /></div>
          <span className="tk-pos">{Math.min(current + 1, total)}<i>/</i>{total}</span>
        </div>

        <div className="tk-grid">
          {/* the chart, always in view */}
          <section className="tk-chart" aria-label="코 도안">
            <h2 className="tk-box-title">코 도안</h2>
            <div className="tk-graph"><canvas id="trCanvas" ref={cvRef} role="img" aria-label="코 도안" /></div>
            <StitchLegend syms={syms} />
          </section>

          <section className="tk-side" aria-label="지금 뜨는 단">
            {/* the row being made, as an index card */}
            <div className={"tk-card" + (other ? " is-other" : "")}>
              <div className="tk-peek">
                <button type="button" onClick={() => peek(-1)} disabled={v <= 0}>‹ 이전 단</button>
                <span className="tk-peek-state" aria-live="polite">{other ? (v < current ? "지난 단 · 다 떴어요" : "앞으로 뜰 단") : done ? "" : "지금 뜨는 단"}
                  {other && <button type="button" className="tk-peek-back" onClick={() => setView(null)}>지금 단으로</button>}</span>
                <button type="button" onClick={() => peek(1)} disabled={v >= total - 1}>다음 단 ›</button>
              </div>
              {done && !other ? (
                <>
                  <p className="tk-row">완성</p>
                  <p className="tk-how" id="trHow">마지막 단까지 다 떴어요.</p>
                  <p className="tk-done-links"><Link href="/pattern">도안 다시 보기</Link><Link href="/mine">사진 남기기 (내 작품)</Link></p>
                </>
              ) : (
                <>
                  <div className="tk-card-top"><span className="tk-row">{vr.label}</span>
                    <span className="tk-count" id="trCount">{fromN != null && <>{fromN}<i>→</i></>}{vr.n}<span>코</span></span></div>
                  <p className="tk-how" id="trHow">{vr.how}</p>
                  <p className="tk-why" id="trWhy">{vr.why}</p>
                  {!other && flag && <p className="flag tk-flag" id="trFlag">{flag}</p>}
                  {!other && <div id="trMeasure">{showMeasure && <Measure key={p.id} p={p} onApply={h => updateProject(p.id, { measuredH: h })} />}
                    {showMeasureRows && <MeasureRows key={p.id} p={p} onApply={(h, w) => updateProject(p.id, { measuredH: h, measuredW: w })} />}</div>}
                </>
              )}
            </div>

            {/* a wide ribbon to tap, and a small undo beside it */}
            <div className="tk-acts">
              <button className="tk-undo" id="undoBtn" type="button" aria-label="한 단 되돌리기" disabled={current === 0} onClick={() => step(-1)}>↶<span>되돌리기</span></button>
              <button className="tk-ribbon" id="doneBtn" type="button" disabled={done} onClick={() => step(1)}>
                <span className="tk-ribbon-face">
                  <span className="tk-ribbon-main">한 단 끝</span>
                  <span className="tk-ribbon-next" id="doneNext">{done ? "" : (nx ? `다음 ${nx.label} · ${nx.n}코` : "마지막 단")}</span>
                </span>
              </button>
            </div>
            <div className="tk-keys" aria-label="키보드로 단 이동">
              <span className="tk-keys-title">키보드</span>
              <span><kbd>Space</kbd>한 단 끝</span>
              <span><kbd>Backspace</kbd>되돌리기</span>
              <span><kbd>←</kbd><kbd>→</kbd>이전 · 다음 단 보기</span>
            </div>

            {/* the rows around this one */}
            <div className="tk-rows">
              <div className="tk-rows-head"><h2 className="tk-box-title">단 목록</h2>
                <button type="button" className="tk-more" aria-expanded={allRows} onClick={() => setAllRows(a => !a)}>{allRows ? "가까운 단만" : `전체 ${total}단 보기`}</button></div>
              <ol className="tk-list" id="trNext">
                {shown.map(x => (
                  <li key={x.idx} className={x.idx < current ? "is-done" : x.idx === current ? "is-now" : ""}>
                    <span className="tk-l-no">{x.label}</span><span className="tk-l-how">{x.how}</span><span className="tk-l-n">{x.n}<small>코</small></span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
