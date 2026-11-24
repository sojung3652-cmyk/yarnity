"use client";
// The 3D work screen (web, wide screens; Kim: drawing tools - Photoshop, Illustrator, After Effects, Paint -
// as the reference, in the site's own look). Over the whole screen:
//   top     the way back, the piece's name, 보는 방향, 실 / 구조, 재기, 뜨는 순서
//   centre  the 3D alone, the whole piece in view; no tool buttons (Kim): drag turns it, the wheel zooms, and
//           Space held while dragging moves it - the status line says so
//   right   in 도안 만들기 every section of the shape on one screen (뜰 것, 색, 실, 바늘과 크기, 모양과 입구),
//           an index over them, and one way on (확인); elsewhere what the pattern is made of and its parts
//   bottom  the size in one line, and how to move the view
// It comes down from the top and settles, the book dimming behind it (Kim).
// Phones keep YarnPreview.tsx as it is (YarnPreviewButton picks). The engine loads here, and everything it
// made is disposed on the way out; the book's canvas and its 3D page wait meanwhile (bookPause).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ClothLabel } from "@/components/newbook/ClothLabel";
import { useApp } from "@/components/AppProvider";
import { ExtraPicker } from "@/components/newbook/ExtraPicker";
import { BUTTONS, LABEL_GROUPS } from "@/lib/extras";
import type { YarnInfo, YarnLook, YarnMaterial, YarnPattern, YarnRule, YarnViewer } from "./engine";
import { bookPause } from "./pause";
import "./yarn-work.css";

export interface WorkExtra {
  title?: string; sub?: string;
  /** the piece's name, given here (Kim: named once the 3D opens, not on the book's first page) */
  name?: { value: string; onChange: (v: string) => void };
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
  making?: { sections: { id: string; title: string; note?: string; body: ReactNode }[]; done: () => void; doneLabel: string; blocked?: boolean; footNote?: string;
    /** the bar over the column (Kim): the parts of the work - 실 설정, 모양 - to go between */
    tabs?: { label: string; on: boolean; onClick: () => void }[] };
  /** 단추 / 라벨 dragged on the 3D and let go: where (Kim: moved freely) */
  onExtraMove?: (kind: string, across: number, up: number) => void;
  /** 고치기 (Kim: from 나의 도안집's 3D): the work opened to be changed - this screen closes first */
  onEdit?: () => void;
  /** the piece from the front, taken as the work is finished here (확인하기) */
  onShot?: (url: string) => void;
  /** a button or label pressed on the 3D (Kim: 클릭해서 크기 조절): its name, bigger or smaller, taken off */
  extraTools?: { name: (kind: string) => string; size: (kind: string, f: number) => void; remove: (kind: string) => void; replace: (kind: string, pic: string) => void; isButton: (kind: string) => boolean; current: (kind: string) => string | undefined };
  /** 크기 틀 (Kim: Ctrl+T처럼): the frame's edge or corner dragged and let go - the piece that much wider (fx)
   *  and taller (fy); a corner gives the same for both */
  onResize?: (fx: number, fy: number) => void;
  /** a window over the whole screen (조립하기: what to make, asked first) */
  ask?: ReactNode;
  /** nothing to draw yet (no item picked): the stage says so instead of showing a piece nobody chose */
  empty?: boolean;
  /** shown on the stage first (도안 만들기: the yarn check, Kim), until the reader goes on to the shape */
  intro?: ReactNode;
}

type Tool = "rotate" | "pan";
const MATS: [YarnMaterial, string][] = [["cotton", "면"], ["wool", "울"], ["cashmere", "캐시미어"], ["alpaca", "알파카"], ["mohair", "모헤어"], ["angora", "앙고라"], ["sleep", "수면사"], ["chenille", "셔닐"], ["boucle", "부클레"],
  ["fur", "털실"], ["scrub", "수세미실"], ["linen", "리넨"], ["silk", "실크"], ["raffia", "라피아"], ["tshirt", "패브릭얀"], ["ribbon", "리본얀"], ["jute", "황마"], ["cord", "코드사"], ["nylon", "나일론"], ["metal", "메탈릭"]];
