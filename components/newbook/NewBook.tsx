"use client";
// "도안 만들기" as an open book in four steps: ① name ② item ③ every input: yarn, hook and colours (left),
// shape and size (right) ④ the check: the supplies with the yarn amount (left), the preview (right).
// Items come from lib/items.ts and map onto the stitch engine (lib/pattern: plan, gauge) unchanged.
// The draft is saved to iyarn.draft and the step to iyarn.newstep, so a refresh resumes where you were.
// The step itself is in the address (/new?step=n, see components/Book/BookProvider.tsx), so Back/Forward
// move between steps. useNewBook() holds all of the state and builds the two pages; they are drawn either
// in the one 3D book (wide screens with WebGL: components/Book/WizardSpread.tsx) or, as before, in this
// one-page CSS book (<NewBook />: phones, no WebGL).
// Editing a saved work: /new?edit=<id> opens step 3 (every input) prefilled; "도안 보기" overwrites that work (its
// knitting progress restarts if the pattern changed - the old row position would no longer match).
// The AI chat (components/Chat.tsx, /api/chat) is not shown here for now; the code is kept.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { drawing } from "@/lib/drawing";
import { engineDims, ENGINE, fieldsFor, freshDraft, GROUPS, HANDLE_PRESETS, ITEM, ITEMS, itemIdOf, LEN_RANGE, type FieldKey, type Item, type ItemId } from "@/lib/items";
import { gauge, plan, SHAPE_KO, type Handle, type PlanInput, type Shape } from "@/lib/pattern";
import { store } from "@/lib/store";
import { BUTTONS, LABEL_GROUPS } from "@/lib/extras";
import { ExtraPicker } from "./ExtraPicker";
import type { Draft } from "@/lib/types";
import { ItemArt } from "./ItemArt";
import { TitleCover, TitlePage } from "./TitlePage";
import { ClothLabel } from "./ClothLabel";
import { CoverChoice } from "./CoverChoice";
import { ColorStudio } from "./ColorStudio";
import { SketchPad } from "./SketchPad";
import { YarnCheck } from "./YarnCheck";
import { StartChoice } from "./StartChoice";
import { specToDraft } from "@/lib/sketchShape";
import { CROCHET, type CrochetStitch } from "@/lib/pattern";
import { DrawPad } from "./DrawPad";
import { PaintPad } from "./PaintPad";
import { GoldX } from "@/components/GoldX";
import { SuppliesPage, YarnPage, yarnStepOk, yarnThickOk } from "./YarnStep";
import { Head, PanelYarn, Slide, Tiles, WebCheck, WebHook, WebItems, WebStitch, WebStitchByNeedle, WebYarn } from "./WebPages";
import { isKnit, stitchOf } from "@/lib/knit";
import { yarnUse } from "@/lib/yarnUse";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";
import { Fold, useOneOpen } from "./Fold";
import { canTurn, snapshot, startTurn, type Snapshot, type Turn } from "./pageTurn";
import { useMobile } from "@/components/mobile/useMobile";
import { useBook, type WizStep } from "@/components/Book/BookProvider";
import { AskAiLine } from "@/components/AskAiLine";
import { AiTab } from "@/components/AiTab";
import { LaceButton } from "@/components/diary/Diary";
import { partsOf, useYarn3D, YarnPreviewButton } from "@/src/features/yarn3d/YarnPreviewButton";
import { YarnPagePreview } from "@/src/features/yarn3d/YarnPagePreview";
import { bookPause } from "@/src/features/yarn3d/pause";
import { setSheet, useSheet, WEB_SHEETS3 } from "@/components/mobile/sheetStore";
import { PATTERN_BY_ID, chartNameOf } from "@/lib/stitchPatterns";
import { autoName, bodyOf, bodyPatch, bodyWidth, partLines, scaleDraft } from "@/lib/assemble";
import { AskStart } from "./AskStart";
import "./newbook.css";

type Step = WizStep;
const STEP_KEY = "iyarn.newstep";
const NO_NAME = "이름 없는 작품";
/** Handle length in cm as the engine will use it (older drafts: short 25 / long 90). */
const handleCmOf = (d: Draft) => d.handleCm || (d.handle === "long" ? 90 : 25);
const handleText = (d: Draft) => {
  if (d.handle === "none") return "없음";
  const cm = handleCmOf(d), p = HANDLE_PRESETS.find(([, v]) => v === cm);
  return p ? `${p[0]} ${cm}cm` : `${cm}cm`;
};
const isBag = (it: Item) => it.group === "가방";
const HANDLE_RANGE = LEN_RANGE; // any length (Kim: no limits)

/** The draft as the engine reads it (item -> engine path, beanie conversion, handle and the bag options
 *  only where offered; 0 = an option left with an invalid number, read as unset). */
export function engineInput(d: Draft): PlanInput {
  const it = ITEM[itemIdOf(d)], e = engineDims(it, d), bag = isBag(it);
  return { ...d, ...e, object: ENGINE[it.kind], handle: it.handles ? d.handle : (it.defaults.handle ?? "none"),
    handleCm: it.handles ? d.handleCm || null : null, topA: bag ? d.topA || null : null, flapCm: bag ? d.flapCm || null : null };
}

/** A number in cm typed into a box: kept as typed, passed on only when valid (else null). */
function CmInput({ label, value, range, onValue, autoFocus }: { label: string; value: number | null | undefined; range: [number, number]; onValue: (v: number | null) => void; autoFocus?: boolean }) {
  const [raw, setRaw] = useState(value != null ? String(value) : "");
  const v = Number(raw.trim()), err = !raw.trim() ? "숫자를 적어 주십시오." : !Number.isFinite(v) || v <= 0 ? "0보다 큰 숫자를 적어 주십시오."
    : v < range[0] || v > range[1] ? `${range[0]}~${range[1]}cm 사이로 적어 주십시오.` : "";
  return (
    <Field label={label} error={err || undefined}>
      {(id, eb) => <span className="nb-mm"><input id={id} className="nb-input nb-short" inputMode="decimal" autoComplete="off" autoFocus={autoFocus} aria-invalid={!!err} aria-describedby={eb} value={raw}
        onChange={e => { setRaw(e.target.value); const n = Number(e.target.value.trim()); onValue(e.target.value.trim() && Number.isFinite(n) && n >= range[0] && n <= range[1] ? n : null); }} /><span className="nb-unit">cm</span></span>}
    </Field>
  );
}
const numsOf = (d: Draft): Record<FieldKey, string> => ({ a: String(d.a), b: String(d.b), h: String(d.h), circ: String(d.circ ?? 56), depth: String(d.depth ?? 20) });

// ---- radio group of chips / cards: roving tab stop, arrow keys move and select ----
function Radios<T extends string>({ label, value, options, onPick, kind = "chip" }: { label: string; value: T; options: [T, ReactNode][]; onPick: (v: T) => void; kind?: "chip" | "item" }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, options.findIndex(([v]) => v === value));
  const key = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault(); const j = (i + d + options.length) % options.length; onPick(options[j][0]); refs.current[j]?.focus();
  };
  return (
    <div className={kind === "item" ? "nb-items" : "nb-chips"} role="radiogroup" aria-label={label}>
      {options.map(([v, t], i) => (
        <button key={v} ref={el => { refs.current[i] = el; }} type="button" role="radio" aria-checked={value === v} tabIndex={i === idx ? 0 : -1}
          className={kind === "item" ? "nb-item" : "nb-chip"} onClick={() => onPick(v)} onKeyDown={e => key(e, i)}>{t}</button>
      ))}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId(), eid = id + "e";
  return (
    <div className="nb-field">
      <label htmlFor={id}>{label}</label>
      {children(id, error ? eid : undefined)}
      {error && <p className="nb-err" id={eid}>{error}</p>}
    </div>
  );
}

export interface NewBookView {
  ready: boolean;
  /** the CSS book's form (page turn snapshots); unused in the 3D book */
  formRef: React.RefObject<HTMLFormElement | null>;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: KeyboardEvent<HTMLFormElement>) => void;
  ribbon: ReactNode;
  /** 3D로 보기 for the pattern so far (the phone wizard puts it above each sheet) */
  threeD: ReactNode;
  left: ReactNode;
  right: ReactNode;
  /** the same step for the phone's notebook (components/mobile/MobileWizard.tsx): one page, top to bottom */
  phone?: PhoneStep;
}

export interface PhoneStep {
  step: WizStep;
  title: string;
  ask: "item" | "yarn" | "size" | null;
  body: ReactNode;
  /** 이전 (or 돌아가기 / 메뉴 on the first step) */
  back: { label: string; onClick: () => void };
  nextText: string;
  blocked: boolean;
  final: boolean;
  next: () => void;
}

