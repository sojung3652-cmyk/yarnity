"use client";
// The 3D work screen (web, wide screens; Kim: Photoshop's layout as the reference). Over the whole screen:
//   left    a strip of tools - 돌리기 / 옮기기 / 확대 / 재기 say what dragging does, 순서 plays the order
//   top     the way back, the piece's name, the picked tool's options (보는 방향, 실 / 구조)
//   centre  the 3D alone, the whole piece in view
//   right   panels: in 도안 만들기 the yarn and the size, changed here and seen at once (the book takes the
//           same values); elsewhere what the pattern is made of, and other yarns to look at; then its parts
//   bottom  the size in one line
// Phones keep YarnPreview.tsx as it is (YarnPreviewButton picks). The engine loads here, and everything it
// made is disposed on the way out; the book's canvas and its 3D page wait meanwhile (bookPause).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ClothLabel } from "@/components/newbook/ClothLabel";
import type { YarnInfo, YarnLook, YarnMaterial, YarnPattern, YarnRule, YarnViewer } from "./engine";
import { bookPause } from "./pause";
import "./yarn-work.css";

export interface WorkExtra {
  title?: string; sub?: string;
  /** the size the pattern is made for (the engine's own measure of the 3D is shown when missing) */
  caption?: string;
  /** 재기: the sizes the pattern is made for, [across, up or deep] in cm, written on the measuring lines (the
   *  engine's own measure of its 3D is written when missing) */
  dims?: [number, number];
  /** panels that change the pattern (도안 만들기) */
  panel?: ReactNode;
  /** the piece's parts in the order they are made: [name, counts] */
  parts?: [string, string][];
  backLabel?: string;
  onClosed?: () => void;
  /** 3D로 보면서 만들기 (도안 만들기, Kim): the wizard's own step in the right column - where you are among the
   *  steps, the step's question and inputs, 이전 / 다음 at the foot. Enter goes on, as in the book. */
  making?: { tabs: string[]; cur: number; title: string; body: ReactNode; back?: () => void; next: () => void; nextLabel: string; blocked?: boolean };
  /** nothing to draw yet (no item picked): the stage says so instead of showing a piece nobody chose */
  empty?: boolean;
}

type Tool = "rotate" | "pan" | "zoom" | "ruler";
const MATS: [YarnMaterial, string][] = [["cotton", "면"], ["wool", "울"], ["cashmere", "캐시미어"], ["alpaca", "알파카"], ["mohair", "모헤어"], ["angora", "앙고라"], ["sleep", "수면사"], ["chenille", "셔닐"], ["boucle", "부클레"],
  ["fur", "털실"], ["scrub", "수세미실"], ["linen", "리넨"], ["silk", "실크"], ["raffia", "라피아"], ["tshirt", "패브릭얀"], ["ribbon", "리본얀"], ["jute", "황마"], ["cord", "코드사"], ["metal", "메탈릭"]];