const Ic = ({ d, s = 22 }: { d: string; s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const HINT = "드래그 돌리기 · 스크롤 확대 · 스페이스+드래그 옮기기";

/** how light a colour is, 0 (black) to 1 (white) */
const lum = (h?: string) => { if (!h || !/^#[0-9a-f]{6}$/i.test(h)) return 1; const n = parseInt(h.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .04 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };

/** 탄성's words: firm to very limp */
export const softWord = (k: number) => k < .6 ? "단단하게" : k < .9 ? "조금 단단하게" : k <= 1.15 ? "실 그대로" : k < 1.7 ? "흐물흐물" : "아주 흐물흐물";

const Opt = ({ on, onClick, children, label }: { on?: boolean; onClick: () => void; children: ReactNode; label?: string }) => <button type="button" className="yw-opt" aria-pressed={on} aria-label={label} title={label} onClick={onClick}>{children}</button>;
/** one labelled control on the top bar: its name above, the choices joined in one woven strip under it */
const Group = ({ name, children, plain }: { name: string; children: ReactNode; plain?: boolean }) => (
  <div className={"yw-grp" + (plain ? " is-plain" : "")} role="group" aria-label={name}><span className="yw-grp-n" aria-hidden="true">{name}</span><span className="yw-seg">{children}</span></div>
);

export default function YarnWorkspace({ pattern, onClose, extra }: { pattern: YarnPattern; onClose: () => void; extra?: WorkExtra }) {
  const root = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), backRef = useRef<HTMLSpanElement>(null), viewer = useRef<YarnViewer | null>(null);
  const shown = useRef<YarnPattern>(pattern), latest = useRef(pattern); latest.current = pattern;
  const moveEx = useRef(extra?.onExtraMove); moveEx.current = extra?.onExtraMove;
  const [pickEx, setPickEx] = useState<{ k: string; x: number; y: number } | null>(null), [swap, setSwap] = useState(false);
  const { setChat } = useApp();
  const [tool, setTool] = useState<Tool>("rotate"), [ruler, setRuler] = useState(false);
  // 크기 틀: the piece's box on the screen, and the pull on it while a handle is dragged
  const [frameOn, setFrameOn] = useState(false), [box, setBox] = useState<[number, number, number, number] | null>(null), [pull, setPull] = useState<{ fx: number; fy: number } | null>(null);
  const resize = useRef(extra?.onResize); resize.current = extra?.onResize;
  const toggleFrame = () => { const on = !frameOn; setFrameOn(on); viewer.current?.setFrame(on); if (!on) { setBox(null); setPull(null); } };
  // Ctrl+T (Cmd+T is the browser's own): the frame on and off, as in drawing tools
  useEffect(() => { if (!extra?.onResize) return; const f = (e: KeyboardEvent) => { if (e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "t") { e.preventDefault(); toggleFrame(); } }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); });
  const grab = (hx: -1 | 0 | 1, hy: -1 | 0 | 1) => (e: React.PointerEvent) => {
    if (!box) return; e.preventDefault(); e.stopPropagation();
    const [l, t, r, b] = box, cx = (l + r) / 2, w = (r - l) / 2, h = b - t, sx = e.clientX, sy = e.clientY; let cur = { fx: 1, fy: 1 };
    const move = (m: PointerEvent) => {
      const fx = hx ? Math.max(.4, Math.min(2.5, (w + (m.clientX - sx) * hx) / w)) : 1, fy = hy ? Math.max(.4, Math.min(2.5, (h - (m.clientY - sy)) / h)) : 1;
      cur = hx && hy ? { fx: Math.max(fx, fy) === 1 ? Math.min(fx, fy) : (Math.abs(fx - 1) > Math.abs(fy - 1) ? fx : fy), fy: 0 } : { fx, fy };
      if (hx && hy) cur.fy = cur.fx; setPull(cur); void cx;
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); setPull(null); if (Math.abs(cur.fx - 1) > .02 || Math.abs(cur.fy - 1) > .02) resize.current?.(cur.fx, cur.fy); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const [view, setView] = useState<"yarn" | "holo">("yarn");
  const [mat, setMat] = useState<YarnMaterial | null>(null); // another yarn to look at (read-only screens)
  const [info, setInfo] = useState<YarnInfo | null>(null);
  const [rules, setRules] = useState<YarnRule[] | null>(null);
  const [noGL, setNoGL] = useState(false);
  const [builtMs, setBuiltMs] = useState<number | null>(null);
  const [intro, setIntro] = useState(!!extra?.intro);
  // a piece made from a drawing shows at once, beside it (Kim): the yarn check steps aside
  useEffect(() => { const f = () => setIntro(false); window.addEventListener("yw:shape", f); return () => window.removeEventListener("yw:shape", f); }, []);
  // the yarn again (Kim: from the shape too): the yarn check on the stage, the yarn's section on the right
  useEffect(() => {
    const f = () => { setIntro(true); setTimeout(() => toSec("#yw-yarn"), 60); };
    window.addEventListener("yw:yarncheck", f); return () => window.removeEventListener("yw:yarncheck", f);
  }, []);
  // the stage dark by default (Kim), and light by itself when the yarn picked is dark (it would sink into the
  // dark); the reader can still pick either, until the yarn's colour changes again
  const yarnDark = lum(pattern.colors?.[0]) < .22;
  const [dark, setDark] = useState(!yarnDark);
  useEffect(() => { setDark(!yarnDark); }, [yarnDark]);
  const pickBg = (d: boolean) => setDark(d);
  // the yarn is set (Kim: the yarn first, then what to make): the page is told, and asks what to make
  const yarnSet = () => window.dispatchEvent(new Event("yw:yarnset"));
  // a section brought into view inside the right column only (scrollIntoView moved the page under this screen too)
  const toSec = (sel: string) => {
    const col = root.current?.querySelector<HTMLElement>(".yw-mkbody"), el = root.current?.querySelector<HTMLElement>(sel); if (!col || !el) return;
    col.scrollTo({ top: col.scrollTop + el.getBoundingClientRect().top - col.getBoundingClientRect().top, behavior: "smooth" });
  };
  const toShape = () => { setIntro(false); yarnSet(); setTimeout(() => toSec("#yw-draw"), 60); };

  // the book stops, the page stays still, the way back takes the focus; Esc closes, Tab stays inside
  useEffect(() => {
    bookPause.set(true);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    // the page under this screen stays where it was (Kim: the book was left under the bar): going to a section here
    // scrolls the page too, so its place is put back on the way out
    const sx = window.scrollX, sy = window.scrollY;
    backRef.current?.querySelector("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest(".aic-root")) return;
      const pop = root.current?.querySelector<HTMLElement>(".sk-pop");
      if (e.key === "Escape") { if (pop) return; e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !root.current) return;
      e.stopPropagation();
      const f = [...(pop ?? root.current).querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')].filter(x => !x.hasAttribute("disabled") && x.tabIndex >= 0 && x.offsetParent !== null);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement), j = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i === f.length - 1 ? 0 : i + 1);
      e.preventDefault(); f[j].focus();
    };
    // Space held = move (as in drawing tools); not while typing
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const spaceDown = (e: KeyboardEvent) => { if (e.code !== "Space" || typing(e.target)) return; e.preventDefault(); if (!e.repeat) { viewer.current?.setTool("pan"); setTool("pan"); } };
    const spaceUp = (e: KeyboardEvent) => { if (e.code !== "Space") return; viewer.current?.setTool("rotate"); setTool("rotate"); };
    window.addEventListener("keydown", onKey, true); window.addEventListener("keydown", spaceDown); window.addEventListener("keyup", spaceUp);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("keydown", spaceDown); window.removeEventListener("keyup", spaceUp); document.body.style.overflow = prev; bookPause.set(false); window.scrollTo(sx, sy); requestAnimationFrame(() => window.scrollTo(sx, sy)); };
  }, [onClose]);

  // the engine: made once, disposed on the way out
  useEffect(() => {
    let gone = false;
    import("./engine").then(({ createYarnViewer, hasWebGL }) => {
      if (gone || !cv.current) return;
      const p = latest.current;
      const v = hasWebGL() ? createYarnViewer(cv.current, p, { phone: false, fit: true, onInfo: setInfo, onBuilt: setBuiltMs, onRuler: setRules, onFrame: setBox, onExtraMove: (k, x, y) => moveEx.current?.(k, x, y),
        onExtraPick: (k, x, y) => { const r = cv.current?.getBoundingClientRect(); if (r) { setSwap(false); setPickEx({ k, x: x - r.left, y: y - r.top }); } },
        // the pointer on one (Kim: 위치에 커서를 올리면 조절 옵션): its tools show beside it
        onExtraHover: (k, x, y) => { const r = cv.current?.getBoundingClientRect(); if (r) setPickEx(p => p?.k === k ? p : (setSwap(false), { k, x: x - r.left, y: y - r.top })); } }) : null;
      if (!v) { setNoGL(true); return; }
      viewer.current = v; shown.current = p;
    });
    return () => { gone = true; viewer.current?.dispose(); viewer.current = null; };
  }, []);
  // the pattern changed in a panel: colour and material at once, the shape after 0.2s of quiet
  useEffect(() => {
    const v = viewer.current; if (!v || pattern === shown.current) return;
    const key = (p: YarnPattern) => JSON.stringify([{ ...p.shape, stitch: undefined }, p.yarnMm, p.hookMm]);
    if (key(pattern) === key(shown.current)) { v.setPattern(pattern); shown.current = pattern; setMat(null); return; }
    const t = setTimeout(() => { v.setPattern(pattern); shown.current = pattern; setMat(null); }, 200);
    return () => clearTimeout(t);
  }, [pattern]);

  const toggleRuler = () => { const on = !ruler; setRuler(on); viewer.current?.setRuler(on); if (!on) setRules(null); };
  const show = (v: "yarn" | "holo") => { setView(v); viewer.current?.setView(v); };
  const look = (v: YarnLook) => viewer.current?.look(v);
  const tryMat = (m: YarnMaterial) => { setMat(m); viewer.current?.setMaterial(m); };
  const [softK, setSoftK] = useState(pattern.softK ?? 1);
  const mk = extra?.making, empty = !!extra?.empty;
  // the index shows which section is being read (the column scrolls; the index stays)
  const body = useRef<HTMLDivElement>(null), [cur, setCur] = useState(0);
  useEffect(() => {
    const el = body.current; if (!el) return;
    const f = () => { const secs = [...el.querySelectorAll<HTMLElement>(".yw-sec")], top = el.getBoundingClientRect().top + 24; let k = 0; secs.forEach((x, i) => { if (x.getBoundingClientRect().top <= top) k = i; }); if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) k = secs.length - 1; setCur(k); };
    f(); el.addEventListener("scroll", f, { passive: true }); return () => el.removeEventListener("scroll", f);
  }, [mk?.sections.length]);
  const size = empty ? "" : extra?.caption ?? (!info ? "" : (info.round ? `지름 약 ${info.widthCm}cm` : `약 ${info.widthCm} × ${info.depthCm}cm`) + (info.heightCm ? ` · 높이 약 ${info.heightCm}cm` : ""));

  return createPortal(<>
    <div className="yw-dim" aria-hidden="true" />
    <div ref={root} className={"yw" + (mk ? " yw-mk" : "")} role="dialog" aria-modal="true" aria-label="3D 작업 화면" data-built-ms={builtMs ?? undefined}
      onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} onSubmit={e => e.stopPropagation()}>
      <div className="yw-top">
        {extra?.name
          ? <label className="yw-name yw-name-in"><span className="sr">작품 이름</span>
              <input value={extra.name.value} maxLength={40} placeholder="작품 이름" autoComplete="off" spellCheck={false}
                onChange={e => extra.name!.onChange(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }} />
              {/* what it is, beside a given name only (Kim: no name - just "작품 이름", faint) */}
              {extra.sub && extra.name.value.trim() && extra.name.value.trim() !== extra.sub && <small>{extra.sub}</small>}</label>
          : <p className="yw-name">{extra?.title ?? "3D 미리 보기"}{extra?.sub && <small>{extra.sub}</small>}</p>}
        {!noGL && <>
          <div className="yw-bar">
            {/* how it is looked at: one-off moves (no state), then two either-or choices */}
            <Group name="보기"><Opt on={view === "yarn"} onClick={() => show("yarn")}>실</Opt><Opt on={view === "holo"} onClick={() => show("holo")}>구조</Opt></Group>
            <Group name="배경"><Opt on={!dark} onClick={() => pickBg(false)}>밝게</Opt><Opt on={dark} onClick={() => pickBg(true)}>어둡게</Opt></Group>
            {/* tools: each on or off by itself (재기, 실 확인) or played once (뜨는 순서) */}
            <div className="yw-acts" role="group" aria-label="도구">
              {extra?.intro && <button type="button" className="yw-act" aria-pressed={intro} onClick={() => { if (intro) toShape(); else window.dispatchEvent(new Event("yw:yarncheck")); }}><Ic s={18} d="M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM5 8c4 2 10 2 14 0M4 13c5 2.5 11 2.5 16 0M8 20c1-5 1-11 0-16M16 20c-1-5-1-11 0-16" />실 확인</button>}
              <button type="button" className="yw-act" aria-pressed={ruler} onClick={toggleRuler}><Ic s={18} d="M3.5 8h17a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4" />치수</button>
              {extra?.onResize && !empty && <button type="button" className="yw-act" aria-pressed={frameOn} title="크기 틀 (Ctrl+T)" onClick={toggleFrame}><Ic s={18} d="M5 5h14v14H5zM3 3h4v4H3zM17 3h4v4h-4zM3 17h4v4H3zM17 17h4v4h-4z" />크기 틀</button>}
              <button type="button" className="yw-act" onClick={() => viewer.current?.playDraw()}><Ic s={18} d="M7 4.5v15l12-7.5z" />뜨는 순서</button>
              {extra?.onEdit && <button type="button" className="yw-act yw-edit" onClick={() => { const go = extra.onEdit!; onClose(); go(); }}><Ic s={18} d="M4 20l1-4.5L16.5 4a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19zM14.5 6l3.5 3.5" />고치기</button>}
            </div>
          </div>
        </>}
        {/* the way back as a plain X at the right end (Kim) */}
        <span ref={backRef} className="yw-x"><button type="button" aria-label={(extra?.backLabel ?? "돌아가기").replace(/[←\s]+/, "").trim() + " 돌아가기"} title="닫기 (Esc)" onClick={onClose}><Ic s={22} d="M6 6l12 12M18 6L6 18" /></button></span>
      </div>


      <div className={"yw-stage" + (dark ? " is-dark" : "")}>
        {intro && extra?.intro && (
          <div className="yw-intro">
            {extra.intro}
            <h2>실 확인<small>오른쪽에서 실을 바꾸면 바로 바뀝니다</small></h2>
          </div>
        )}
        {noGL ? <p className="yw-nogl">이 기기에서는 3D 보기를 쓸 수 없습니다.</p>
          : <canvas ref={cv} onPointerDown={() => setPickEx(null)} className={"yw-canvas" + (tool === "pan" ? " is-pan" : "")} aria-label="완성 모양 3D" style={empty ? { visibility: "hidden" } : undefined} />}
        {/* a picked button or label (Kim: 클릭해서 크기를 조절하거나 옮기기): its size and 빼기, beside it */}
        {pickEx && extra?.extraTools && (
          <div className="yw-pick" style={{ left: pickEx.x, top: pickEx.y }} role="group" aria-label="고른 장식">
            <b>{extra.extraTools.name(pickEx.k)}</b>
            <button type="button" aria-label="작게" onClick={() => extra.extraTools!.size(pickEx.k, 1 / 1.15)}>−</button>
            <button type="button" aria-label="크게" onClick={() => extra.extraTools!.size(pickEx.k, 1.15)}>+</button>
            <button type="button" aria-expanded={swap} onClick={() => setSwap(v => !v)}>교체</button>
            <button type="button" onClick={() => { extra.extraTools!.remove(pickEx.k); setPickEx(null); }}>빼기</button>
            <button type="button" aria-label="닫기" onClick={() => setPickEx(null)}>×</button>
            {/* 교체 (Kim): another picture of the same kind in its place */}
            {swap && <div className="yw-swap"><ExtraPicker label="다른 것으로 교체" wide={!extra.extraTools.isButton(pickEx.k)}
              groups={extra.extraTools.isButton(pickEx.k) ? [["단추", BUTTONS]] : LABEL_GROUPS.map(([g, l]): [string, typeof l] => [g + " 라벨", l])}
              value={extra.extraTools.current(pickEx.k)} onPick={p => { extra.extraTools!.replace(pickEx.k, p.id); setSwap(false); }} /></div>}
          </div>
        )}
        {/* Yarni, called from the stage's lower right (Kim) */}
        <button type="button" className="ai-badge yw-badge" aria-label="Yarni에게 물어보기" onClick={() => setChat(c => ({ ...c, open: true }))}>
          <span className="ai-badge__label" aria-hidden="true">Yarni에게 물어보기</span>
        </button>
        {/* 보는 방향 on the stage itself, top right (Kim) */}
        {!noGL && !empty && (
          <div className="yw-views" role="group" aria-label="보는 방향">
            <Opt onClick={() => { setIntro(false); look("front"); }}>앞</Opt><Opt onClick={() => { setIntro(false); look("side"); }}>옆</Opt><Opt onClick={() => { setIntro(false); look("top"); }}>위</Opt><Opt onClick={() => { setIntro(false); look("inside"); }}>안쪽</Opt>
            <Opt label="처음 각도로" onClick={() => { setIntro(false); viewer.current?.home(); }}><Ic s={17} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Opt>
          </div>
        )}
        {!noGL && !empty && !intro && !ruler && !frameOn && <p className="yw-hint yw-keys"><span><kbd>드래그</kbd> 돌리기</span><span><kbd>스크롤</kbd> 확대</span><span><kbd>스페이스+드래그</kbd> 옮기기</span></p>}
        {!noGL && !empty && !intro && (ruler || frameOn) && <p className="yw-hint">{frameOn ? "틀의 옆 손잡이는 가로, 위 손잡이는 높이, 모서리는 전체 크기를 바꿉니다" : ruler ? "가로와 높이를 cm로 보여 드립니다" : HINT}</p>}
        {empty && <div className="yw-empty"><i aria-hidden="true" /><p>모양을 그리면<br />여기에 실로 뜬 모습이 나타납니다.</p></div>}
        {box && frameOn && !empty && !intro && (() => {
          const [l, t, r, b] = box, cx = (l + r) / 2, w = (r - l) / 2 * (pull?.fx ?? 1), h = (b - t) * (pull?.fy ?? 1), st = { left: cx - w, top: b - h, width: w * 2, height: h };
          return (
            <div className={"yw-frame" + (pull ? " is-pull" : "")} style={st}>
              <i className="h-l" onPointerDown={grab(-1, 0)} title="가로" /><i className="h-r" onPointerDown={grab(1, 0)} title="가로" /><i className="h-t" onPointerDown={grab(0, 1)} title="높이" />
              <i className="h-tl" onPointerDown={grab(-1, 1)} title="전체 크기" /><i className="h-tr" onPointerDown={grab(1, 1)} title="전체 크기" />
              {pull && <b>{pull.fx !== 1 && pull.fy !== 1 ? `전체 ${Math.round(pull.fx * 100)}%` : pull.fx !== 1 ? `가로 ${Math.round(pull.fx * 100)}%` : `높이 ${Math.round(pull.fy * 100)}%`}</b>}
            </div>
          );
        })()}
        {rules && ruler && !empty && (
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
        <form className="yw-right yw-mkr" noValidate onSubmit={e => { e.preventDefault(); e.stopPropagation(); if (!mk.blocked && extra?.onShot) { const u = viewer.current?.snapshot(); if (u) extra.onShot(u); } mk.done(); }}>
          <nav className="yw-index" aria-label="항목">
            {mk.tabs ? mk.tabs.map((t, i) => <a key={t.label} href="#" className="yw-tab" aria-current={t.on ? "step" : undefined} onClick={e => { e.preventDefault(); t.onClick(); }}><b>{i + 1}</b>{t.label}</a>) : mk.sections.map((x, i) => <a key={x.id} href={"#yw-" + x.id} aria-current={i === cur ? "location" : undefined} onClick={e => { e.preventDefault(); toSec("#yw-" + x.id); }}><b>{i + 1}</b>{x.title}</a>)}
          </nav>
          <div className="yw-mkbody" ref={body}>
            {mk.sections.map((x, i) => (
              <section key={x.id} id={"yw-" + x.id} className="yw-sec" aria-labelledby={"yw-h-" + x.id}>
                <h2 id={"yw-h-" + x.id}><b aria-hidden="true">{i + 1}</b>{x.title}{x.note && <small>{x.note}</small>}</h2>
                {x.body}
              </section>
            ))}
          </div>
          <div className="yw-mkfoot">
            <span className="yw-mknote">{mk.footNote ?? (mk.blocked ? "정하지 않은 항목이 있습니다. 누르면 그곳으로 갑니다." : "다 정하셨으면 책으로 돌아가 확인합니다.")}</span>
            <ClothLabel side="next" type="submit" blocked={mk.blocked}>{mk.doneLabel}</ClothLabel>
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
              {/* 탄성 (Kim): a looser hand or a bigger hook makes a limper fabric - seen here, the pattern unchanged */}
              <label className="yw-soft"><span>탄성</span><input type="range" min={.3} max={2.5} step={.1} value={softK} onChange={e => { const k = Number(e.target.value); setSoftK(k); const p = { ...shown.current, softK: k }; viewer.current?.setPattern(p); shown.current = p; }} /><output>{softWord(softK)}</output></label>
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

      {extra?.ask}
      <div className="yw-stat" aria-live="polite">
        <span>{empty ? "뜰 것을 고르면 3D로 보여 드립니다." : <>{size ? <b>{size}</b> : "모양을 계산하고 있습니다."}{info && <>{info.fit}</>}</>}</span>
        {/* Kim: the made piece is knitted fabric - it stretches, so it will not keep exactly this shape and size */}
        <span className="yw-stretch">실제 결과물은 뜨개 편물의 특성상 신축성 있게 만들어져, 크기와 모양이 화면과 조금 다를 수 있습니다.</span>
      </div>
    </div>
  </>, document.body);
}
