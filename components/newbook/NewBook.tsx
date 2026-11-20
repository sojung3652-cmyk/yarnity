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
import { engineDims, ENGINE, fieldsFor, GROUPS, HANDLE_PRESETS, ITEM, ITEMS, itemIdOf, type FieldKey, type Item, type ItemId } from "@/lib/items";
import { gauge, plan, SHAPE_KO, type Handle, type PlanInput, type Shape } from "@/lib/pattern";
import { store } from "@/lib/store";
import type { Draft } from "@/lib/types";
import { ItemArt } from "./ItemArt";
import { TitleCover, TitlePage } from "./TitlePage";
import { ClothLabel } from "./ClothLabel";
import { GoldX } from "@/components/GoldX";
import { SuppliesPage, YarnPage, yarnStepOk } from "./YarnStep";
import { Fold, useOneOpen } from "./Fold";
import { canTurn, snapshot, startTurn, type Snapshot, type Turn } from "./pageTurn";
import { useMobile } from "@/components/mobile/useMobile";
import { useBook, type WizStep } from "@/components/Book/BookProvider";
import { AskAiLine } from "@/components/AskAiLine";
import { AiTab } from "@/components/AiTab";
import { LaceButton } from "@/components/diary/Diary";
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
const HANDLE_RANGE: [number, number] = [10, 200];

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
  const v = Number(raw.trim()), err = !raw.trim() ? "숫자를 적어 주세요." : !Number.isFinite(v) || v <= 0 ? "0보다 큰 숫자를 적어 주세요."
    : v < range[0] || v > range[1] ? `${range[0]}~${range[1]}cm 사이로 적어 주세요.` : "";
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
export function useNewBook(inBook?: WizStep): NewBookView {
  const { ready, draft, setDraft, addProject, updateProject, projects, setActive, chat } = useApp();
  const router = useRouter();
  const book = useBook(), step = inBook ?? book.step, phone = useMobile();
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
  const [ownHandle, setOwnHandle] = useState(false); // handle: "직접 입력" picked (stays custom even on a preset value)
  const loaded = useRef(false), titleRef = useRef<HTMLHeadingElement>(null), shownStep = useRef(step);
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

  // a new item starts from its own defaults (no values carried over from the previous item)
  const pickItem = (id: ItemId) => {
    if (id === item.id) { if (!draft.itemPicked) patch({ itemPicked: true }); return; }
    const it = ITEM[id], dv = it.defaults;
    const d: Draft = { ...draft, item: id, object: ENGINE[it.kind], shape: dv.shape ?? "rect", a: dv.a, b: dv.b ?? dv.a, h: dv.h ?? 0, handle: dv.handle ?? "none", handleCm: dv.handleCm ?? null, topA: null, flapCm: null, circ: dv.circ, depth: dv.depth, itemPicked: true };
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
    for (const f of fields) {
      const raw = nums[f.key].trim(), v = Number(raw);
      if (!raw) e[f.key] = "숫자를 적어 주세요.";
      else if (!Number.isFinite(v) || v <= 0) e[f.key] = "0보다 큰 숫자를 적어 주세요.";
      else if (v < f.min || v > f.max) e[f.key] = `${f.min}~${f.max}cm 사이로 적어 주세요.`;
    }
    return e;
  }, [nums, fields]);
  const setNum = (k: FieldKey) => (raw: string) => {
    setNums(n => ({ ...n, [k]: raw }));
    const f = fields.find(x => x.key === k), v = Number(raw.trim());
    if (f && raw.trim() && Number.isFinite(v) && v >= f.min && v <= f.max) patch({ [k]: v } as Partial<Draft>);
  };

  const input = useMemo(() => engineInput(draft), [draft]);
  const pp = useMemo(() => plan(input), [input]);
  const g = useMemo(() => gauge(input), [input]);
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
    const was = shownStep.current; if (was === step) return;
    shownStep.current = step;
    setDir(step > was ? 1 : -1); setTried(false);
    // the CSS book's form, or the 3D book's two page forms
    const book = formRef.current ?? document.querySelector<HTMLElement>(".book3d"); if (!book) return;
    // focus: the new step's first field (the one that had focus is gone)
    const focusFirst = () => (book.querySelector<HTMLElement>('.nb-page .nb-turn input:not([type="color"]), .nb-page .nb-turn textarea, .nb-page .nb-turn [role="radio"][tabindex="0"], .nb-page .nb-turn button') ?? titleRef.current)?.focus({ preventScroll: true });
    const snap = pending.current; pending.current = null;
    if (!snap || !formRef.current) { requestAnimationFrame(focusFirst); return; }
    turn.current = startTurn(formRef.current, snap, () => { turn.current = null; focusFirst(); });
  }, [step]);
  useEffect(() => () => turn.current?.finish(), []);

  const save = () => {
    const e = engineInput(draft);
    const d: Draft = { ...draft, shape: e.shape, a: e.a, b: e.b as number, h: e.h as number, object: e.object, handle: e.handle as Handle, handleCm: e.handleCm ?? null, topA: e.topA ?? null, flapCm: e.flapCm ?? null, name: draft.name.trim() || NO_NAME, item: item.id };
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
    }
    router.push("/pattern");
  };
  const next = () => {
    if (!stepOk) { setTried(true); requestAnimationFrame(() => (document.querySelector('.nb-book [aria-invalid="true"], .mw-form [aria-invalid="true"]') as HTMLElement | null)?.focus()); return; }
    if (step < 4) go((step + 1) as Step); else save();
  };

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); next(); };
  // Enter = next step from anywhere in the book (inputs submit by themselves; chips, cards and the
  // title too); other buttons and links keep their own Enter
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    const t = e.target as HTMLElement;
    if (e.key === "Enter" && !e.nativeEvent.isComposing && (t.getAttribute("role") === "radio" || t === titleRef.current)) { e.preventDefault(); next(); }
  };
  if (!ready) return { ready, formRef, onSubmit, onKeyDown, ribbon: null, left: null, right: null };


  const titles: Record<Step, string> = { 1: "이 작품의 이름은 무엇인가요?", 2: "무엇을 뜰까요?", 3: "어떤 실로, 어떤 크기로 뜰까요?", 4: "준비물을 확인해요" };
  const nextLabel: Record<Step, string> = { 1: "다음 · 품목 →", 2: "다음 · 실과 바늘 →", 3: "다음 · 준비물 확인 →", 4: "완성 · 최종 도안 보기 →" };

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
    right = <TitlePage name={draft.name} onName={v => patch({ name: v })} onEnter={next} progress={progress} />;
    if (phone) phoneBody = <TitlePage name={draft.name} onName={v => patch({ name: v })} onEnter={next} progress={null} />;
  } else if (step === 2) {
    left = (
      <div className="nb-folds nb-groups">
        {tried && !picked && <p className="nb-err" role="alert">뜨고 싶은 것을 하나 골라 주세요.</p>}
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
          {tried && !picked && <p className="nb-err" role="alert">뜨고 싶은 것을 하나 골라 주세요.</p>}
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
        <p>왼쪽에서 뜨고 싶은 것을 골라 보세요.</p>
        <p className="nb-help">고르면 여기에 소개가 나와요.</p>
      </div>
    );
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
                range={[Math.ceil(draft.a) + 1, Math.round(draft.a * 2)]} onValue={v => patch({ topA: v ?? 0 })} /></div>}
            </Fold>
            {/* a flap (cover) over the opening, worked back and forth from the back */}
            <Fold label="덮개" value={draft.flapCm ? `있음 · ${draft.flapCm}cm` : draft.flapCm === 0 ? "있음" : "없음"} open={fold4 === "flap"} onToggle={() => toggle4("flap")}>
              <Radios label="덮개" value={draft.flapCm != null ? "yes" : "no"} options={[["no", "없음"], ["yes", "있음"]]}
                onPick={v => patch({ flapCm: v === "yes" ? Math.max(4, Math.round(draft.h * 0.6)) : null })} />
              {draft.flapCm != null && <div className="nb-sub"><CmInput label="덮개 길이 (cm)" value={draft.flapCm || null} range={[3, 40]} onValue={v => patch({ flapCm: v ?? 0 })} /></div>}
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
                <p className="nb-help">손에 드는 토트 약 50cm, 어깨에 메는 숄더 약 70cm, 몸에 두르는 크로스 약 120cm예요.</p>
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
          ? "코 수는 공식으로 계산해요. 5단을 뜬 뒤 폭과 높이를 재면 남은 단 수를 내 손에 맞게 고쳐 드려요."
          : "코 수는 공식으로 계산해요. 3단을 뜬 뒤 지름을 재면 내 손에 맞게 다시 계산해 드려요."}</p>
      </div>
    );
    if (step === 3) {
      left = <YarnPage draft={draft} patch={patch} tried={tried} />;
      right = <section className="nb-sec" aria-labelledby="secSize"><h2 className="nb-sec-title" id="secSize">모양과 크기</h2><AskAiLine which="size" />{sizePage}</section>;
    } else {
      left = <SuppliesPage draft={draft} item={item} pp={pp} stitchMm={g.h * 10}
        measureNote={input.object === "rows" || input.object === "tube" ? "5단을 뜬 뒤 재서 정확하게 맞춰요." : "3단을 뜬 뒤 재서 정확하게 맞춰요."} />;
      right = previewPage;
    }
    if (phone) phoneBody = <>{left}<div className="mw-split" aria-hidden="true" />{right}</>;
  }

  const phoneNext: Record<Step, string> = { 1: "다음 · 품목 ↑", 2: "다음 · 실과 바늘 ↑", 3: "다음 · 준비물 확인 ↑", 4: "완성 · 최종 도안 보기" };
  const phoneStep: PhoneStep | undefined = phone ? {
    step, title: titles[step], ask: step === 2 ? "item" : step === 3 ? "yarn" : null, body: phoneBody,
    back: step > 1 ? { label: "이전", onClick: () => go((step - 1) as Step) } : editId ? { label: "돌아가기", onClick: book.close } : { label: "메뉴", onClick: book.toHome },
    nextText: phoneNext[step], blocked: blockNext || (step === 3 && !stepOk), final: step === 4, next,
  } : undefined;

  return {
    ready, formRef, onSubmit, onKeyDown, phone: phoneStep,
    // the gold ribbon closes the book, as on the menu page (the draft is saved on every change)
    // the very same ribbon as the menu page's (PageSpread.tsx): all gold leaf, hanging from the page's top
    // edge, "책 덮기" beside it on hover
    ribbon: (
      <button type="button" className="nb-ribbon" aria-label="책 덮기" onClick={book.close}>
        <span className="nb-ribbon-tab"><GoldX /></span>
        <span className="nb-ribbon-tip" aria-hidden="true">책 덮기</span>
      </button>
    ),
    left: (
      <section className="nb-page nb-left" aria-labelledby="nbTitle">
        {step !== 1 && progress}
        <div key={"l" + step + "-" + rev} className={"nb-turn " + (dir > 0 ? "nb-dir-fwd" : "nb-dir-back")} onAnimationEnd={e => e.currentTarget.classList.remove("nb-dir-fwd", "nb-dir-back")}>
          <h1 id="nbTitle" ref={titleRef} tabIndex={-1} className={step === 1 ? "sr" : undefined}>{titles[step]}</h1>
          {step === 2 && <AskAiLine which="item" />}{step === 3 && <AskAiLine which="yarn" />}
          {left}
        </div>
        <div className="nb-foot">
          {step > 1 ? <ClothLabel side="back" type="button" onClick={() => go((step - 1) as Step)}>← 이전</ClothLabel> : editId ? <ClothLabel side="back" type="button" onClick={book.close}>← 돌아가기</ClothLabel>
            : <ClothLabel side="back" type="button" onClick={book.toHome}>← 메뉴</ClothLabel>}
          <span className="nb-folio">{step * 2 - 1}</span>
        </div>
      </section>
    ),
    right: (
      <section className="nb-page nb-right" aria-label={step === 4 ? "미리 보기" : step === 3 ? "모양과 크기" : "지금까지"}>
        <div key={"r" + step + "-" + rev} className={"nb-turn " + (dir > 0 ? "nb-dir-fwd" : "nb-dir-back")} onAnimationEnd={e => e.currentTarget.classList.remove("nb-dir-fwd", "nb-dir-back")}>{right}</div>
        <div className="nb-foot">
          <span className="nb-folio">{step * 2}</span>
          {step === 4
            // the last step: a wide dark ribbon with a gold edge, unlike the small labels of the steps before
            // the last step: the mocha lace tag (Girl's Diary), unlike the small cloth labels of the steps before
            ? <LaceButton variant="mocha" width={360} type="submit" className="nb-final-lace" aria-disabled={blockNext || undefined}>
                <small>마지막 단계</small>완성 · 최종 도안 보기 →
              </LaceButton>
            : <ClothLabel side="next" type="submit" blocked={blockNext || (step === 3 && !stepOk)}>{nextLabel[step]}</ClothLabel>}
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