const Ic = ({ d, s = 22 }: { d: string; s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const TOOLS: [Tool, string, string, string][] = [
  ["rotate", "돌리기", "M20 12a8 8 0 1 1-2.6-5.9M20 3.5v4.2h-4.2", "끌어서 돌리기 · 휠로 확대"],
  ["pan", "옮기기", "M12 3v18M3 12h18M9.5 5.5 12 3l2.5 2.5M9.5 18.5 12 21l2.5-2.5M5.5 9.5 3 12l2.5 2.5M18.5 9.5 21 12l-2.5 2.5", "끌어서 화면 안에서 옮기기"],
  ["zoom", "확대", "M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM15.5 15.5l5 5M10.5 8v5M8 10.5h5", "위아래로 끌어서 확대 · 축소"],
  ["ruler", "재기", "M3.5 8h17a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4", "가로와 높이를 cm로 보여 줍니다"],
];

const Opt = ({ on, onClick, children }: { on?: boolean; onClick: () => void; children: ReactNode }) => <button type="button" className="yw-opt" aria-pressed={on} onClick={onClick}>{children}</button>;

export default function YarnWorkspace({ pattern, onClose, extra }: { pattern: YarnPattern; onClose: () => void; extra?: WorkExtra }) {
  const root = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), backRef = useRef<HTMLSpanElement>(null), viewer = useRef<YarnViewer | null>(null);
  const shown = useRef<YarnPattern>(pattern), latest = useRef(pattern); latest.current = pattern;
  const [tool, setTool] = useState<Tool>("rotate");
  const [view, setView] = useState<"yarn" | "holo">("yarn");
  const [mat, setMat] = useState<YarnMaterial | null>(null); // another yarn to look at (read-only screens)
  const [info, setInfo] = useState<YarnInfo | null>(null);
  const [rules, setRules] = useState<YarnRule[] | null>(null);
  const [noGL, setNoGL] = useState(false);
  const [builtMs, setBuiltMs] = useState<number | null>(null);

  // the book stops, the page stays still, the way back takes the focus; Esc closes, Tab stays inside
  useEffect(() => {
    bookPause.set(true);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    backRef.current?.querySelector("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !root.current) return;
      e.stopPropagation();
      const f = [...root.current.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')].filter(x => !x.hasAttribute("disabled") && x.tabIndex >= 0 && x.offsetParent !== null);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement), j = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i === f.length - 1 ? 0 : i + 1);
      e.preventDefault(); f[j].focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); document.body.style.overflow = prev; bookPause.set(false); };
  }, [onClose]);

  // the engine: made once, disposed on the way out
  useEffect(() => {
    let gone = false;
    import("./engine").then(({ createYarnViewer, hasWebGL }) => {
      if (gone || !cv.current) return;
      const p = latest.current;
      const v = hasWebGL() ? createYarnViewer(cv.current, p, { phone: false, fit: true, onInfo: setInfo, onBuilt: setBuiltMs, onRuler: setRules }) : null;
      if (!v) { setNoGL(true); return; }
      viewer.current = v; shown.current = p;
    });
    return () => { gone = true; viewer.current?.dispose(); viewer.current = null; };
  }, []);
  // the pattern changed in a panel: colour and material at once, the shape after 0.2s of quiet
  useEffect(() => {
    const v = viewer.current; if (!v || pattern === shown.current) return;
    const key = (p: YarnPattern) => JSON.stringify([{ ...p.shape, stitch: undefined }, p.yarnMm, p.hookMm, p.strap, p.strapCm]);
    if (key(pattern) === key(shown.current)) { v.setPattern(pattern); shown.current = pattern; setMat(null); return; }
    const t = setTimeout(() => { v.setPattern(pattern); shown.current = pattern; setMat(null); }, 200);
    return () => clearTimeout(t);
  }, [pattern]);

  const pick = (t: Tool) => { setTool(t); viewer.current?.setTool(t === "ruler" ? "rotate" : t); viewer.current?.setRuler(t === "ruler"); if (t !== "ruler") setRules(null); };
  const show = (v: "yarn" | "holo") => { setView(v); viewer.current?.setView(v); };
  const look = (v: YarnLook) => viewer.current?.look(v);
  const tryMat = (m: YarnMaterial) => { setMat(m); viewer.current?.setMaterial(m); };
  const mk = extra?.making, empty = !!extra?.empty;
  const size = empty ? "" : extra?.caption ?? (!info ? "" : (info.round ? `지름 약 ${info.widthCm}cm` : `약 ${info.widthCm} × ${info.depthCm}cm`) + (info.heightCm ? ` · 높이 약 ${info.heightCm}cm` : ""));

  return createPortal(
    <div ref={root} className={"yw" + (mk ? " yw-mk" : "")} role="dialog" aria-modal="true" aria-label="3D 작업 화면" data-built-ms={builtMs ?? undefined}
      onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} onSubmit={e => e.stopPropagation()}>
      <div className="yw-top">
        <span ref={backRef} className="yw-back"><ClothLabel side="back" type="button" onClick={onClose}>{extra?.backLabel ?? "← 돌아가기"}</ClothLabel></span>
        <p className="yw-name">{extra?.title ?? "3D 미리 보기"}{extra?.sub && <small>{extra.sub}</small>}</p>
        {!noGL && <>
          <span className="yw-sep" aria-hidden="true" />
          {tool === "zoom" ? (
            <span className="yw-opts" role="group" aria-label="확대"><Opt onClick={() => viewer.current?.zoom(.8)}>확대</Opt><Opt onClick={() => viewer.current?.zoom(1.25)}>축소</Opt><Opt onClick={() => viewer.current?.home()}>전체 보기</Opt></span>
          ) : (
            <><span className="yw-lb">보는 방향</span>
              <span className="yw-opts" role="group" aria-label="보는 방향"><Opt onClick={() => look("front")}>앞</Opt><Opt onClick={() => look("side")}>옆</Opt><Opt onClick={() => look("top")}>위</Opt><Opt onClick={() => look("inside")}>안쪽</Opt></span>
              <span className="yw-opts"><Opt onClick={() => viewer.current?.home()}>처음 각도로</Opt></span></>
          )}
          <span className="yw-sep" aria-hidden="true" />
          <span className="yw-lb">보기</span>
          <span className="yw-opts" role="group" aria-label="보기"><Opt on={view === "yarn"} onClick={() => show("yarn")}>실</Opt><Opt on={view === "holo"} onClick={() => show("holo")}>구조</Opt></span>
        </>}
      </div>

      {!noGL && (
        <div className="yw-tools" role="toolbar" aria-label="도구" aria-orientation="vertical">
          {TOOLS.map(([k, label, d]) => <button key={k} type="button" aria-pressed={tool === k} onClick={() => pick(k)}><Ic d={d} />{label}</button>)}
          <hr />
          <button type="button" onClick={() => viewer.current?.playDraw()}><Ic d="M7 4.5v15l12-7.5z" />순서</button>
        </div>
      )}

      <div className="yw-stage">
        {noGL ? <p className="yw-nogl">이 기기에서는 3D 보기를 쓸 수 없습니다.</p>
          : <canvas ref={cv} className={"yw-canvas yw-tool-" + tool} aria-label="완성 모양 3D" style={empty ? { visibility: "hidden" } : undefined} />}
        {empty && <div className="yw-empty"><i aria-hidden="true" /><p>오른쪽에서 고르면<br />여기에 실로 뜬 모습이 나타납니다.</p></div>}
        {rules && tool === "ruler" && !empty && (
          <svg className="yw-rules" aria-hidden="true">
            {rules.map((r, i) => {
              const mx = (r.x1 + r.x2) / 2, my = (r.y1 + r.y2) / 2, t = `${extra?.dims?.[i] ?? r.cm}cm`, w = t.length * 8 + 16;
              return <g key={i}><line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} /><circle cx={r.x1} cy={r.y1} r="3" /><circle cx={r.x2} cy={r.y2} r="3" />
                <rect x={mx - w / 2} y={my - 12} width={w} height="24" rx="4" /><text x={mx} y={my + 5} textAnchor="middle">{t}</text></g>;
            })}
          </svg>
        )}
      </div>

      {mk ? (
        <form className="yw-right yw-mkr" noValidate onSubmit={e => { e.preventDefault(); e.stopPropagation(); mk.next(); }}
          onKeyDown={e => { const t = e.target as HTMLElement; if (e.key === "Enter" && !e.nativeEvent.isComposing && t.getAttribute("role") === "radio") { e.preventDefault(); mk.next(); } }}>
          <ol className="yw-steps" aria-label="만드는 단계">
            {mk.tabs.map((t, i) => <li key={t} className={i < mk.cur ? "done" : undefined} aria-current={i === mk.cur ? "step" : undefined}><b aria-hidden="true">{i < mk.cur ? "✓" : i + 1}</b>{t}</li>)}
          </ol>
          <div className="yw-mkbody" key={mk.cur}><h2>{mk.title}</h2>{mk.body}</div>
          <div className="yw-mkfoot">
            {mk.back ? <ClothLabel side="back" type="button" onClick={mk.back}>← 이전</ClothLabel> : <span />}
            <ClothLabel side="next" type="submit" blocked={mk.blocked}>{mk.nextLabel}</ClothLabel>
          </div>
        </form>
      ) : (
      <div className="yw-right">
        {extra?.panel ?? (
          <section className="yw-pan" aria-label="실">
            <h3>실</h3>
            <dl className="yw-facts"><div><dt>굵기</dt><dd>{pattern.yarnMm}mm</dd></div><div><dt>바늘</dt><dd>{pattern.hookMm}mm</dd></div>
              <div><dt>색</dt><dd><i className="yw-sw" style={{ background: pattern.colors[0] }} /></dd></div></dl>
            {!noGL && <>
              <p className="yw-lab">다른 실로 보기<small>도안은 바뀌지 않습니다</small></p>
              <div className="yw-tiles" role="group" aria-label="다른 실로 보기">
                {MATS.map(([k, label]) => <button key={k} type="button" aria-pressed={(mat ?? pattern.material) === k} onClick={() => tryMat(k)}>{label}</button>)}
              </div>
            </>}
          </section>
        )}
        {!!extra?.parts?.length && (
          <section className="yw-pan" aria-label="부분">
            <h3>부분<small>뜨는 순서대로</small></h3>
            <ol className="yw-parts">{extra.parts.map(([a, b], i) => <li key={i}><b>{i + 1}</b>{a}<span>{b}</span></li>)}</ol>
          </section>
        )}
      </div>
      )}

      <div className="yw-stat" aria-live="polite">
        <span>{empty ? "뜰 것을 고르면 3D로 보여 드립니다." : <>{size ? <b>{size}</b> : "모양을 계산하고 있습니다."}{info && <>{info.fit}</>}</>}</span>
        <span>{TOOLS.find(t => t[0] === tool)![3]}</span>
      </div>
    </div>,
    document.body,
  );
}
