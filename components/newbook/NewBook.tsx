"use client";
// "도안 만들기" as an open book in four steps (left page = question and inputs, right page = what you've
// picked so far / the live preview): ① name ② item ③ yarn, hook and colour ④ shape and size.
// Items come from lib/items.ts and map onto the stitch engine (lib/pattern: plan, gauge) unchanged.
// The draft is saved to iyarn.draft and the step to iyarn.newstep, so a refresh resumes where you were.
// Editing a saved work: /new?edit=<id> opens step 4 prefilled; "도안 보기" overwrites that work (its
// knitting progress restarts if the pattern changed - the old row position would no longer match).
// The AI chat (components/Chat.tsx, /api/chat) is not shown here for now; the code is kept.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { drawing } from "@/lib/drawing";
import { engineDims, ENGINE, fieldsFor, GROUPS, ITEM, ITEMS, itemIdOf, type FieldKey, type Item, type ItemId } from "@/lib/items";
import { gauge, plan, SHAPE_KO, type Handle, type PlanInput, type Shape } from "@/lib/pattern";
import { store } from "@/lib/store";
import type { Draft } from "@/lib/types";
import { ItemArt } from "./ItemArt";
import { TitlePage } from "./TitlePage";
import { ClothLabel } from "./ClothLabel";
import { RibbonGold } from "@/components/RibbonGold";
import { HookPage, YarnPage, yarnStepOk } from "./YarnStep";
import { Fold, useOneOpen } from "./Fold";
import { canTurn, snapshot, startTurn, type Snapshot, type Turn } from "./pageTurn";
import "./newbook.css";

type Step = 1 | 2 | 3 | 4;
const STEP_KEY = "iyarn.newstep";
const NO_NAME = "이름 없는 작품";
const HANDLE_KO: Record<Handle, string> = { short: "짧은 끈 25cm", long: "긴 끈 90cm", none: "없음" };

