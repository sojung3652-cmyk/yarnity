"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { drawTrack } from "@/lib/drawMap";
import { StitchLegend } from "@/components/StitchLegend";
import { DiaryIcon, StitchButton } from "@/components/diary/Diary";
import "../pattern/pattern.css";
import { WorkMore } from "@/components/WorkMore";
import { useYarn3D, YarnPreviewButton } from "@/src/features/yarn3d/YarnPreviewButton";
import "./track.css";
import type { StitchSym } from "@/lib/stitchSymbols";
import { clamp, fmt, PART_KO, plan, type Row } from "@/lib/pattern";
import { partName, shownPlan } from "@/lib/knit";
import type { Project } from "@/lib/types";
import { useMobile } from "@/components/mobile/useMobile";
import { MobileTopBar, MoreButton } from "@/components/mobile/MobileTopBar";
import { MoreSheet, SAVED_KEY } from "@/components/mobile/MoreSheet";
import { logRow, logTime } from "@/lib/knitLog";
import { GoldX } from "@/components/GoldX";

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
      <p className="small muted" style={{ marginBottom: 8 }}>{`${diff === 0 ? "예상과 같습니다" : `예상보다 ${Math.abs(diff)}% ${diff > 0 ? "큽니다" : "작습니다"}`} · 한 코 ${fmt(hN * 10)}mm`}</p>
      <div className="compare">{lines.map(([k, a, b]) => <Fragment key={k}><span>{k}</span><s>{a}단</s><span className="muted">→</span><span>{b}단</span></Fragment>)}</div>
    </>;
  }
  return (
    <div className="measure">
      <b>{p.shape === "circle" ? "지름" : "짧은 쪽 폭"}을 재 주십시오</b>
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
      <p className="small muted" style={{ marginBottom: 8 }}>{`${tube ? "둘레" : "폭"} ${off === 0 ? "계획과 같습니다" : `계획보다 ${Math.abs(off)}% ${off > 0 ? "넓습니다" : "좁습니다"}`} · 한 코 ${fmt((h / 5) * 10)}mm 높이`}</p>
      <div className="compare"><span>{`${tube ? "높이" : "길이"} ${tube ? p.h : p.b}cm까지`}</span><s>{pp.bodyRows}단</s><span className="muted">→</span><span>{q.bodyRows}단</span></div>
      {Math.abs(off) >= 10 && <p className="flag" style={{ marginTop: 8 }}>{tube ? "둘레" : "폭"}가 10% 넘게 다릅니다. 바늘이나 실을 바꿔서 다시 시작하는 걸 추천합니다.</p>}
    </>;
  }
  return (
    <div className="measure">
      <b>5단을 떴습니다. {tube ? "둘레" : "폭"}와 5단 높이를 재 주십시오</b>
      <span className="small muted">{`예상 ${tube ? "둘레" : "폭"} ${fmt(n * pp.g.w)}cm · 5단 높이 ${fmt(5 * pp.g.h)}cm (코 수 ${n}코는 그대로 둡니다)`}</span>
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
// phones: the same screen, laid out for a phone (its own screen, outside the book; screens-mobile.css)
export default function TrackPage() {
  return <TrackScreen />;
}

/** Phones: the measuring card at 3단 끝 (rounds; the flat pieces keep MeasureRows): the same numbers as Measure. */
function PhoneMeasure({ p, onApply, onLater }: { p: Project; onApply: (h: number) => void; onLater: () => void }) {
  const pp = plan(p), exp = 6 * pp.g.h, [val, setVal] = useState(fmt(exp)), v = +val;
  return (
    <div className="mst-measure">
      <p className="mst-measure-title">3단 끝! 지름을 재 보시겠습니까?</p>
      <p className="mst-measure-text">지금까지 뜬 바닥의 지름을 재면, 남은 단을 내 손에 맞게 다시 계산합니다.</p>
      <div className="mst-measure-row">
        <label className="sr" htmlFor="mstVal">잰 지름 cm</label>
        <input id="mstVal" type="number" inputMode="decimal" step={0.1} min={1} max={20} value={val} onChange={e => setVal(e.target.value)} />
        <span>cm</span>
        <button type="button" className="mst-yellow" onClick={() => { if (v > 0) onApply(v / 6); }}><span>다시 계산</span></button>
      </div>
      <p className="mst-measure-foot">예상은 약 {fmt(exp)}cm입니다 · <button type="button" onClick={onLater}>나중에 재겠습니다</button></p>
    </div>
  );
}

export function TrackScreen() {
  const { ready, active: p, updateProject, removeProjects, setChat } = useApp();
  const router = useRouter();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [wakeOn, setWakeOn] = useState(false);
  const [allRows, setAllRows] = useState(false);
  // 이전 단 / 다음 단: the card can show another row to read ahead or look back; the progress stays put
  // (only 한 단 끝 / 되돌리기 move it). Back to the row being made whenever the progress moves.
  const [view, setView] = useState<number | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const m = useMobile();
  // phones: the ··· menu, the chart in full screen, "나중에 잴게요"
  const [more, setMore] = useState(false), [bigChart, setBigChart] = useState(false), [measureLater, setMeasureLater] = useState(false);
  const bigRef = useRef<HTMLCanvasElement>(null), [bigZoom, setBigZoom] = useState(1);

  useEffect(() => { if (ready && !p) router.replace("/new"); }, [ready, p, router]);

  const pp = useMemo(() => (p ? shownPlan(p) : null), [p]), total = pp ? pp.rows.length : 0;
  // phones: 3D로 보기 in the ··· sheet (the web has it as a label in the header)
  const y3 = useYarn3D(p, pp);
  const current = p ? clamp(p.current || 0, 0, total) : 0;

  // persist the clamped position (prototype renderTrack() ended with save())
  useEffect(() => { if (p && p.current !== current) updateProject(p.id, { current }); }, [p, current, updateProject]);

  // knitting a row makes the work 뜨는 중 again (or 완성 at the last row)
  const step = useCallback((d: number) => {
    if (!p) return; const total = plan(p).rows.length, cur = clamp((p.current || 0) + d, 0, total);
    // My Page's 나의 기록 (뜬 날, 완성한 날) counts the rows that really moved
    if (cur !== (p.current || 0)) logRow(p.id, cur - (p.current || 0), cur >= total);
    updateProject(p.id, { current: cur, status: cur >= total ? "done" : "knitting", pausedAt: null });
  }, [p, updateProject]);

  // My Page's 뜬 시간: the time this page is open and visible
  useEffect(() => {
    let since = document.visibilityState === "visible" ? Date.now() : 0;
    const flush = () => { if (since) { logTime(Date.now() - since); since = 0; } };
    const onVis = () => { if (document.visibilityState === "visible") since = Date.now(); else flush(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); flush(); };
  }, []);

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
  // phones: leaving 따라 뜨기 says where it was saved, on the next screen (MoreSheet SavedToast)
  const savedAt = useRef("");
  useEffect(() => { savedAt.current = pp && current > 0 ? pp.rows[Math.min(current, total) - 1].label : ""; }, [pp, current, total]);
  useEffect(() => () => { if (m && savedAt.current) try { sessionStorage.setItem(SAVED_KEY, `${savedAt.current}까지 저장했습니다`); } catch {} }, [m]);
  // phones: the chart in full screen
  useEffect(() => { if (bigChart && p && pp && bigRef.current) drawTrack(bigRef.current, { ...p, current }, pp); }, [bigChart, bigZoom, p, pp, current]);
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
  const flag = !done && r.part === "rounds" && r.no === 1 ? "고리로 둥글게 이어 뜹니다. 단마다 첫 코에 빼뜨기로 닫습니다."
    : !done && r.part === "rows" && r.no === 2 ? "단 끝마다 사슬 1코를 세우고 뒤집습니다."
    : !done && r.part === "body" && pp.rows[r.idx - 1].part === "bottom" ? (pp.rows.some(x => x.part === "body" && x.inc) ? "여기부터 위로. 단마다 늘림 수만큼 고르게 늘립니다." : "여기부터 늘림 없이 위로.")
    : !done && r.part === "flap" && r.label === "덮개 1" ? "뒤판 가운데에서 시작해 왕복으로 뜹니다."
    : !done && r.label === "테두리 1" ? "몸통 끝. 테두리로 마무리합니다."
    : !done && (r as Row & { turn?: number }).turn && !pp.rows.slice(0, r.idx).some(x => (x as Row & { turn?: number }).turn) ? (p.object === "rows" ? "단 끝에서 기둥사슬 1코를 세우고 뒤집어서 뜹니다. 짧은뜨기의 기둥사슬은 코 수에 세지 않습니다." : "기둥사슬은 앞 단을 빼뜨기로 닫은 바로 그 자리 위에 세웁니다. 짧은뜨기의 기둥사슬은 코 수에 세지 않습니다.") : "";
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

  // phones: its own screen (screens-mobile.css): the bar, where you are, the row as a card (이전 / 다음 단 to
  // read ahead), a small chart (or the measuring card at 3단 끝), and 되돌리기 + 한 단 끝 at the foot
  if (m) {
    const part = partName(r.part, p!);
    const measuring = !measureLater && (showMeasure || showMeasureRows);
    return (
      <main id="view-track" className="ms-screen mst">
        <MobileTopBar back={() => router.push("/pattern")} right={<MoreButton onClick={() => setMore(true)} />} />
        <h1 className="mst-name">{p.name}</h1>
        <div className="mst-progress">
          <span className="mst-part"><b>{secNo(r.part)}</b> {part}</span>
          <span className="mst-bar" aria-hidden="true"><i style={{ width: (current / total * 100) + "%" }} /></span>
          <span className="mst-pos"><b>{Math.min(current + (done ? 0 : 1), total)}</b> / {total}단</span>
        </div>
        <section className="mst-card" aria-label="지금 뜨는 단">
          <div className="mst-peek">
            <button type="button" onClick={() => peek(-1)} disabled={v <= 0}>‹ 이전 단</button>
            <span aria-live="polite">{other ? (v < current ? "지난 단" : "앞으로 뜰 단") : done ? "완성" : "지금 뜨는 단"}{other && <button type="button" className="mst-now" onClick={() => setView(null)}>지금 단으로</button>}</span>
            <button type="button" onClick={() => peek(1)} disabled={v >= total - 1}>다음 단 ›</button>
          </div>
          {done && !other ? (
            <><p className="mst-row">완성</p><p className="mst-how">마지막 단까지 다 떴습니다.</p></>
          ) : (
            <>
              <div className="mst-top"><span className="mst-row">{vr.label}</span><span className="mst-count">{fromN != null && <small>{fromN}→</small>}<b>{vr.n}</b> 코</span></div>
              <p className="mst-how">{vr.how}</p>
              <p className="mst-why">{vr.why || "시작"}</p>
              {!other && flag && <p className="mst-tip">{flag}</p>}
            </>
          )}
        </section>
        {measuring ? (
          showMeasure
            ? <PhoneMeasure key={p.id} p={p} onApply={h => updateProject(p.id, { measuredH: h })} onLater={() => setMeasureLater(true)} />
            : <div className="mst-measure"><p className="mst-measure-title">5단까지 떴습니다! 폭과 높이를 재 보시겠습니까?</p><MeasureRows key={p.id} p={p} onApply={(h, w) => updateProject(p.id, { measuredH: h, measuredW: w })} />
                <p className="mst-measure-foot"><button type="button" onClick={() => setMeasureLater(true)}>나중에 재겠습니다</button></p></div>
        ) : (
          <section className="mst-chart" aria-label="코 도안">
            <div className="mst-chart-pic"><canvas ref={cvRef} role="img" aria-label="코 도안" /></div>
            <div><p className="mst-chart-title">코 도안</p><p className="mst-chart-text">진하게 보이는 줄이 지금 뜨는 단입니다.</p>
              <button type="button" className="mst-link" onClick={() => setBigChart(true)}>크게 보기</button></div>
          </section>
        )}
        {wakeOn && <p className="mst-wake">● 화면 켜짐 유지 중</p>}
        <div className="ms-foot">
          <div className="ms-foot-row">
            <StitchButton icon={DiaryIcon.undo} patch="/brand/btn_undo.webp" label="되돌리기" aria-label="한 단 되돌리기" disabled={current === 0} onClick={() => step(-1)} />
            <div className="ms-go">
              {/* the slim lavender lace: 한 단 끝 alone on its satin (two lines crowded it, Kim); the next row under it */}
              <button type="button" className="tk-patch tk-patch-fill" disabled={done} onClick={() => step(1)}><span className="tk-done-main">한 단 끝</span></button>
              <p className="ms-go-sub">{done ? "다 떴습니다" : nx ? `다음 ${nx.label} · ${nx.n}코` : "마지막 단"}</p>
            </div>
            {/* Yarni right beside 한 단 끝 (Kim): the AI badge patch, the lace shorter by its width */}
            <StitchButton icon={null} patch="/brand/ai_badge.webp" label="Yarni" aria-label="Yarni와 상의하기" onClick={() => setChat(c => ({ ...c, open: true }))} />
          </div>
        </div>
        {bigChart && (
          <div className="mst-big" role="dialog" aria-modal="true" aria-label="코 도안 크게 보기">
            <div className="mst-big-bar"><span>코 도안 · {vr.label}</span>
              <button type="button" aria-label="작게" onClick={() => setBigZoom(z => Math.max(1, z - 0.5))}>−</button>
              <button type="button" aria-label="크게" onClick={() => setBigZoom(z => Math.min(3, z + 0.5))}>+</button>
              <button type="button" aria-label="닫기" onClick={() => { setBigChart(false); setBigZoom(1); }}><GoldX /></button></div>
            <div className="mst-big-pic"><canvas ref={bigRef} style={{ width: `${bigZoom * 100}%`, aspectRatio: "1" }} /></div>
          </div>
        )}
        {more && (
          <MoreSheet title="나가도 지금 단까지 저장됩니다" onClose={() => setMore(false)} items={[
            { key: "sheet", icon: "sheet", label: "도안 전체 보기", onClick: () => router.push("/pattern") },
            ...(y3.supported ? [{ key: "3d", icon: "cube", label: "3D로 보기", onClick: () => { setMore(false); y3.show(); } }] : []),
            { key: "again", icon: "again", label: "처음 단부터 다시", danger: true, confirm: "지금까지 뜬 단을 지우고 1단부터 다시 하시겠습니까?", onClick: () => { setMore(false); updateProject(p.id, { current: 0, status: "knitting", pausedAt: null }); } },
            // the work itself, from where it is being knitted (Kim: there was no delete for it here)
            { key: "delete", icon: "trash", label: "이 작품 지우기", danger: true, confirm: "이 작품과 뜬 기록을 지우시겠습니까? 되돌릴 수 없습니다.", onClick: () => { setMore(false); removeProjects([p.id]); router.push("/mine"); } },
          ]} />
        )}
        {y3.node}
      </main>
    );
  }

  return (
    <main id="view-track" className="tk-main">
      <article className="tk-sheet-page" aria-labelledby="trTitle">
        <header className="tk-head">
          <div className="tk-head-l">
            {/* back to 나의 도안집 (web /my; Kim: there was no way back) */}
            <Link className="tk-back" href="/my"><span aria-hidden="true">‹</span> 나의 도안집</Link>
            <p className="tk-kicker" lang="en">Yarnity · Knitting{" "}along</p>
            <h1 id="trTitle">{p.name}</h1>
          </div>
          <div className="tk-head-r">
            <span className="tk-wake" id="wakeNote">{wakeOn ? "화면 켜짐 유지 중" : ""}</span>
            <Link className="ps-label tk-label" href="/pattern"><span>도안 보기</span></Link>
            <YarnPreviewButton source={p} plan={pp} look="ps" />
            {/* the work's ··· at the right end of the title row (Kim) */}
            <WorkMore p={p} />
          </div>
        </header>
        <div className="tk-progress">
          <span className="tk-sec" id="trPart">{done ? "완성" : r.part === "start" ? <><b>{secNo(r.part)}</b>{partName(r.part, p!)}</> : <><b>{secNo(r.part)}</b>{PART_KO[r.part]} · {r.label}</>}</span>
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
                <span className="tk-peek-state" aria-live="polite">{other ? (v < current ? "지난 단 · 다 떴습니다" : "앞으로 뜰 단") : done ? "" : "지금 뜨는 단"}
                  {other && <button type="button" className="tk-peek-back" onClick={() => setView(null)}>지금 단으로</button>}</span>
                <button type="button" onClick={() => peek(1)} disabled={v >= total - 1}>다음 단 ›</button>
              </div>
              {done && !other ? (
                <>
                  <p className="tk-row">완성</p>
                  <p className="tk-how" id="trHow">마지막 단까지 다 떴습니다.</p>
                  <p className="tk-done-links"><Link href="/pattern">도안 다시 보기</Link><Link href="/mine">사진 남기기 (나의 도안집)</Link></p>
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

            {/* Girl's Diary (components/diary): a round cloth undo, and the lavender lace tag to tap */}
            <div className="tk-acts">
              <StitchButton icon={DiaryIcon.undo} patch="/brand/btn_undo.webp" label="되돌리기" id="undoBtn" aria-label="한 단 되돌리기" disabled={current === 0} onClick={() => step(-1)} />
              {/* 한 단 끝 on the cloth label 뜨개 사전 uses (Kim): the glossary's baby-pink patch, one stretched piece */}
              <button type="button" className="tk-patch tk-done" id="doneBtn" disabled={done} onClick={() => step(1)}>
                <span className="tk-done-main">한 단 끝</span>
                <small id="doneNext">{done ? "" : (nx ? `다음 ${nx.label} · ${nx.n}코` : "마지막 단")}</small>
              </button>
            </div>
            {/* the keys as a small paper note taped under the ribbon (Kim: the key caps felt too digital) */}
            <p className="tk-keys">
              <span className="tk-keys-tape" aria-hidden="true" />
              <b>스페이스</b>로 한 단 끝, <b>백스페이스</b>로 되돌리고, <b>← →</b>로 이전·다음 단을 넘겨 봅니다.
            </p>

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