/** `inBook`: the 3D book passes the step whose pages it shows (it lags behind the address during a turn). */
/** `inSheet`: the sheet of step 3 the book shows now (it can lag behind during a page turn) */
export function useNewBook(inBook?: WizStep, inSheet?: number): NewBookView {
  const { ready, draft, setDraft, addProject, updateProject, projects, setActive, chat } = useApp();
  const router = useRouter();
  const book = useBook(), step = inBook ?? book.step, phone = useMobile();
  // wide screens (Kim): step 3 is up to three spreads, the yarn (sheet 0), the hook and the size (sheet 1)
  // and, for a bag, its shape (sheet 2: body, flap, handle); the 3D book turns its page between them
  // (Book3D reads the sheet). Phones keep their own sheets.
  const web = phone === false, liveSheet = useSheet(3, web ? WEB_SHEETS3 : undefined);
  // the third spread: a bag's shape, or a knitted item's stitch pattern (무늬)
  const bagNow = ITEM[itemIdOf(draft)].group === "가방", knitNow = isKnit({ item: itemIdOf(draft), craft: draft.craft, object: ENGINE[ITEM[itemIdOf(draft)].kind] }), sheets3 = bagNow || knitNow ? 3 : 2;
  const sheet = web && step === 3 ? Math.min(inSheet ?? liveSheet, sheets3 - 1) : 0, pos = step * 3 + sheet;
  const [editId, setEditId] = useState<string | null>(null);
  const [nums, setNums] = useState<Record<FieldKey, string>>(numsOf(draft));
  const [dir, setDir] = useState<1 | -1>(1);
  const [tried, setTried] = useState(false); // step 3: required messages only after trying to move on
  const [groupOpen, toggleGroup] = useOneOpen("납작한 것");
  const [fold4, toggle4] = useOneOpen();
  // bumped when the AI's proposal is applied (책에 적용): the size fields take the new values and the inputs
  // that keep their own typed text remount
  const [rev, setRev] = useState(0), seenApplied = useRef(chat.applied ?? 0);
  useEffect(() => {
    if ((chat.applied ?? 0) === seenApplied.current) return;
    seenApplied.current = chat.applied ?? 0; setNums(numsOf(draft)); setRev(r => r + 1);
  }, [chat.applied, draft]);
  // 새 도안 (Kim): start fresh or go on with something, asked once on the first page
  const [startMode, setStartMode] = useState<"new" | "go" | null>(null), [startDone, setStartDone] = useState(false);
  const [drawOn, setDrawOn] = useState(false), [drawKind, setDrawKind] = useState<"sketch" | "paint" | "half">("sketch"); // 직접 그리기: the pad instead of the item tiles
  const [hRev, setHRev] = useState(0); // the handle length was dragged: its typed box takes the new value
  const [ownHandle, setOwnHandle] = useState(false); // handle: "직접 입력" picked (stays custom even on a preset value)
  const loaded = useRef(false), titleRef = useRef<HTMLHeadingElement>(null), shownStep = useRef(pos);
  // the saved step when the wizard opened: a draft already past step 2 has its item (older drafts carry no flag)
  const startStep = useRef(store.get<number>(STEP_KEY, 1));
  const formRef = useRef<HTMLFormElement>(null), turn = useRef<Turn | null>(null), pending = useRef<Snapshot | null>(null);

  // enter: a saved work to edit (?edit=id; BookProvider opens it on step 4) or the saved draft
  useEffect(() => {
    if (!ready || loaded.current) return;
    loaded.current = true;
    const id = new URLSearchParams(location.search).get("edit");
    const p = id ? projects.find(x => x.id === id) : null;
    let d = draft;
    if (p) {
      const it = ITEM[itemIdOf(p)];
      const { id: _id, measuredH: _mh, measuredW: _mw, current: _cur, created: _cr, ...saved } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
      d = { ...saved, itemPicked: true, name: p.name === NO_NAME ? "" : p.name, item: it.id, circ: p.circ ?? it.defaults.circ, depth: p.depth ?? it.defaults.depth,
        yarnMode: p.yarnMode ?? (p.yarnMm ? "mm" : "level") }; // older works: their thin/medium/thick stays
      setDraft(d); setEditId(p.id);
    }
    setNums(numsOf(d));
  }, [ready, draft, projects, setDraft]);
  useEffect(() => { if (loaded.current && !editId) store.set(STEP_KEY, step); }, [step, editId]);

  const item: Item = ITEM[itemIdOf(draft)];
  const patch = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  /** a change that also moves the typed size boxes (조립하기's sliders, the 크기 틀) */
  const apply = (p: Partial<Draft>) => { const nd = { ...draft, ...p }; setDraft(nd); setNums(numsOf(nd)); };
  // 조립하기 (Kim): the part being changed, 조립하기 or 그리기, and whether the first window has been answered
  const [asmPart, setAsmPart] = useState("bottom"), [shapeMode, setShapeMode] = useState<"asm" | "draw">("asm"), [asked, setAsked] = useState(false);

  // a new item starts from its own defaults (no values carried over from the previous item)
  const pickItem = (id: ItemId) => {
    if (id === item.id && !draft.free) { if (!draft.itemPicked) patch({ itemPicked: true }); return; }
    const it = ITEM[id], dv = it.defaults;
    const d: Draft = { ...draft, item: id, object: ENGINE[it.kind], shape: dv.shape ?? "rect", a: dv.a, b: dv.b ?? dv.a, h: dv.h ?? 0, handle: dv.handle ?? "none", handleCm: dv.handleCm ?? null, topA: null, flapCm: null, profile: undefined, depthProfile: undefined, flapColor: undefined, handleColor: undefined, circ: dv.circ, depth: dv.depth, itemPicked: true, free: undefined };
    setDraft(d); setNums(numsOf(d));
  };
  const pickShape = (s: Shape) => {
    const d: Partial<Draft> = { shape: s };
    if (s === "oval" && item.ovalDefault) { d.a = item.ovalDefault.a; d.b = item.ovalDefault.b; }
    else if (s === "circle" && item.ovalDefault) { d.a = item.defaults.a; }
    else if (s !== "circle" && item.kind === "base-body" && draft.b >= draft.a) d.b = Math.max(4, draft.a - 5);
    const nd = { ...draft, ...d }; setDraft(nd); setNums(numsOf(nd));
  };

  const fields = fieldsFor(item, draft.shape);
  const errors = useMemo(() => {
    const e: Partial<Record<FieldKey, string>> = {};
    if (draft.paint) return e; // a painted piece: its size is set on the pad (the item's boxes are hidden)
    for (const f of fields) {
      const raw = nums[f.key].trim(), v = Number(raw);
      if (!raw) e[f.key] = "숫자를 적어 주십시오.";
      else if (!Number.isFinite(v) || v <= 0) e[f.key] = "0보다 큰 숫자를 적어 주십시오.";
      else if (v < f.min || v > f.max) e[f.key] = `${f.min}~${f.max}cm 사이로 적어 주십시오.`;
    }
    return e;
  }, [nums, fields, draft.paint]);
  const setNum = (k: FieldKey) => (raw: string) => {
    setNums(n => ({ ...n, [k]: raw }));
    const f = fields.find(x => x.key === k), v = Number(raw.trim());
    if (f && raw.trim() && Number.isFinite(v) && v >= f.min && v <= f.max) patch({ [k]: v } as Partial<Draft>);
  };

  const input = useMemo(() => engineInput(draft), [draft]);
  const pp = useMemo(() => plan(input), [input]);
  const g = useMemo(() => gauge(input), [input]);
  // the 3D preview reads the pattern's own colour, yarn thickness and material besides the plan input
  const yarnSrc = useMemo(() => ({ ...input, item: draft.item, color: draft.color, yarnMm: draft.yarnMm, materials: draft.materials, stitch: draft.stitch, fuzzK: draft.fuzzK, hairK: draft.hairK, handleW: draft.handleW, handleStyle: draft.handleStyle, handleWcm: draft.handleWcm, extras: draft.extras, crochetChart: draft.crochetChart, crochetStitch: draft.crochetStitch, chartName: chartNameOf(draft.pattern, draft.craft ?? (knitNow ? "knit" : "crochet")), moreColors: draft.moreColors }), [input, draft.pattern, draft.craft, knitNow, draft.moreColors, draft.item, draft.color, draft.yarnMm, draft.materials, draft.stitch, draft.fuzzK, draft.hairK, draft.handleW, draft.handleStyle, draft.handleWcm, draft.extras, draft.crochetChart, draft.crochetStitch]);
  // the left page's one line under the 3D (web): the size the pattern is made for
  const freeW = draft.free ? Math.round(Math.max(...draft.free.pts.map(q => q[0])) * 2 * draft.free.hCm * 10) / 10 : 0;
  const itemLabel = draft.free || draft.paint ? "직접 그린 모양" : item.name;
  const sizeCaption = draft.paint ? `${draft.paint.wCm} × ${draft.paint.hCm}cm${draft.paint.pieces === 2 ? " · 2장" : ""}` : draft.free ? `높이 ${draft.free.hCm}cm · 가장 넓은 곳 ${freeW}cm` : (input.object === "rows" ? `${input.a} × ${input.b}cm` : input.object === "tube" ? `둘레 ${input.a}cm · 높이 ${input.h}cm`
    : (input.shape === "circle" ? `지름 ${input.a}cm` : `${input.a} × ${input.b}cm`) + (input.object === "bag" && input.h ? ` · 높이 ${input.h}cm` : ""))
    + (item.handles && draft.handle !== "none" && handleCmOf(draft) ? ` · 손잡이 ${handleCmOf(draft)}cm` : "");
  // 작업 화면으로 크게 on the left page (web): the 3D work screen, its panels change this draft (the yarn, the
  // size); back in the book the pages' own inputs start again from the draft (rev)
  // web: a size is typed or dragged (Kim: 키우면서 보고, 숫자는 저절로 채워지게) - the slider runs over the
  // item's usual sizes and further when the number typed is beyond them
  const sizeInput = (f: (typeof fields)[number]) => {
    const r = item.range[f.key] ?? [1, 100], v = Number(nums[f.key]), ok = nums[f.key].trim() !== "" && Number.isFinite(v) && v > 0;
    const lo = ok ? Math.min(r[0], Math.floor(v)) : r[0], hi = ok ? Math.max(r[1], Math.ceil(v)) : r[1];
    return (
      <Field key={item.id + f.key + draft.shape} label={f.label} error={errors[f.key]}>
        {(id, eb) => <>
          <input id={id} className="nb-input" inputMode="decimal" autoComplete="off" aria-invalid={!!errors[f.key]} aria-describedby={eb} value={nums[f.key]} onChange={e => setNum(f.key)(e.target.value)} />
          <input type="range" className="nb-range" aria-label={`${f.label} 조절`} min={lo} max={hi} step={0.5} value={ok ? v : lo} onChange={e => setNum(f.key)(e.target.value)} />
        </>}
      </Field>
    );
  };
  // the handle's length and how many strands wide it is, dragged (the typed box beside it starts again: hRev)
  const hasHandle = !!item.handles && draft.handle !== "none";
  const handleSliders = hasHandle ? (
    <div className="nb-sliders nb-sliders-1">
      <Slide label="길이" min={15} max={Math.max(150, handleCmOf(draft))} step={1} value={handleCmOf(draft)} onChange={v => { setHRev(n => n + 1); patch({ handle: "short", handleCm: v }); }} text={`${handleCmOf(draft)}cm`} />
      {draft.handleStyle
        ? <Slide label={draft.handleStyle === "tube" ? "굵기" : "너비"} min={1} max={draft.handleStyle === "tube" ? 4 : 6} step={.5} value={draft.handleWcm ?? 2.5} onChange={v => patch({ handleWcm: v })} text={`${draft.handleWcm ?? 2.5}cm`} />
        : <Slide label="굵기" min={1} max={5} step={1} value={draft.handleW ?? 3} onChange={v => patch({ handleW: v })} text={`${draft.handleW ?? 3}가닥`} />}
    </div>
  ) : null;
  // how the handle is made (Kim): strands side by side, flat, or a tube; a flat one from a chain joining its two
  // ends then widened, or worked to its width then row by row to its other end
  const hs = draft.handleStyle;
  const handleMake = hasHandle ? (
    <div className="nb-wsub">
      <Tiles label="손잡이 모양" value={!hs ? "cord" : hs === "tube" ? "tube" : "flat"} cols={3}
        onPick={v => patch({ handleStyle: v === "cord" ? undefined : v === "tube" ? "tube" : hs && hs !== "tube" ? hs : "flat-chain" })}
        options={[["cord", "끈", "여러 가닥"], ["flat", "평면", "납작한 띠"], ["tube", "원통형", "둥근 관"]]} />
      {hs && hs !== "tube" && <>
        <p className="nb-wsubhead">뜨는 방법</p>
        <Tiles label="평면 손잡이 뜨는 방법" value={hs} cols={2} onPick={v => patch({ handleStyle: v as "flat-chain" | "flat-rows" })}
          options={[["flat-chain", "사슬로 잇고 넓히기", "길이 방향으로 단"], ["flat-rows", "너비부터 뜨기", "한 단씩 길게"]]} />
        <p className="nb-help">{hs === "flat-chain" ? "양 끝을 사슬로 이은 뒤, 그 사슬을 따라 단을 늘려 너비를 만듭니다." : "짧은뜨기로 손잡이 너비만큼 뜬 뒤, 반대쪽 끝까지 한 단씩 떠 나갑니다."}</p>
      </>}
    </div>
  ) : null;
  // 단추 / 라벨 / 지퍼: tried on in the 3D only
  const exNow = draft.extras ?? {};
  const setEx = (e: Partial<NonNullable<Draft["extras"]>>) => patch({ extras: { ...exNow, ...e } });
  // where and how big (Kim): across the front, up the body, the size - one row of sliders per thing
  const placeSliders = (k: "buttonAt" | "labelAt", def: [number, number, number], sizeLabel: string, sizeMax: number) => {
    const v = exNow[k] ?? def, set = (i: number, x: number) => { const n = [...v] as [number, number, number]; n[i] = x; setEx({ [k]: n }); };
    return (
      <div className="nb-sliders nb-wsub">
        <Slide label="좌우" min={-1} max={1} step={.05} value={v[0]} onChange={x => set(0, x)} text={v[0] < -.05 ? "왼쪽" : v[0] > .05 ? "오른쪽" : "가운데"} />
        <Slide label="높이" min={0} max={1} step={.05} value={v[1]} onChange={x => set(1, x)} text={`${Math.round(v[1] * 100)}%`} />
        <Slide label={sizeLabel} min={.8} max={sizeMax} step={.1} value={v[2]} onChange={x => set(2, x)} text={`${v[2].toFixed(1)}cm`} />
      </div>
    );
  };
  const extrasGroup = (
    <div className="nb-wg"><Head note="3D로만 달아 봅니다">달아 보기</Head>
      <div className="nb-tiles nb-tiles-3" role="group" aria-label="달아 보기">
        {([["button", "단추"], ["label", "라벨"], ["zipper", "지퍼"]] as const).map(([k, t]) => <button key={k} type="button" className="nb-tile" aria-pressed={!!exNow[k]} onClick={() => setEx({ [k]: !exNow[k] })}>{t}</button>)}
      </div>
      {(exNow.button || exNow.label) && <p className="nb-help">3D에서 단추와 라벨을 끌어서 옮길 수 있습니다.</p>}
      {exNow.button && <>
        <p className="nb-wsubhead">단추{draft.flapCm && !exNow.buttonAt ? " · 지금은 덮개 끝에 있습니다" : ""}<button type="button" className="nb-link nb-exdel" onClick={() => setEx({ button: false, buttonAt: undefined })}>빼기</button></p>
        {/* Kim's buttons: the picked one's own size to start with */}
        <ExtraPicker label="단추 고르기" groups={[["", BUTTONS]]} value={exNow.buttonPic} onPick={p => setEx({ buttonPic: p.id, buttonAt: [exNow.buttonAt?.[0] ?? 0, exNow.buttonAt?.[1] ?? .72, p.cm] })} />
        {placeSliders("buttonAt", [0, .72, 1.9], "지름", 5)}
      </>}
      {exNow.label && <><p className="nb-wsubhead">라벨<button type="button" className="nb-link nb-exdel" onClick={() => setEx({ label: false, labelAt: undefined })}>빼기</button></p>
        <ExtraPicker label="라벨 고르기" groups={LABEL_GROUPS} wide value={exNow.labelPic} onPick={p => setEx({ labelPic: p.id, labelAt: [exNow.labelAt?.[0] ?? .5, exNow.labelAt?.[1] ?? .34, p.cm] })} />
        {placeSliders("labelAt", [.5, .34, 2.8], "가로", 7)}</>}
      {exNow.zipper && <>
        <p className="nb-wsubhead">지퍼<button type="button" className="nb-link nb-exdel" onClick={() => setEx({ zipper: false })}>빼기</button></p>
        <Tiles label="지퍼 색" value={exNow.zipColor ?? "gold"} cols={3} onPick={v => setEx({ zipColor: v as "gold" | "silver" | "brass" })} options={[["gold", "금색"], ["silver", "은색"], ["brass", "황동색"]]} />
        <Slide label="잠그기" min={0} max={1} step={.05} value={1 - (exNow.zipOpen ?? 0)} onChange={x => setEx({ zipOpen: Math.round((1 - x) * 100) / 100 })} text={(exNow.zipOpen ?? 0) <= .02 ? "잠김" : (exNow.zipOpen ?? 0) >= .98 ? "열림" : `${Math.round((1 - (exNow.zipOpen ?? 0)) * 100)}% 잠김`} />
      </>}
    </div>
  );
  const workPanel = (
    <>
      <section className="yw-pan" aria-label="실"><h3>실</h3><PanelYarn draft={draft} patch={patch} /></section>
      <section className="yw-pan" aria-label="크기"><h3>크기<small>{item.name}</small></h3>
        <div className="nb-web"><div className="nb-two nb-wtwo">
          {fields.map(sizeInput)}
        </div>{handleSliders && <div className="nb-wg"><Head>손잡이</Head>{handleSliders}</div>}</div>
      </section>
      <section className="yw-pan" aria-label="달아 보기"><div className="nb-web">{extrasGroup}</div></section>
    </>
  );
  // the work screen itself is drawn at the end of this render (big3d.render): in 3D로 보면서 만들기 its right
  // column is this wizard's own step
  const big3d = useYarn3D(yarnSrc, pp);
  // the work screen opened on the item step (the left page's button): straight on to the whole screen
  useEffect(() => { if (web && big3d.open && step === 2) { setSheet(3, 0); go(3); } }, [web, big3d.open, step]); // eslint-disable-line react-hooks/exhaustive-deps
  // 3D로 보면서 만들기 (Kim): wide screens with the 3D book - after the name, the steps are made in the work
  // screen over the whole window, and the last page (확인) is in the book again
  const canMake = () => web && inBook != null && big3d.supported && matchMedia("(min-width: 901px)").matches;
  const webStart = web && inBook != null && big3d.supported && !editId;
  useEffect(() => {
    if (!ready || step !== 1 || !store.get<number>("iyarn.go3d", 0)) return;
    // the 3D comes a moment after the page (inBook, WebGL): wait for it; phones keep the first page
    if (!webStart) { if (phone) store.set("iyarn.go3d", 0); return; }
    const t = setTimeout(() => { store.set("iyarn.go3d", 0); next(); }, 700); return () => clearTimeout(t);
  }, [ready, step, webStart]); // eslint-disable-line react-hooks/exhaustive-deps
  // a bag option turned on but left with an invalid number (stored as 0) blocks the last step
  const bagBad = isBag(item) && (draft.topA === 0 || draft.flapCm === 0 || (!!item.handles && draft.handle !== "none" && draft.handleCm === 0));
  // steps 3 and 4: yarn, hook, size and bag options all valid (step 3 holds every input; step 4 checks again)
  // step 2: an item has to be picked (nothing is shown until then)
  const picked = !!draft.itemPicked || !!editId || startStep.current > 2;
  const stepOk = step === 2 ? picked : step < 3 || (yarnStepOk(draft) && Object.keys(errors).length === 0 && !bagBad);
  const blockNext = (step === 4 || step === 2) && !stepOk; // step 3 is never disabled: pressing it shows what is missing

  // Changing step: a turn still running is finished first (never two at once); on the desktop CSS book the
  // current pages are snapshotted for the page turn, which starts once the new step is rendered.
  // Jumping several steps from the progress indicator is one turn. The step changes through the address,
  // so Back/Forward arrive here too (without a snapshot: no turn, just the new step).
  const go = (s: Step) => {
    if (s === step) return;
    turn.current?.finish();
    pending.current = formRef.current && canTurn() ? snapshot(formRef.current, s > step ? 1 : -1) : null;
    book.goStep(s);
  };
  useLayoutEffect(() => {
    const was = shownStep.current; if (was === pos) return;
    shownStep.current = pos;
    setDir(pos > was ? 1 : -1); setTried(false);
    // the CSS book's form, or the 3D book's two page forms
    const book = formRef.current ?? document.querySelector<HTMLElement>(".book3d"); if (!book) return;
    // focus: the new step's first field (the one that had focus is gone)
    const focusFirst = () => (book.querySelector<HTMLElement>('.nb-page .nb-turn input:not([type="color"]), .nb-page .nb-turn textarea, .nb-page .nb-turn [role="radio"][tabindex="0"], .nb-page .nb-turn button') ?? titleRef.current)?.focus({ preventScroll: true });
    const snap = pending.current; pending.current = null;
    if (!snap || !formRef.current) { requestAnimationFrame(focusFirst); return; }
    turn.current = startTurn(formRef.current, snap, () => { turn.current = null; focusFirst(); });
  }, [pos]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => turn.current?.finish(), []);

  const save = () => {
    const e = engineInput(draft);
    const d: Draft = { ...draft, shape: e.shape, a: e.a, b: e.b as number, h: e.h as number, object: e.object, handle: e.handle as Handle, handleCm: e.handleCm ?? null, topA: e.topA ?? null, flapCm: e.flapCm ?? null, name: draft.name.trim() || autoName(draft) || NO_NAME, item: item.id };
    if (d.object === "bag" && d.shape !== "circle" && d.b >= d.a) d.b = Math.max(4, d.a - 2); // as the old form did
    setDraft({ ...d, name: draft.name });
    if (editId) {
      const old = projects.find(x => x.id === editId);
      const same = old && (["item", "object", "weight", "hook", "shape", "a", "b", "h", "handle", "handleCm", "topA", "flapCm"] as const).every(k => (old[k] ?? null) === (d[k] ?? null));
      updateProject(editId, { ...d, ...(same ? {} : { current: 0, measuredH: null, measuredW: null }) });
      setActive(editId);
    } else {
      addProject({ id: "p" + Date.now().toString(36), ...JSON.parse(JSON.stringify(d)), measuredH: null, current: 0, created: Date.now(), updatedAt: Date.now(), status: "knitting" });
      store.set(STEP_KEY, 1);
      // 완성 도안 (web and phone) then shows its links once (the cover is picked before, on 확인, or given at random)
      try { sessionStorage.setItem("m.justMade", "1"); } catch {}
    }
    // wide screens, in the 3D book (Kim): done, the book sinks and you are back where it rose (the new pattern
    // waits in 나의 도안집); the next 새 도안 starts clean. Phones and the one-page /new go to 완성 도안 as before.
    // wide screens, in the 3D book: the book sinks and the finished pattern is shown (Kim: 완성 · 최종 도안 보기
    // used to put the book away and show nothing); the next 새 도안 starts clean
    if (inBook && !phone) { if (!editId) setDraft(freshDraft()); book.sinkTo("/pattern"); return; }
    router.push("/pattern");
  };
  // the web's step 3, spread by spread: the yarn needs only its thickness; the hook-and-size spread its
  // hook and sizes (the bag's shape spread follows); the last spread everything (stepOk)
  const sheetOk = !(web && step === 3) ? stepOk : sheet === 0 ? yarnThickOk(draft) : sheet === 1 && sheets3 === 3 ? yarnStepOk(draft) && Object.keys(errors).length === 0 : stepOk;
  const next = () => {
    if (!sheetOk) { setTried(true); requestAnimationFrame(() => ((document.querySelector('.yw [aria-invalid="true"]') ?? document.querySelector('.nb-book [aria-invalid="true"], .mw-form [aria-invalid="true"]')) as HTMLElement | null)?.focus()); return; }
    if (web && step === 3 && sheet < sheets3 - 1) { setSheet(3, sheet + 1); return; }
    if (web && step === 2) setSheet(3, 0);
    // the name is set: on into the work screen (the book waits under it, its pages swapping without a turn)
    if (step === 1 && canMake()) { bookPause.set(true); big3d.show(); setSheet(3, 0); go(3); return; }
    // everything is set there: back to the book for the last check
    if (step === 3 && big3d.open) big3d.close();
    if (step < 4) go((step + 1) as Step); else save();
  };
  const back = () => {
    if (web && step === 3 && sheet > 0) { setSheet(3, sheet - 1); return; }
    if (web && step === 4) setSheet(3, sheets3 - 1);
    go((step - 1) as Step);
  };
  /** 확인's 고치기: back to the spread of step 3 that holds it */
  const fixAt = (sh: number) => { if (web) setSheet(3, Math.min(sh, sheets3 - 1)); go(3); };

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); next(); };
  // Enter = next step from anywhere in the book (inputs submit by themselves; chips, cards and the
  // title too); other buttons and links keep their own Enter
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    const t = e.target as HTMLElement;
    if (e.key === "Enter" && !e.nativeEvent.isComposing && (t.getAttribute("role") === "radio" || t === titleRef.current)) { e.preventDefault(); next(); }
  };
  if (!ready) return { ready, formRef, onSubmit, onKeyDown, ribbon: null, threeD: null, left: null, right: null };

  // the web's right page from step 2 on: everything that was on the left page (the 3D is there now)
  let rightWeb: ReactNode = null;
  // the work screen's sections (3D로 보면서 만들기: everything on one screen, Kim), filled where they are built
  let oneAsm: ReactNode = null, oneYarn: ReactNode = null, oneSize: ReactNode = null, oneShape: ReactNode = null, oneHook: ReactNode = null, oneStitch: ReactNode = null, oneDraw: ReactNode = null;
    // the web (Kim: like Photoshop's new-document window): every item at once as tiles, kinds as tabs
    // 직접 그리기 (Kim): the last tile opens a pad; what is drawn becomes the pattern's rounds and the 3D at once
    const setFree = (f: Draft["free"]) => {
      if (!f) { setDrawOn(true); patch({ free: undefined, itemPicked: false }); return; }
      const d: Draft = { ...draft, free: f, paint: undefined, item: "basket", object: ENGINE[ITEM.basket.kind], shape: "circle", handle: "none", handleCm: null, topA: null, flapCm: null, itemPicked: true };
      setDraft(d);
    };
    // 자유롭게 (Kim: like a paint program, holes and all): a flat piece in rows, as wide and tall as set on the pad
    const setPaint = (f: Draft["paint"]) => {
      if (!f) { setDrawOn(true); patch({ paint: undefined, itemPicked: false }); return; }
      setDraft({ ...draft, paint: f, free: undefined, item: "dishcloth", object: ENGINE[ITEM.dishcloth.kind], shape: "rect", a: f.wCm, b: f.hCm, h: 0, handle: "none", handleCm: null, topA: null, flapCm: null, itemPicked: true });
    };
    const drawInfo = draft.free || draft.paint ? `전체 ${pp.rows.filter(r => r.part !== "start").length}단 · 가장 넓은 단 ${Math.max(...pp.rows.map(r => r.n))}코` : undefined;
    const kindNow = draft.free ? "half" : draft.paint ? "paint" : drawKind;
    const drawPanel = (
      <div className="nb-web">
        {/* Kim: the bag in my head - draw the whole piece and the AI reads its shape; the square paper (holes and
            all) and half a side view (turned into a round piece) are the other ways */}
        <Tiles label="그리는 방식" value={kindNow} cols={3} onPick={v => {
          setDrawKind(v as "sketch" | "paint" | "half");
          if (v !== "half" && draft.free) patch({ free: undefined, itemPicked: false });
          if (v !== "paint" && draft.paint) patch({ paint: undefined, itemPicked: false });
        }} options={[["sketch", "통째로 그리기", "AI가 모양을 읽음"], ["paint", "칸 그림판", "구멍까지 칸으로"], ["half", "옆모습 반쪽", "좌우 대칭 · 둥글게"]]} />
        {kindNow === "sketch" ? <SketchPad onShape={sp => { const nd = specToDraft(draft, sp); setDraft(nd); setNums(numsOf(nd)); window.dispatchEvent(new Event("yw:shape")); }} />
          : kindNow === "paint"
          ? <PaintPad value={draft.paint ?? undefined} base={draft.color || "#EFE6D4"} onChange={setPaint} info={draft.paint ? drawInfo : undefined} />
          : <DrawPad value={draft.free ?? undefined} base={draft.color || "#EFE6D4"} onChange={setFree} info={draft.free ? drawInfo : undefined} />}
      </div>
    );
    oneDraw = drawPanel;
    const listOrDraw = drawOn || draft.free || draft.paint ? drawPanel : (
      <WebItems value={picked ? item.id : ""} onPick={pickItem} tried={tried} hint={big3d.open ? undefined : <AskAiLine which="item" />} />
    );
    // 직접 그리기 from the start (Kim): the two ways side by side over the list
    const itemsPanel = (
      <>
        <Tiles label="고르는 방법" value={drawOn || draft.free || draft.paint ? "draw" : "list"} cols={2}
          onPick={v => { if (v === "draw") setDrawOn(true); else { setDrawOn(false); if (draft.free || draft.paint) patch({ free: undefined, paint: undefined, itemPicked: false }); } }}
          options={[["list", "목록에서 고르기"], ["draw", "직접 그리기"]]} />
        {listOrDraw}
      </>
    );


  const titles: Record<Step, string> = { 1: "이 작품의 이름은 무엇입니까?", 2: "무엇을 뜨시겠습니까?", 3: web ? (["어떤 실로 뜨시겠습니까?", "바늘과 크기를 정합니다", bagNow ? "가방 모양을 정합니다" : "어떤 무늬로 뜨시겠습니까?"][sheet]) : "어떤 실로, 어떤 크기로 뜨시겠습니까?", 4: "준비물을 확인합니다" };
  const nextLabel: Record<Step, string> = { 1: web && inBook != null && big3d.supported ? "3D로 보면서 만들기 →" : "다음 · 품목 →", 2: "다음 · 실과 바늘 →", 3: web && sheet === 0 ? "다음 · 바늘과 크기 →" : web && sheet === 1 && bagNow ? "다음 · 가방 모양 →" : web && sheet === 1 && knitNow ? "다음 · 무늬 →" : "다음 · 준비물 확인 →", 4: "완성 · 최종 도안 보기 →" };
  // folios (web): 1-2 이름, 3-4 품목, then two pages per spread of step 3 (실, 바늘과 크기, 가방 모양), then 확인;
  // four spreads on the one-page book
  const folio = web ? (step <= 2 ? step * 2 - 1 : step === 3 ? 5 + sheet * 2 : 5 + sheets3 * 2) : step * 2 - 1;
  // the web's step 3: where you are among its spreads, under the title
  const subSteps = web && step === 3 ? (
    <ol className="nb-substeps" aria-label="실과 크기 단계">{["실", "바늘과 크기", bagNow ? "가방 모양" : "무늬"].slice(0, sheets3).map((t, i) => <li key={t} aria-current={i === sheet ? "step" : undefined}>{t}</li>)}</ol>
  ) : null;

  const progress = (
    <ol className="nb-progress" aria-label="진행 단계">
      {(["이름", "품목", "실과 크기", "확인"] as const).map((t, i) => {
        const s = (i + 1) as Step, done = s < step;
        return (
          <li key={t} className={s === step ? "on" : done ? "done" : ""}>
            <button type="button" disabled={s > step} aria-current={s === step ? "step" : undefined} onClick={() => go(s)}>
              <span className="nb-dot" aria-hidden="true">{done ? "✓" : s}</span>{t}
            </button>
          </li>
        );
      })}
    </ol>
  );

  let left: ReactNode, right: ReactNode, phoneBody: ReactNode = null;
  if (step === 1) {
    // ① the left page is the book's title (logo, month); the right page the name on a woven label (progress moves there)
    const when = editId ? projects.find(x => x.id === editId)?.created ?? Date.now() : Date.now();
    left = <TitleCover month={new Date(when).toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()} />;
    const start = editId || startDone ? null : (
      <StartChoice draft={draft} projects={projects} mode={startMode} onMode={setStartMode}
        onFresh={() => { const f = freshDraft(); setDraft(f); setNums(numsOf(f)); setDrawOn(false); setStartDone(true); }}
        onDraft={() => setStartDone(true)} onOpen={id => { setStartDone(true); book.editHere(id); }} />
    );
    // wide screens with the 3D (Kim): the first page asks only where to start - no steps, no name (the name is
    // given on the 3D work screen's top); either way goes straight on into the work screen
    right = webStart ? (
      <div className="tp tp-start">
        <StartChoice always draft={draft} projects={projects} mode={startMode} onMode={setStartMode}
          onFresh={() => { const f = freshDraft(); setDraft(f); setNums(numsOf(f)); setDrawOn(false); setStartDone(true); next(); }}
          onDraft={() => { setStartDone(true); next(); }} onOpen={id => { setStartDone(true); book.editHere(id); }} />
      </div>
    ) : <TitlePage name={draft.name} onName={v => patch({ name: v })} onEnter={next} progress={progress} before={start} />;
    if (phone) phoneBody = <TitlePage name={draft.name} onName={v => patch({ name: v })} onEnter={next} progress={null} before={start} />;
  } else if (step === 2) {
    left = (
      <div className="nb-folds nb-groups">
        {tried && !picked && <p className="nb-err" role="alert">뜨고 싶은 것을 하나 골라 주십시오.</p>}
        {GROUPS.map(gname => (
          <Fold key={gname} label={gname} value={picked && item.group === gname ? item.name : ""} open={groupOpen === gname} onToggle={() => toggleGroup(gname)}>
            <Radios kind="item" label={gname} value={picked && item.group === gname ? item.id : ("" as ItemId)} onPick={pickItem}
              options={ITEMS.filter(i => i.group === gname).map(i => [i.id, <><ItemArt id={i.id} /><span>{i.name}{i.beta && <em className="nb-beta">베타</em>}</span></>])} />
          </Fold>
        ))}
      </div>
    );
    // the right page: nothing to show until an item is picked; then the item as a hang tag - its picture
    // on a tag tied with a string, its group, name and a line about it, then a small ruled card: how hard
    // (three dots), how long, and the order it is made in as numbered steps
    const steps = item.method.split("→").map(x => x.trim()).filter(Boolean), lv = item.level === "쉬움" ? 1 : 2;
    if (phone) phoneBody = (
      <>
        <div className="mw-groups">
          {tried && !picked && <p className="nb-err" role="alert">뜨고 싶은 것을 하나 골라 주십시오.</p>}
          {GROUPS.map(gname => (
            <Fold key={gname} label={gname} value={picked && item.group === gname ? item.name : ""} open={groupOpen === gname} onToggle={() => toggleGroup(gname)}>
              <Radios label={gname} value={picked && item.group === gname ? item.id : ("" as ItemId)} onPick={pickItem}
                options={ITEMS.filter(i => i.group === gname).map(i => [i.id, <span key={i.id} className="m-label-in">{i.name}{i.beta && <em className="nb-beta">베타</em>}</span>])} />
            </Fold>
          ))}
        </div>
        {picked && (
          <div className="mw-note" key={item.id}>
            <ItemArt id={item.id} line />
            <div className="mw-note-text">
              <p className="mw-note-group">{item.group}</p>
              <h3>{item.name}{item.beta && <em className="nb-beta">베타</em>}</h3>
              <p>{item.desc}</p>
              <p className="mw-note-facts">{`난이도 ${item.level} · ${item.time}`}</p>
              <p className="mw-note-facts">{`뜨는 순서 · ${steps.join(" → ")}`}</p>
            </div>
          </div>
        )}
      </>
    );
    right = picked ? (
      <div className="sh" key={item.id}>
        <div className="sh-tag">
          <span className="sh-string" aria-hidden="true" /><span className="sh-hole" aria-hidden="true" />
          <ItemArt id={item.id} big fill={draft.color} />
        </div>
        <p className="sh-group">{item.group}</p>
        <h3 className="sh-name">{item.name}{item.beta && <em className="nb-beta">베타</em>}</h3>
        <p className="sh-desc">{item.desc}</p>
        <dl className="sh-facts">
          <div><dt>난이도</dt><dd><span className="sh-dots" aria-hidden="true">{[1, 2, 3].map(i => <i key={i} className={i <= lv ? "on" : ""} />)}</span>{item.level}</dd></div>
          <div><dt>예상 시간</dt><dd>{item.time}</dd></div>
          <div className="sh-steps-row"><dt>뜨는 순서</dt><dd><ol className="sh-steps">{steps.map((x, i) => <li key={x}>{i > 0 && <span className="sh-line" aria-hidden="true" />}<b>{i + 1}</b>{x}</li>)}</ol></dd></div>
        </dl>
        {item.note && <p className="nb-help sh-note">{item.note}</p>}
      </div>
    ) : (
      <div className="sh-empty">
        <span className="sh-empty-tag" aria-hidden="true"><span className="sh-hole" /></span>
        <p>왼쪽에서 뜨고 싶은 것을 골라 보십시오.</p>
        <p className="nb-help">고르면 여기에 소개가 나옵니다.</p>
      </div>
    );
    rightWeb = itemsPanel;
  } else {
    // ③ all the inputs: the yarn and hook (page 5), the shape and size (page 6)
    // ④ the check before the pattern: the supplies with the yarn amount, now that the size is known
    //    (page 7), and the preview (page 8)
    const shapes = item.shapes ?? [];
    const sizeText = input.object === "rows" ? `${input.a} × ${input.b}cm` : input.object === "tube" ? `둘레 ${input.a}cm` : input.shape === "circle" ? `지름 ${input.a}cm` : `${input.a} × ${input.b}cm`;
    const handlePick = draft.handle === "none" ? "none" : ownHandle || draft.handleCm === 0 || !HANDLE_PRESETS.some(([, v]) => v === handleCmOf(draft)) ? "own" : String(handleCmOf(draft));
    const handleRow = pp.rows.find(r => r.part === "handle"), flapRows = pp.rows.filter(r => r.part === "flap").length, start = pp.rows.find(r => r.part === "start");
    const sizePage = (
      <>
        <p className="nb-itemline"><ItemArt id={item.id} />{item.name}{item.beta && <em className="nb-beta">베타</em>}</p>
        {shapes.length > 1 && (
          <div className="nb-field"><span className="nb-lbl">{item.kind === "flat-round" ? "모양" : "바닥 모양"}</span>
            <Radios label="모양" value={draft.shape} onPick={v => pickShape(v as Shape)} options={shapes.map(s => [s, SHAPE_KO[s]])} />
          </div>
        )}
        <div className="nb-two">
          {fields.map(f => (
            <Field key={item.id + f.key + draft.shape} label={f.label} error={errors[f.key]}>
              {(id, eb) => <input id={id} className="nb-input" inputMode="decimal" autoComplete="off" aria-invalid={!!errors[f.key]} aria-describedby={eb} value={nums[f.key]} onChange={e => setNum(f.key)(e.target.value)} />}
            </Field>
          ))}
        </div>
        {isBag(item) && (
          <div className="nb-folds">
            {/* body: straight, or wider at the top (the opening measured like the bottom) */}
            <Fold label="몸통 모양" value={draft.topA ? `위로 넓어지는 · 입구 ${draft.topA}cm` : draft.topA === 0 ? "위로 넓어지는" : "일자형"} open={fold4 === "body"} onToggle={() => toggle4("body")}>
              <Radios label="몸통 모양" value={draft.topA != null ? "flare" : "straight"} options={[["straight", "일자형"], ["flare", "위로 넓어지는"]]}
                onPick={v => patch({ topA: v === "flare" ? Math.round(draft.a * 1.3) : null })} />
              {draft.topA != null && <div className="nb-sub"><CmInput key={"top" + draft.shape + draft.a} label={draft.shape === "circle" ? "입구 지름 (cm)" : "입구 가로 (cm)"} value={draft.topA || null}
                range={[Math.floor(draft.a) + 1, LEN_RANGE[1]]} onValue={v => patch({ topA: v ?? 0 })} /></div>}
            </Fold>
            {/* a flap (cover) over the opening, worked back and forth from the back */}
            <Fold label="덮개" value={draft.flapCm ? `있음 · ${draft.flapCm}cm` : draft.flapCm === 0 ? "있음" : "없음"} open={fold4 === "flap"} onToggle={() => toggle4("flap")}>
              <Radios label="덮개" value={draft.flapCm != null ? "yes" : "no"} options={[["no", "없음"], ["yes", "있음"]]}
                onPick={v => patch({ flapCm: v === "yes" ? Math.max(4, Math.round(draft.h * 0.6)) : null })} />
              {draft.flapCm != null && <div className="nb-sub"><CmInput label="덮개 길이 (cm)" value={draft.flapCm || null} range={LEN_RANGE} onValue={v => patch({ flapCm: v ?? 0 })} /></div>}
            </Fold>
            {item.handles && (
              <Fold label="손잡이" value={handleText(draft)} open={fold4 === "handle"} onToggle={() => toggle4("handle")}>
                <Radios label="손잡이" value={handlePick} onPick={v => {
                  setOwnHandle(v === "own");
                  if (v === "none") patch({ handle: "none" });
                  else if (v === "own") patch({ handle: "short", handleCm: handleCmOf(draft) });
                  else patch({ handle: "short", handleCm: Number(v) });
                }} options={[...HANDLE_PRESETS.map(([n, v]): [string, ReactNode] => [String(v), `${n} ${v}cm`]), ["own", "직접 입력"], ["none", "없음"]]} />
                {handlePick === "own" && <div className="nb-sub"><CmInput label="손잡이 길이 (cm)" value={handleCmOf(draft)} range={HANDLE_RANGE} autoFocus={ownHandle} onValue={v => patch({ handle: "short", handleCm: v ?? 0 })} /></div>}
                <p className="nb-help">손에 드는 토트 약 50cm, 어깨에 메는 숄더 약 70cm, 몸에 두르는 크로스 약 120cm입니다.</p>
              </Fold>
            )}
          </div>
        )}
        {item.note && <p className="nb-help">{item.note}</p>}
      </>
    );
    const previewPage = (
      <div className="nb-preview">
        <h3>미리 보기</h3>
        {/* drawing() only interpolates numbers and fixed labels */}
        <div className="drawing nb-drawing" dangerouslySetInnerHTML={{ __html: drawing(input, pp, draft.color, draft.moreColors?.map(c => c.hex)) }} />
        <p className="nb-counts" aria-live="polite">
          <span>{`${item.name} · ${sizeText}`}</span>
          {input.object === "rows" && start && <b>{`시작 사슬 ${start.n}코 · 한 단 ${pp.last}코 · ${pp.bodyRows}단`}</b>}
          {input.object === "tube" && start && <b>{`시작 사슬 ${start.n}코 (고리) · ${pp.bodyRows}단`}</b>}
          {(input.object === "coaster" || input.object === "bag") && <b>{`바닥 ${pp.bottomRounds}단 · 마지막 단 ${pp.last}코`}</b>}
          {input.object === "bag" && <b>{`몸통 ${pp.bodyRows}단` + (flapRows ? ` · 덮개 ${flapRows}단` : "") + (handleRow ? ` · 손잡이 사슬 ${handleRow.n}코` : "")}</b>}
        </p>
        <p className="nb-help">{input.object === "rows" || input.object === "tube"
          ? "코 수는 공식으로 계산합니다. 5단을 뜬 뒤 폭과 높이를 재면 남은 단 수를 내 손에 맞게 고쳐 드립니다."
          : "코 수는 공식으로 계산합니다. 3단을 뜬 뒤 지름을 재면 내 손에 맞게 다시 계산해 드립니다."}</p>
      </div>
    );
    if (step === 3) {
      left = <YarnPage draft={draft} patch={patch} tried={tried} />;
      right = <section className="nb-sec" aria-labelledby="secSize"><h2 className="nb-sec-title" id="secSize">모양과 크기</h2><AskAiLine which="size" />{sizePage}</section>;
    } else {
      // the cover first (Kim: picked before the pattern is made), then the supplies
      left = <><CoverChoice draft={draft} patch={patch} /><SuppliesPage draft={draft} item={item} pp={pp} stitchMm={g.h * 10}
        measureNote={input.object === "rows" || input.object === "tube" ? "5단을 뜬 뒤 재서 정확하게 맞춥니다." : "3단을 뜬 뒤 재서 정확하게 맞춥니다."} /></>;
      right = previewPage;
    }
    if (phone) phoneBody = <>{left}<div className="mw-split" aria-hidden="true" />{right}</>;
    // the web (Kim: easier to read, nothing cut off): the main choices open as tiles, numbers in boxes
    const webSize = (
      <div className="nb-web">
        <WebHook draft={draft} patch={patch} tried={tried} />
        {!knitNow && (
          <div className="nb-wg"><Head note={CROCHET[draft.crochetStitch ?? "sc"].note}>코바늘 무늬</Head>
            <Tiles label="코바늘 무늬" value={draft.crochetStitch ?? "sc"} cols={4} onPick={v => patch({ crochetStitch: v === "sc" ? undefined : v as CrochetStitch })}
              options={(Object.keys(CROCHET) as CrochetStitch[]).map(k => [k, CROCHET[k].ko])} />
          </div>
        )}
        {draft.free && (
          <div className="nb-wg"><Head note="직접 그린 모양">크기</Head>
            <Slide label="높이" min={3} max={60} step={1} value={draft.free.hCm} onChange={v => patch({ free: { ...draft.free!, hCm: v } })} text={`${draft.free.hCm}cm`} />
            <p className="nb-help">{`가장 넓은 곳은 약 ${freeW}cm입니다. 모양은 품목 단계의 종이에서 다시 그릴 수 있습니다.`}</p>
          </div>
        )}
        {draft.paint && <div className="nb-wg"><Head note="직접 그린 모양">크기</Head><p className="nb-help">{`가로 ${draft.paint.wCm}cm · 세로 ${draft.paint.hCm}cm입니다. 크기는 그리는 종이 아래에서 바꿉니다.`}</p></div>}
        {!draft.free && !draft.paint && shapes.length > 1 && (
          <div className="nb-wg"><Head>{item.kind === "flat-round" ? "모양" : "바닥 모양"}</Head>
            <Tiles label="모양" value={draft.shape} cols={3} onPick={v => pickShape(v as Shape)} options={shapes.map(s => [s, SHAPE_KO[s]])} />
          </div>
        )}
        <div className="nb-wg" style={draft.free || draft.paint ? { display: "none" } : undefined}><Head note={item.name}>크기</Head>
          <div className="nb-two nb-wtwo">
            {fields.map(sizeInput)}
          </div>
          {item.note && <p className="nb-help">{item.note}</p>}
        </div>
        {!bagNow && extrasGroup}
        <AskAiLine which="size" />
      </div>
    );
    const closureNow: NonNullable<Draft["closure"]> = draft.closure ?? (draft.flapCm != null ? "flap" : "open");
    const zipCm = Math.round(input.shape === "circle" ? input.a * Math.PI / 2 : input.a);
    const webBag = (
      <div className="nb-web">
        <div className="nb-wg"><Head>몸통</Head>
          <Tiles label="몸통 모양" value={draft.profile ? "drawn" : draft.topA == null ? "straight" : draft.topA && draft.topA < draft.a ? "taper" : "flare"} cols={draft.profile ? 4 : 3}
            options={[...(draft.profile ? [["drawn", "그린 모양대로"] as [string, string]] : []), ["straight", "일자형"], ["flare", "위로 넓어지는"], ["taper", "위로 좁아지는"]]}
            onPick={v => { if (v === "drawn") return; patch({ profile: undefined, depthProfile: undefined, topA: v === "flare" ? Math.round(draft.a * 1.3) : v === "taper" ? Math.max(3, Math.round(draft.a * .7)) : null }); }} />
          {draft.topA != null && <div className="nb-wsub"><CmInput key={"top" + draft.shape + draft.a + (draft.topA < draft.a ? "t" : "f")} label={draft.shape === "circle" ? "입구 지름 (cm)" : "입구 가로 (cm)"} value={draft.topA || null}
            range={draft.topA < draft.a ? [Math.max(3, Math.ceil(draft.a * .4)), Math.floor(draft.a) - 1] : [Math.floor(draft.a) + 1, LEN_RANGE[1]]} onValue={v => patch({ topA: v ?? 0 })} /></div>}
        </div>
        {/* 입구 (Kim): how the top is closed - every usual way, or drawn by hand when none of them is it */}
        <div className="nb-wg"><Head note="입구를 닫는 방법">입구</Head>
          <Tiles label="입구" value={closureNow} cols={3} onPick={v => {
            const c = v as NonNullable<Draft["closure"]>, ex = draft.extras ?? {};
            patch({ closure: c, flapCm: c === "flap" ? (draft.flapCm ?? Math.max(4, Math.round(draft.h * 0.6))) : null,
              // the zipper and the button also go on the 3D (달아 보기)
              extras: { ...ex, zipper: c === "zipper" ? true : closureNow === "zipper" ? false : ex.zipper, button: c === "button" ? true : closureNow === "button" ? false : ex.button } });
          }} options={[["open", "열린 채로"], ["flap", "덮개"], ["drawstring", "끈으로 조이기"]]} />
          {/* the zipper and the button are put on under 달아 보기 (Kim) */}
          {closureNow === "flap" && <div className="nb-wsub">
            <Tiles label="덮개 모양" value={draft.flapShape ?? "half"} cols={3} onPick={v => patch({ flapShape: v as "half" | "square" | "triangle" })} options={[["half", "반달"], ["square", "네모"], ["triangle", "세모"]]} />
            <CmInput label="덮개 길이 (cm)" value={draft.flapCm || null} range={LEN_RANGE} onValue={v => patch({ flapCm: v ?? 0 })} />
          </div>}
          {closureNow === "drawstring" && <p className="nb-help">입구 아래에 끈 구멍 단을 한 단 더 뜨고, 사슬로 뜬 끈을 꿰어 조입니다.</p>}
          {closureNow === "zipper" && <p className="nb-help">{`입구 길이에 맞는 지퍼(약 ${zipCm}cm)를 준비물에 넣었습니다.`}</p>}
          {closureNow === "button" && <p className="nb-help">단추 1개와 단춧고리 사슬을 준비물에 넣었습니다.</p>}
        </div>
        {item.handles && (
          <div className="nb-wg"><Head note="길이">손잡이</Head>
            <Tiles label="손잡이" value={handlePick} cols={5} onPick={v => {
              setOwnHandle(v === "own");
              if (v === "none") patch({ handle: "none" });
              else if (v === "own") patch({ handle: "short", handleCm: handleCmOf(draft) });
              else patch({ handle: "short", handleCm: Number(v) });
            }} options={[["none", "없음"], ...HANDLE_PRESETS.map(([n, v]): [string, ReactNode, ReactNode] => [String(v), n, `${v}cm`]), ["own", "직접", "cm"]]} />
            {draft.handle !== "none" && <Tiles label="손잡이 수" value={String(draft.handleCount ?? (handleCmOf(draft) >= 60 ? 1 : 2))} cols={2} onPick={v => patch({ handleCount: Number(v) as 1 | 2 })} options={[["1", "1개", "위로 가로질러"], ["2", "2개", "앞뒤로"]]} />}
            {handleMake}
            {handleSliders}
            {handlePick === "own" && <div className="nb-wsub"><CmInput key={"wh" + hRev} label="손잡이 길이 (cm)" value={handleCmOf(draft)} range={HANDLE_RANGE} autoFocus={ownHandle} onValue={v => patch({ handle: "short", handleCm: v ?? 0 })} /></div>}
            <p className="nb-help">손에 드는 토트 약 50cm, 어깨에 메는 숄더 약 70cm, 몸에 두르는 크로스 약 120cm입니다.</p>
          </div>
        )}
        {extrasGroup}
      </div>
    );
    oneYarn = <WebYarn draft={draft} patch={patch} tried={tried} noColor />;
    const craftNow = draft.craft ?? (knitNow ? "knit" : "crochet");
    oneHook = (
      <div className="nb-web">
        <div className="nb-wg"><Head note="무늬가 바늘에 따라 달라집니다">바늘 종류</Head>
          <Tiles label="바늘 종류" value={craftNow} cols={2} onPick={v => patch({ craft: v as "crochet" | "knit" })} options={[["crochet", "코바늘", "짧은뜨기 · 긴뜨기…"], ["knit", "대바늘", "메리야스 · 고무뜨기…"]]} />
          {craftNow === "knit" && !knitNow && <p className="nb-help">대바늘 도안은 목도리처럼 평평하게 뜨는 편물에서 만들 수 있습니다. 이 모양은 코바늘로 계산합니다.</p>}
        </div>
        <WebHook draft={draft} patch={patch} tried={tried} />
      </div>
    );
    // 무늬 by the needle (Kim): the needle picked here or under 바늘 is the same choice
    oneStitch = <WebStitchByNeedle draft={draft} patch={patch} n={pp.last} craft={craftNow} flatOnly={craftNow === "knit" && !knitNow} />;
    oneSize = (
      <div className="nb-web">
        {draft.free && <div className="nb-wg"><Head note="직접 그린 모양">높이</Head>
          <Slide label="높이" min={3} max={60} step={1} value={draft.free.hCm} onChange={v => patch({ free: { ...draft.free!, hCm: v } })} text={`${draft.free.hCm}cm`} />
          <p className="nb-help">{`가장 넓은 곳은 약 ${freeW}cm입니다.`}</p></div>}
        {draft.paint && <p className="nb-help">{`가로 ${draft.paint.wCm}cm · 세로 ${draft.paint.hCm}cm입니다. 크기는 그리는 종이 아래에서 바꿉니다.`}</p>}
        {!draft.free && !draft.paint && shapes.length > 1 && (
          <div className="nb-wg"><Head>{item.kind === "flat-round" ? "모양" : "바닥 모양"}</Head>
            <Tiles label="모양" value={draft.shape} cols={3} onPick={v => pickShape(v as Shape)} options={shapes.map(s => [s, SHAPE_KO[s]])} />
          </div>
        )}
        {!draft.free && !draft.paint && <div className="nb-wg"><Head note={itemLabel}>크기</Head><div className="nb-two nb-wtwo">{fields.map(sizeInput)}</div></div>}
      </div>
    );
    // 입혀 보기: the bag's body, opening, flap, handles and what is sewn on; other pieces what is sewn on
    oneShape = bagNow ? webBag : <div className="nb-web">{extrasGroup}</div>;
    // 조립하기 (Kim: 조립식으로, 슬라이더로 자유롭게): the parts in one row, the picked part's sliders under it.
    // Everything lands in the draft's own sizes, so the counts and the 3D follow at once.
    const base = item.kind === "base-body" && item.id !== "beanie" && !draft.free && !draft.paint, form = bodyOf(draft);
    const rng = (k: "a" | "b" | "h", d: [number, number]) => item.range[k] ?? d;
    const hasFlap = !!draft.flapCm, flapNow = draft.flapCm ?? 0;
    const railParts: [string, string, boolean][] = base
      ? [["bottom", "바닥", true], ["body", "몸통", true], ...(item.handles ? [["handle", "손잡이", draft.handle !== "none"] as [string, string, boolean]] : []), ...(bagNow ? [["top", "입구·덮개", hasFlap || closureNow !== "open"] as [string, string, boolean]] : []), ["extra", "달기", !!(exNow.button || exNow.label || exNow.zipper)]]
      : [["size", "크기", true], ["extra", "달기", !!(exNow.button || exNow.label || exNow.zipper)]];
    const partNow = railParts.some(([k]) => k === asmPart) ? asmPart : railParts[0][0];
    const setBody = (f: Partial<typeof form>) => apply(bodyPatch(draft, { ...form, ...f }));
    const setBottom = (k: "a" | "b" | "h", v: number) => { const nd = { ...draft, [k]: v }; apply({ [k]: v, ...(draft.asm && (draft.asm.belly >= .03 || k === "a") ? bodyPatch(nd, draft.asm.belly < .03 && draft.topA == null ? { ...draft.asm, top: nd.a } : draft.asm) : {}) }); };
    const ra = rng("a", [6, 40]), rb = rng("b", [4, 30]), rh = rng("h", [5, 40]);
    const widest = base ? Math.round(Math.max(...[0, .25, .5, .75, 1].map(t => bodyWidth(draft.a, form, t))) * 10) / 10 : 0;
    const asmPanel = !picked ? (
      <div className="nb-web">
        <div className="asm-none"><p>조립할 부품이 아직 없습니다.</p>
          <button type="button" className="nb-tile" onClick={() => setAsked(false)}>얀이에게 말로 설명하기</button></div>
        <WebItems value="" onPick={pickItem} tried={tried} />
      </div>
    ) : (draft.free || draft.paint) ? (
      <div className="nb-web"><p className="nb-help">직접 그린 모양입니다. 부품으로 조립하려면 아래에서 뜰 것을 다시 정해 주십시오.</p>
        <button type="button" className="nb-tile" onClick={() => { patch({ free: undefined, paint: undefined, itemPicked: false }); setAsked(false); }}>부품으로 다시 시작하기</button></div>
    ) : (
      <div className="nb-web asm">
        {draft.a > 0 && <div className="asm-all">
          <Slide label="전체 크기" min={ra[0]} max={ra[1]} step={.5} value={Math.min(ra[1], Math.max(ra[0], draft.a))} onChange={v => apply(scaleDraft(draft, v / draft.a))} text={`폭 ${draft.a}cm`} />
          <p className="nb-help">전체를 같은 비율로 키우거나 줄입니다. 화면 위 "크기 틀"(Ctrl+T)로 3D에서 바로 끌어도 됩니다.</p>
        </div>}
        <div className="asm-rail" role="tablist" aria-label="부품">
          {railParts.map(([k, t, on]) => <button key={k} type="button" role="tab" aria-selected={partNow === k} className={on ? "" : "is-off"} onClick={() => setAsmPart(k)}>{on ? t : "+ " + t}</button>)}
        </div>
        <div className="asm-card" role="tabpanel">
          {partNow === "size" && <>
            <h3>크기<small>{item.name}</small></h3>
            {shapes.length > 1 && <Tiles label="모양" value={draft.shape} cols={3} onPick={v => pickShape(v as Shape)} options={shapes.map(sh => [sh, SHAPE_KO[sh]])} />}
            <div className="nb-two nb-wtwo">{fields.map(sizeInput)}</div>
            {item.note && <p className="nb-help">{item.note}</p>}
          </>}
          {partNow === "bottom" && <>
            <h3>바닥<small>여기서부터 뜹니다</small></h3>
            {shapes.length > 1 && <Tiles label="바닥 모양" value={draft.shape} cols={3} onPick={v => pickShape(v as Shape)} options={shapes.map(sh => [sh, SHAPE_KO[sh]])} />}
            <div className="nb-sliders nb-sliders-1">
              <Slide label={draft.shape === "circle" ? "지름" : "가로"} min={ra[0]} max={ra[1]} step={.5} value={draft.a} onChange={v => setBottom("a", v)} text={`${draft.a}cm`} />
              {draft.shape !== "circle" && <Slide label="세로" min={rb[0]} max={Math.min(rb[1], Math.max(rb[0], draft.a - 1))} step={.5} value={draft.b} onChange={v => setBottom("b", v)} text={`${draft.b}cm`} />}
            </div>
            <p className="nb-help">{draft.shape === "circle" ? "원 바닥은 통처럼 둥근 몸통이 됩니다." : draft.shape === "oval" ? "타원 바닥은 납작하고 부드러운 가방이 됩니다." : "네모 바닥은 각이 잡힌 몸통이 됩니다."}</p>
          </>}
          {partNow === "body" && <>
            <h3>몸통<small>{`가장 넓은 곳 ${widest}cm`}</small></h3>
            <div className="nb-sliders nb-sliders-1">
              <Slide label="높이" min={rh[0]} max={rh[1]} step={.5} value={draft.h} onChange={v => setBottom("h", v)} text={`${draft.h}cm`} />
              <Slide label="위 너비" min={Math.max(3, Math.round(draft.a * .4))} max={Math.round(draft.a * 2)} step={.5} value={form.top} onChange={v => setBody({ top: v })} text={`${form.top}cm`} />
              <Slide label="배 부푼 정도" min={0} max={1} step={.05} value={form.belly} onChange={v => setBody({ belly: v })} text={form.belly < .03 ? "없음" : form.belly < .35 ? "조금" : form.belly < .7 ? "볼록" : "아주 볼록"} />
              {form.belly >= .03 && <Slide label="둥근 정도" min={0} max={1} step={.05} value={form.round} onChange={v => setBody({ round: v })} text={form.round < .35 ? "뾰족하게" : form.round < .7 ? "부드럽게" : "공처럼"} />}
            </div>
            <p className="nb-help">{form.belly >= .03 ? "옆선이 부풀었다가 입구로 모입니다. 단마다 코를 늘리고 줄여서 뜹니다." : Math.abs(form.top - draft.a) < .5 ? "바닥에서 곧게 올라갑니다." : form.top > draft.a ? "위로 갈수록 넓어집니다." : "위로 갈수록 좁아집니다."}</p>
            <button type="button" className="nb-link" onClick={() => apply({ asm: undefined, profile: undefined, depthProfile: undefined, topA: null })}>일자 몸통으로 되돌리기</button>
          </>}
          {partNow === "handle" && (draft.handle === "none" ? <>
            <h3>손잡이</h3><p className="nb-help">손잡이가 없습니다.</p>
            <button type="button" className="nb-tile asm-add" onClick={() => patch({ handle: "short", handleCm: draft.handleCm || 45, handleCount: draft.handleCount ?? 2 })}>+ 손잡이 넣기</button>
          </> : <>
            <h3>손잡이<button type="button" className="nb-link asm-del" onClick={() => patch({ handle: "none" })}>이 부품 빼기</button></h3>
            <Tiles label="손잡이 수" value={String(draft.handleCount ?? (handleCmOf(draft) >= 60 ? 1 : 2))} cols={2} onPick={v => patch({ handleCount: Number(v) as 1 | 2 })} options={[["1", "1개", "위로 가로질러"], ["2", "2개", "앞뒤로"]]} />
            {handleMake}
            {handleSliders}
            <p className="nb-help">손에 드는 토트 약 50cm, 어깨에 메는 숄더 약 70cm, 몸에 두르는 크로스 약 120cm입니다.</p>
          </>)}
          {partNow === "top" && <>
            <h3>입구와 덮개</h3>
            <Tiles label="입구" value={closureNow === "flap" || closureNow === "drawstring" ? closureNow : "open"} cols={3} onPick={v => {
              const c = v as "open" | "flap" | "drawstring";
              patch({ closure: c, flapCm: c === "flap" ? (draft.flapCm ?? Math.max(4, Math.round(draft.h * .5))) : null });
            }} options={[["open", "열린 채로"], ["flap", "덮개"], ["drawstring", "끈으로 조이기"]]} />
            {hasFlap && <>
              <Tiles label="덮개 모양" value={draft.flapShape ?? "half"} cols={3} onPick={v => patch({ flapShape: v as "half" | "square" | "triangle" })} options={[["half", "반달"], ["square", "네모"], ["triangle", "세모"]]} />
              <div className="nb-sliders nb-sliders-1"><Slide label="덮개 길이" min={3} max={Math.max(8, Math.round(draft.h))} step={.5} value={Math.min(flapNow, Math.max(8, Math.round(draft.h)))} onChange={v => patch({ flapCm: v })} text={`${flapNow}cm`} /></div>
              <button type="button" className="nb-link asm-del" onClick={() => patch({ closure: "open", flapCm: null })}>덮개 빼기</button>
            </>}
            {closureNow === "drawstring" && <p className="nb-help">입구 아래에 끈 구멍 단을 한 단 더 뜨고, 사슬로 뜬 끈을 꿰어 조입니다.</p>}
            <p className="nb-help">지퍼와 단추는 "달기"에서 붙입니다.</p>
          </>}
          {partNow === "extra" && extrasGroup}
        </div>
        <div className="asm-sum"><h3>지금 조립된 것</h3>
          <ul>{partLines(draft).map(([a, b]) => <li key={a}><b>{a}</b><span>{b}</span></li>)}</ul>
          <button type="button" className="nb-link" onClick={() => setAsked(false)}>얀이에게 다시 말로 설명하기</button>
        </div>
      </div>
    );
    oneAsm = (
      <div className="nb-web">
        <div className="nb-needle asm-mode" role="radiogroup" aria-label="모양을 만드는 방법">
          {([["asm", "조립하기"], ["draw", "그리기"]] as const).map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={shapeMode === k} onClick={() => setShapeMode(k)}>{t}</button>)}
        </div>
        {shapeMode === "asm" ? asmPanel : <>{drawPanel}{picked && (draft.free || draft.paint) && oneSize}</>}
      </div>
    );
    // 확인: short rows with 고치기, the yarn amount, the counts as small cards
    const hookMm = draft.hook ? hookMmOf(draft) : NaN;
    const ucolors = [{ hex: draft.color, name: draft.colorName }, ...(draft.moreColors ?? [])].filter(c => c.hex || c.name);
    const use = yarnUse(pp, { weight: draft.weight, yarnMm: draft.yarnMm, yarnMode: draft.yarnMode, skeinG: draft.skeinG, skeinM: draft.skeinM, skeins: draft.skeins, colors: Math.max(1, ucolors.length), materials: draft.materials });
    const yarnBits = [draft.materials?.join(" · "), yarnWeightText(draft) !== "—" ? yarnWeightText(draft) : "", ucolors.map(c => c.name || "직접 고른 색").join(" · ")].filter(Boolean).join(" · ");
    // 입구 for 확인 (the drawn one shows its drawing)
    const closureText = closureNow === "flap" ? `${{ half: "반달", square: "네모", triangle: "세모" }[draft.flapShape ?? "half"]} 덮개${draft.flapCm ? ` ${draft.flapCm}cm` : ""}` : closureNow === "drawstring" ? "끈으로 조이기" : closureNow === "zipper" ? `지퍼 약 ${zipCm}cm` : closureNow === "button" ? "단추로 닫기" : "";
    const checkRows = [
      { k: "실", v: <>{ucolors[0]?.hex && <i className="nb-swatch" style={{ background: ucolors[0].hex }} />}{yarnBits || "고르지 않음"}</>, fix: () => fixAt(0) },
      { k: "바늘", v: Number.isFinite(hookMm) ? hookLabel(hookMm) : "고르지 않음", fix: () => fixAt(1) },
      { k: "크기", v: draft.free || draft.paint ? sizeCaption : sizeText.replace("cm", "cm") + (input.object === "bag" && draft.h ? ` · 높이 ${draft.h}cm` : ""), fix: () => fixAt(1) },
      // the named pattern picked (lib/stitchPatterns), else a knitted piece's stitch
      ...(draft.pattern && PATTERN_BY_ID[draft.pattern] ? [{ k: "무늬", v: `${PATTERN_BY_ID[draft.pattern].ko} (${PATTERN_BY_ID[draft.pattern].needle === "knit" ? "대바늘" : "코바늘"})`, fix: () => fixAt(2) }]
        : isKnit({ item: item.id }) ? [{ k: "무늬", v: stitchOf(draft.stitch).ko, fix: () => fixAt(2) }] : []),
      ...(isBag(item) ? [{ k: "모양", v: [draft.topA ? `위로 넓어지는 (입구 ${draft.topA}cm)` : "일자형", closureText, item.handles ? `손잡이 ${handleText(draft)}` : ""].filter(Boolean).join(" · "), fix: () => fixAt(2) }] : []),
    ];
    const facts: [string, string][] = [["한 코", `약 ${Math.round(g.h * 10)}mm`]];
    if (input.object === "rows" && start) facts.push(["시작 사슬", `${start.n}코`], ["단 수", `${pp.bodyRows}단`]);
    if (input.object === "tube" && start) facts.push(["시작 사슬", `${start.n}코`], ["단 수", `${pp.bodyRows}단`]);
    if (input.object === "coaster" || input.object === "bag") facts.push(["바닥", `${pp.bottomRounds}단 · ${pp.last}코`]);
    if (input.object === "bag") facts.push(["몸통", `${pp.bodyRows}단` + (handleRow ? ` · 손잡이 ${handleRow.n}코` : "")]);
    const basis = use.basis === "label" ? "실 라벨" : use.basis === "mm" ? `실 굵기 ${draft.yarnMm}mm` : "실 굵기";
    const skeinText = draft.skeinG && draft.skeinM ? `한 타래 ${draft.skeinG}g · ${draft.skeinM}m 기준` : draft.skeinG ? `한 타래 ${draft.skeinG}g 기준` : draft.skeinM ? `한 타래 ${draft.skeinM}m 기준` : "";
    rightWeb = step === 3
      ? [<WebYarn key="y" draft={draft} patch={patch} tried={tried} />, webSize, bagNow ? webBag : <WebStitch key="s" draft={draft} patch={patch} n={pp.last} />][sheet]
      // the cover first (Kim: picked before the pattern is made; none = a random one), then the check
      : <><CoverChoice draft={draft} patch={patch} /><WebCheck draft={draft} itemName={itemLabel} rows={checkRows} facts={facts}
          use={{ g: use.g, m: use.m, skeins: use.skeins ?? null, short: !!use.short, labelOdd: !!use.labelOdd, perColor: !!use.perColor, colors: ucolors.length, per100: use.per100, basis, skeinText }}
          measureNote={input.object === "rows" || input.object === "tube" ? "5단을 뜬 뒤 폭과 높이를 재서 정확하게 맞춥니다." : "3단을 뜬 뒤 지름을 재서 정확하게 맞춥니다."} /></>;
  }

  const phoneNext: Record<Step, string> = { 1: "다음 · 품목 ↑", 2: "다음 · 실과 바늘 ↑", 3: "다음 · 준비물 확인 ↑", 4: "완성 · 최종 도안 보기" };
  const phoneStep: PhoneStep | undefined = phone ? {
    step, title: titles[step], ask: step === 2 ? "item" : step === 3 ? "yarn" : null, body: phoneBody,
    back: step > 1 ? { label: "이전", onClick: () => go((step - 1) as Step) } : editId ? { label: "돌아가기", onClick: book.close } : { label: "메뉴", onClick: book.toHome },
    nextText: phoneNext[step], blocked: blockNext || (step === 3 && !stepOk), final: step === 4, next,
  } : undefined;

  // the work screen (3D로 보면서 만들기, Kim: "all of this is deciding the shape"): every section on one screen -
  // 뜰 것, 색, 실, 바늘과 크기, then the bag's shape and opening (or the knitted stitch) - and one way on, to 확인
  // the yarn-check swatch: a small piece in the picked yarn, hook and stitch, seen close up
  const swatchKnit = (draft.craft ?? (knitNow ? "knit" : "crochet")) === "knit";
  const swatchSrc = { ...yarnSrc, craft: swatchKnit ? "knit" as const : "crochet" as const, object: "rows" as const, item: swatchKnit ? "scarf" : "dishcloth", shape: "rect" as const, a: 9, b: 7, h: 0, handle: "none" as const, handleCm: null, topA: null, flapCm: null, free: undefined, paint: undefined, extras: undefined };
  const making = web && (step === 2 || step === 3) ? {
    sections: [
      // the colour before the yarn's material (Kim)
      { id: "color", title: "색", body: <ColorStudio draft={draft} patch={patch} /> },
      { id: "yarn", title: "실", body: oneYarn },
      { id: "needle", title: "바늘", body: oneHook },
      { id: "stitch", title: "무늬", note: (draft.craft ?? (knitNow ? "knit" : "crochet")) === "knit" ? "대바늘" : "코바늘", body: oneStitch },
      { id: "draw", title: "모양", note: picked ? itemLabel : undefined, body: oneAsm },
    ],
    done: () => {
      if (!stepOk) { setTried(true); requestAnimationFrame(() => (document.querySelector('.yw [aria-invalid="true"]') as HTMLElement | null)?.focus()); return; }
      big3d.close(); setSheet(3, sheets3 - 1); go(4);
    },
    doneLabel: "확인하기 →", blocked: !picked || !stepOk,
  } : undefined;
  const workNode = web ? big3d.render({ title: draft.name.trim() || NO_NAME, name: { value: draft.name, onChange: v => patch({ name: v }) }, sub: picked ? itemLabel : undefined, caption: sizeCaption, backLabel: "← 책으로", making, panel: making ? undefined : workPanel,
    empty: !picked,
    // 조립하기: what to make, asked first (Kim); the 크기 틀 dragged on the 3D
    ask: big3d.open && !picked && !asked && !editId ? <AskStart draft={draft} onName={v => patch({ name: v })} onSkip={() => { setAsked(true); setShapeMode("asm"); }}
      onApply={d => { setDraft(d); setNums(numsOf(d)); setAsked(true); setShapeMode("asm"); setAsmPart(ITEM[itemIdOf(d)].kind === "base-body" ? "body" : "size"); window.dispatchEvent(new Event("yw:shape")); }} /> : undefined,
    onResize: picked && !draft.free && !draft.paint ? (fx, fy) => {
      if (fx !== 1 && fx === fy) { apply(scaleDraft(draft, fx)); return; }
      const lim = (k: "a" | "b" | "h", v: number) => { const r = item.range[k]; const x = Math.round(v * 2) / 2; return r ? Math.min(r[1], Math.max(r[0], x)) : x; };
      const up: "h" | "b" = input.object === "bag" || input.object === "tube" ? "h" : "b", p: Partial<Draft> = {};
      if (fx !== 1) { p.a = lim("a", draft.a * fx); if (draft.shape === "circle" && item.kind !== "base-body") p.b = p.a; }
      if (fy !== 1) { if (draft.shape === "circle" && item.kind === "flat-round") p.a = lim("a", draft.a * fy); else p[up] = lim(up, draft[up] * fy); }
      const nd = { ...draft, ...p }; apply({ ...p, ...(draft.asm ? bodyPatch(nd, draft.asm) : {}) });
    } : undefined,
    // the first thing on the stage (Kim): the yarn as it will look, before any shape
    intro: <YarnCheck source={swatchSrc} plan={plan(swatchSrc)} big />,
    dims: input.object === "coaster" || input.object === "bag" ? [input.a, input.object === "bag" && input.h ? input.h : input.shape === "circle" ? input.a : input.b ?? input.a] : undefined,
    parts: partsOf(pp, isKnit({ item: item.id }) ? "코잡기" : undefined), onClosed: () => setRev(r => r + 1),
    // 단추 / 라벨 dragged on the 3D (Kim): kept where they were let go, their size as it was
    onExtraMove: (k, x, y) => { const key = k === "button" ? "buttonAt" : "labelAt", old = exNow[key]; setEx({ [key]: [x, y, old?.[2] ?? (k === "button" ? 1.9 : 2.8)] }); } }) : null;

  return {
    ready, formRef, onSubmit, onKeyDown, phone: phoneStep,
    // 3D로 보기 on every step (Kim: from the start and between steps), the pattern so far; hidden while the
    // draft is not a round coaster or bag
    threeD: <YarnPreviewButton source={yarnSrc} plan={pp} className="nb-3d" />,
    // the gold ribbon closes the book, as on the menu page (the draft is saved on every change)
    // the very same ribbon as the menu page's (PageSpread.tsx): all gold leaf, hanging from the page's top
    // edge, "책 덮기" beside it on hover
    ribbon: (
      <button type="button" className="nb-ribbon" aria-label="책 덮기" onClick={book.close}>
        <span className="nb-ribbon-tab"><GoldX /></span>
        <span className="nb-ribbon-tip" aria-hidden="true">책 덮기</span>
      </button>
    ),
    left: web && step > 1 ? (
      // the web from step 2 (Kim): the left page is the 3D; at its foot 이전 and the work screen (full screen).
      // Nothing picked yet: where the piece will stand, empty
      <section className="nb-page nb-left nb-3dleft" aria-label="3D 미리 보기">
        {/* while the work screen covers the book its page's own 3D is let go (it would rebuild unseen on every
            change, a third WebGL scene next to the book's and the work screen's: drawing there made the book's
            context get lost, which dropped the 3D book and the work screen with it) */}
        {big3d.open ? <div className="y3-page" aria-hidden="true" /> : step === 2 && !picked
          ? <div className="y3-page-empty"><i aria-hidden="true" /><p>오른쪽에서 고르면<br />여기에 실로 뜬 모습이 나타납니다.</p></div>
          : <YarnPagePreview source={yarnSrc} plan={pp} fabric={knitNow && step === 3 && sheet === 2} caption={sizeCaption} />}
        <div className="nb-foot">
          <ClothLabel side="back" type="button" onClick={back}>← 이전</ClothLabel>
          {big3d.supported && <ClothLabel side="next" type="button" onClick={big3d.show}>{step === 4 ? "다시 3D로 고치기" : "3D로 보면서 만들기"}</ClothLabel>}
          <span className="nb-folio">{folio}</span>
        </div>
      </section>
    ) : (
      <section className="nb-page nb-left" aria-labelledby="nbTitle">
        {step !== 1 && progress}
        <div key={"l" + pos + "-" + rev} className={"nb-turn " + (dir > 0 ? "nb-dir-fwd" : "nb-dir-back")} onAnimationEnd={e => e.currentTarget.classList.remove("nb-dir-fwd", "nb-dir-back")}>
          <h1 id="nbTitle" ref={titleRef} tabIndex={-1} className={step === 1 ? "sr" : undefined}>{titles[step]}</h1>
          {step === 2 && <AskAiLine which="item" />}{step === 3 && <AskAiLine which="yarn" />}
          {left}
        </div>
        <div className="nb-foot">
          {step > 1 ? <ClothLabel side="back" type="button" onClick={back}>← 이전</ClothLabel> : editId ? <ClothLabel side="back" type="button" onClick={book.close}>← 돌아가기</ClothLabel>
            : <ClothLabel side="back" type="button" onClick={book.toHome}>← 메뉴</ClothLabel>}
          <span className="nb-folio">{folio}</span>
        </div>
      </section>
    ),
    right: (
      <section className="nb-page nb-right" aria-labelledby={web && step > 1 ? "nbTitle" : undefined} aria-label={web && step > 1 ? undefined : step === 4 ? "미리 보기" : step === 3 ? "모양과 크기" : "지금까지"}>
        {web && step > 1 && progress}
        <div key={"r" + pos + "-" + rev} className={"nb-turn " + (dir > 0 ? "nb-dir-fwd" : "nb-dir-back")} onAnimationEnd={e => e.currentTarget.classList.remove("nb-dir-fwd", "nb-dir-back")}>
          {web && step > 1 ? <>
            <h1 id="nbTitle" ref={titleRef} tabIndex={-1}>{titles[step]}</h1>
            {subSteps}
            {step === 3 && sheet === 0 && <AskAiLine which="yarn" />}
            {/* while the work screen is open its right column holds this step: one copy of the inputs */}
            {big3d.open && step < 4 ? null : rightWeb}
          </> : right}
        </div>
        {workNode}
        <div className="nb-foot">
          <span className="nb-folio">{folio + 1}</span>
          {step === 4
            // the last step: the mocha lace tag (Girl's Diary), unlike the small cloth labels of the steps before
            ? <LaceButton variant="mocha" width={360} type="submit" className="nb-final-lace" aria-disabled={blockNext || undefined}>
                <small>마지막 단계</small>완성 · 최종 도안 보기 →
              </LaceButton>
            : step === 1 && webStart ? null
            : <ClothLabel side="next" type="submit" blocked={blockNext || (step === 3 && !sheetOk)}>{nextLabel[step]}</ClothLabel>}
        </div>
      </section>
    ),
  };
}

/** The one-page CSS book: phones and browsers without WebGL. */
export function NewBook() {
  const v = useNewBook();
  if (!v.ready) return <main id="view-new" className="nb-main" />;
  return (
    <main id="view-new" className="nb-main">
      <form ref={v.formRef} className="nb-book" noValidate onSubmit={v.onSubmit} onKeyDown={v.onKeyDown}>
        {v.ribbon}
        <span className="nb-marker" aria-hidden="true" />
        {v.left}
        {v.right}
        {/* phones: the AI tab on the page's edge (the sheet itself is on the book's stage, AiHost) */}
        <AiTab variant="phone" />
      </form>
    </main>
  );
}