/** The draft as the engine reads it (item -> engine path, beanie conversion, handle only where offered). */
export function engineInput(d: Draft): PlanInput {
  const it = ITEM[itemIdOf(d)], e = engineDims(it, d);
  return { ...d, ...e, object: ENGINE[it.kind], handle: it.handles ? d.handle : (it.defaults.handle ?? "none") };
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

export function NewBook() {
  const { ready, draft, setDraft, addProject, updateProject, projects, setActive } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [nums, setNums] = useState<Record<FieldKey, string>>(numsOf(draft));
  const [dir, setDir] = useState<1 | -1>(1);
  const [tried, setTried] = useState(false); // step 3: required messages only after trying to move on
  const [groupOpen, toggleGroup] = useOneOpen("납작한 것");
  const [fold4, toggle4] = useOneOpen();
  const loaded = useRef(false), titleRef = useRef<HTMLHeadingElement>(null), moved = useRef(false);
  const formRef = useRef<HTMLFormElement>(null), turn = useRef<Turn | null>(null), pending = useRef<Snapshot | null>(null);

  // enter: a saved work to edit (?edit=id, step 4) or the saved draft and step
  useEffect(() => {
    if (!ready || loaded.current) return;
    loaded.current = true;
    const id = new URLSearchParams(location.search).get("edit");
    const p = id ? projects.find(x => x.id === id) : null;
    let d = draft;
    if (p) {
      const it = ITEM[itemIdOf(p)];
      const { id: _id, measuredH: _mh, measuredW: _mw, current: _cur, created: _cr, ...saved } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
      d = { ...saved, name: p.name === NO_NAME ? "" : p.name, item: it.id, circ: p.circ ?? it.defaults.circ, depth: p.depth ?? it.defaults.depth,
        yarnMode: p.yarnMode ?? (p.yarnMm ? "mm" : "level") }; // older works: their thin/medium/thick stays
      setDraft(d); setEditId(p.id); setStep(4);
    } else {
      const s = store.get<number>(STEP_KEY, 1); setStep((s >= 1 && s <= 4 ? s : 1) as Step);
    }
    setNums(numsOf(d));
  }, [ready, draft, projects, setDraft]);
  useEffect(() => { if (loaded.current && !editId) store.set(STEP_KEY, step); }, [step, editId]);

  const item: Item = ITEM[itemIdOf(draft)];
  const patch = (p: Partial<Draft>) => setDraft({ ...draft, ...p });

  // a new item starts from its own defaults (no values carried over from the previous item)
  const pickItem = (id: ItemId) => {
    if (id === item.id) return;
    const it = ITEM[id], dv = it.defaults;
    const d: Draft = { ...draft, item: id, object: ENGINE[it.kind], shape: dv.shape ?? "rect", a: dv.a, b: dv.b ?? dv.a, h: dv.h ?? 0, handle: dv.handle ?? "none", circ: dv.circ, depth: dv.depth };
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
  const stepOk = step === 3 ? yarnStepOk(draft) : step < 4 || Object.keys(errors).length === 0;
  const blockNext = step === 4 && !stepOk; // step 3 is never disabled: pressing it shows what is missing

  // Changing step: a turn still running is finished first (never two at once); on the desktop book the
  // current pages are snapshotted for the page turn, which starts once the new step is rendered.
  // Jumping several steps from the progress indicator is one turn.
  const go = (s: Step) => {
    if (s === step) return;
    turn.current?.finish();
    const d = s > step ? 1 : -1;
    pending.current = formRef.current && canTurn() ? snapshot(formRef.current, d) : null;
    setDir(d); setStep(s); setTried(false); moved.current = true;
  };
  useLayoutEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const book = formRef.current; if (!book) return;
    // focus: the new step's first field (the one that had focus is gone)
    const focusFirst = () => (book.querySelector<HTMLElement>('.nb-page .nb-turn input:not([type="color"]), .nb-page .nb-turn textarea, .nb-page .nb-turn [role="radio"][tabindex="0"], .nb-page .nb-turn button') ?? titleRef.current)?.focus({ preventScroll: true });
    const snap = pending.current; pending.current = null;
    if (!snap) { requestAnimationFrame(focusFirst); return; }
    turn.current = startTurn(book, snap, () => { turn.current = null; focusFirst(); });
  }, [step]);
  useEffect(() => () => turn.current?.finish(), []);

  const save = () => {
    const e = engineInput(draft);
    const d: Draft = { ...draft, shape: e.shape, a: e.a, b: e.b as number, h: e.h as number, object: e.object, handle: e.handle as Handle, name: draft.name.trim() || NO_NAME, item: item.id };
    if (d.object === "bag" && d.shape !== "circle" && d.b >= d.a) d.b = Math.max(4, d.a - 2); // as the old form did
    setDraft({ ...d, name: draft.name });
    if (editId) {
      const old = projects.find(x => x.id === editId);
      const same = old && (["item", "object", "weight", "hook", "shape", "a", "b", "h", "handle"] as const).every(k => old[k] === d[k]);
      updateProject(editId, { ...d, ...(same ? {} : { current: 0, measuredH: null, measuredW: null }) });
      setActive(editId);
    } else {
      addProject({ id: "p" + Date.now().toString(36), ...JSON.parse(JSON.stringify(d)), measuredH: null, current: 0, created: Date.now(), updatedAt: Date.now(), status: "knitting" });
      store.set(STEP_KEY, 1);
    }
    router.push("/pattern");
  };
  const next = () => {
    if (!stepOk) { setTried(true); requestAnimationFrame(() => (document.querySelector('.nb-book [aria-invalid="true"]') as HTMLElement | null)?.focus()); return; }
    if (step < 4) go((step + 1) as Step); else save();
  };

  if (!ready) return <main id="view-new" className="nb-main" />;

  const titles: Record<Step, string> = { 1: "이 작품의 이름은 무엇인가요?", 2: "무엇을 뜰까요?", 3: "어떤 실과 바늘을 쓰나요?", 4: "어떤 모양, 어떤 크기로 뜰까요?" };
  const nextLabel: Record<Step, string> = { 1: "다음 · 품목 →", 2: "다음 · 실과 바늘 →", 3: "다음 · 모양과 크기 →", 4: "도안 보기 →" };

  const progress = (
    <ol className="nb-progress" aria-label="진행 단계">
      {(["이름", "품목", "실과 바늘", "모양과 크기"] as const).map((t, i) => {
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

  let left: ReactNode, right: ReactNode;
  if (step === 1) {
    // ① the left page stays blank paper; the right page is the title page (progress moves there)
    const when = editId ? projects.find(x => x.id === editId)?.created ?? Date.now() : Date.now();
    left = null;
    right = <TitlePage name={draft.name} onName={v => patch({ name: v })} onEnter={next} progress={progress}
      month={new Date(when).toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()} />;
  } else if (step === 2) {
    left = (
      <div className="nb-folds nb-groups">
        {GROUPS.map(gname => (
          <Fold key={gname} label={gname} value={item.group === gname ? item.name : ""} open={groupOpen === gname} onToggle={() => toggleGroup(gname)}>
            <Radios kind="item" label={gname} value={item.group === gname ? item.id : ("" as ItemId)} onPick={pickItem}
              options={ITEMS.filter(i => i.group === gname).map(i => [i.id, <><ItemArt id={i.id} /><span>{i.name}{i.beta && <em className="nb-beta">베타</em>}</span></>])} />
          </Fold>
        ))}
      </div>
    );
    right = (
      <div className="nb-show">
        <ItemArt id={item.id} big fill={draft.color} />
        <h3>{item.name}{item.beta && <em className="nb-beta">베타</em>}</h3>
        <p>{item.desc}</p>
        <dl className="nb-facts">
          <div><dt>난이도</dt><dd>{item.level}</dd></div>
          <div><dt>예상 시간</dt><dd>{item.time}</dd></div>
          <div><dt>뜨는 방식</dt><dd>{item.method}</dd></div>
        </dl>
        {item.note && <p className="nb-help">{item.note}</p>}
      </div>
    );
  } else if (step === 3) {
    left = <YarnPage draft={draft} patch={patch} tried={tried} />;
    right = <HookPage draft={draft} patch={patch} item={item} stitchMm={g.h * 10} tried={tried}
      measureNote={input.object === "rows" || input.object === "tube" ? "5단을 뜬 뒤 재서 정확하게 맞춰요." : "3단을 뜬 뒤 재서 정확하게 맞춰요."} />;
  } else {
    const shapes = item.shapes ?? [];
    const sizeText = input.object === "rows" ? `${input.a} × ${input.b}cm` : input.object === "tube" ? `둘레 ${input.a}cm` : input.shape === "circle" ? `지름 ${input.a}cm` : `${input.a} × ${input.b}cm`;
    const handleRow = pp.rows.find(r => r.part === "handle"), start = pp.rows.find(r => r.part === "start");
    left = (
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
        {item.handles && (
          <div className="nb-folds">
            <Fold label="손잡이" value={HANDLE_KO[draft.handle]} open={fold4 === "handle"} onToggle={() => toggle4("handle")}>
              <Radios label="손잡이" value={draft.handle} onPick={v => patch({ handle: v as Handle })} options={(["short", "long", "none"] as Handle[]).map(h => [h, HANDLE_KO[h]])} />
            </Fold>
          </div>
        )}
        {item.note && <p className="nb-help">{item.note}</p>}
      </>
    );
    right = (
      <div className="nb-preview">
        <h3>미리 보기</h3>
        {/* drawing() only interpolates numbers and fixed labels */}
        <div className="drawing nb-drawing" dangerouslySetInnerHTML={{ __html: drawing(input, pp, draft.color) }} />
        <p className="nb-counts" aria-live="polite">
          <span>{`${item.name} · ${sizeText}`}</span>
          {input.object === "rows" && start && <b>{`시작 사슬 ${start.n}코 · 한 단 ${pp.last}코 · ${pp.bodyRows}단`}</b>}
          {input.object === "tube" && start && <b>{`시작 사슬 ${start.n}코 (고리) · ${pp.bodyRows}단`}</b>}
          {(input.object === "coaster" || input.object === "bag") && <b>{`바닥 ${pp.bottomRounds}단 · 마지막 단 ${pp.last}코`}</b>}
          {input.object === "bag" && <b>{`몸통 ${pp.bodyRows}단` + (handleRow ? ` · 손잡이 사슬 ${handleRow.n}코` : "")}</b>}
        </p>
        <p className="nb-help">{input.object === "rows" || input.object === "tube"
          ? "코 수는 공식으로 계산해요. 5단을 뜬 뒤 폭과 높이를 재면 남은 단 수를 내 손에 맞게 고쳐 드려요."
          : "코 수는 공식으로 계산해요. 3단을 뜬 뒤 지름을 재면 내 손에 맞게 다시 계산해 드려요."}</p>
      </div>
    );
  }

  return (
    <main id="view-new" className="nb-main">
      <form ref={formRef} className="nb-book" noValidate onSubmit={e => { e.preventDefault(); next(); }}
        onKeyDown={e => {
          // Enter = next step from anywhere in the book (inputs submit by themselves; chips, cards and the
          // title too); other buttons and links keep their own Enter
          const t = e.target as HTMLElement;
          if (e.key === "Enter" && !e.nativeEvent.isComposing && (t.getAttribute("role") === "radio" || t === titleRef.current)) { e.preventDefault(); next(); }
        }}>
        <span className="nb-ribbon" aria-hidden="true"><RibbonGold w={30} h={62} ball={18} ballY={27} lineInset={4} lineEnd={47} /></span>
        <span className="nb-marker" aria-hidden="true" />
        <section className="nb-page nb-left" aria-labelledby="nbTitle">
          {step !== 1 && progress}
          <div key={"l" + step} className={"nb-turn " + (dir > 0 ? "nb-dir-fwd" : "nb-dir-back")} onAnimationEnd={e => e.currentTarget.classList.remove("nb-dir-fwd", "nb-dir-back")}>
            <h1 id="nbTitle" ref={titleRef} tabIndex={-1} className={step === 1 ? "sr" : undefined}>{titles[step]}</h1>
            {left}
          </div>
          <div className="nb-foot">
            {step > 1 ? <ClothLabel side="back" type="button" onClick={() => go((step - 1) as Step)}>← 이전</ClothLabel> : editId ? <ClothLabel side="back" href="/mine">← 내 작품</ClothLabel> : <span />}
            <span className="nb-folio">{step * 2 - 1}</span>
          </div>
        </section>
        <section className="nb-page nb-right" aria-label={step === 4 ? "미리 보기" : step === 3 ? "코바늘과 요약" : "지금까지"}>
          <div key={"r" + step} className={"nb-turn " + (dir > 0 ? "nb-dir-fwd" : "nb-dir-back")} onAnimationEnd={e => e.currentTarget.classList.remove("nb-dir-fwd", "nb-dir-back")}>{right}</div>
          <div className="nb-foot">
            <span className="nb-folio">{step * 2}</span>
            <ClothLabel side="next" type="submit" blocked={blockNext || (step === 3 && !stepOk)}>{nextLabel[step]}</ClothLabel>
          </div>
        </section>
      </form>
    </main>
  );
}
