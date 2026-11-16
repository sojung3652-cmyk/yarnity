"use client";
// "도안 만들기" as an open book in three steps (left page = question and inputs, right page = what you've
// picked so far / the live preview). The stitch engine (lib/pattern: plan, gauge, clamp) and the saved data
// (Draft -> Project in iyarn.projects) are unchanged; the draft keeps being saved to iyarn.draft and the
// current step to iyarn.newstep, so a refresh resumes where you were.
// Editing a saved work: /new?edit=<id> opens step 3 prefilled; "도안 보기" overwrites that work (its
// knitting progress restarts if the pattern changed - the old row position would no longer match).
// The AI chat (components/Chat.tsx, /api/chat) is not shown here for now; the code is kept.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { drawing } from "@/lib/drawing";
import { clamp, fmt, gauge, HOOKS, plan, SHAPE_KO, YARN_KO, type Handle, type ObjectKind, type Shape, type Weight } from "@/lib/pattern";
import { store } from "@/lib/store";
import type { Draft } from "@/lib/types";
import "./newbook.css";

type Step = 1 | 2 | 3;
const STEP_KEY = "iyarn.newstep";
const OBJECT_KO: Record<string, string> = { coaster: "미니 코스터", bag: "미니 손가방" };
const OBJECT_NOTE: Record<string, string> = { coaster: "한두 시간이면 완성하는 작은 받침이에요.", bag: "주말 하루면 완성하는 작은 손가방이에요." };
const HANDLE_KO: Record<Handle, string> = { short: "짧은 끈 25cm", long: "긴 끈 90cm", none: "없음" };
// size limits: the same as the existing form (readForm in components/PrepForm.tsx)
const LIMIT = { a: [4, 40], b: [4, 30], h: [2, 40] } as const;
type NumKey = keyof typeof LIMIT;

// ---- line drawings for the two works ----
function CoasterArt({ big }: { big?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className={big ? "nb-art nb-art-big" : "nb-art"} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={big ? 1 : 1.3} strokeLinecap="round">
      <circle cx="60" cy="60" r="46" /><circle cx="60" cy="60" r="35" strokeDasharray="2 4" /><circle cx="60" cy="60" r="24" strokeDasharray="2 4" /><circle cx="60" cy="60" r="12" strokeDasharray="2 4" />
      <path d="M60 14v6M60 100v6M14 60h6M100 60h6" />
    </svg>
  );
}
function BagArt({ big }: { big?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className={big ? "nb-art nb-art-big" : "nb-art"} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={big ? 1 : 1.3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M42 46c0-14 8-24 18-24s18 10 18 24" /><path d="M26 46h68l-6 54a6 6 0 0 1-6 5H38a6 6 0 0 1-6-5z" />
      <path d="M31 62h58M32 76h56M34 90h52" strokeDasharray="2 4" />
    </svg>
  );
}

// ---- radio group of chips / cards: roving tab stop, arrow keys move and select ----
function Radios<T extends string>({ label, value, options, onPick, kind = "chip" }: { label: string; value: T; options: [T, ReactNode][]; onPick: (v: T) => void; kind?: "chip" | "card" }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, options.findIndex(([v]) => v === value));
  const key = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault(); const j = (i + d + options.length) % options.length; onPick(options[j][0]); refs.current[j]?.focus();
  };
  return (
    <div className={kind === "card" ? "nb-cards" : "nb-chips"} role="radiogroup" aria-label={label}>
      {options.map(([v, t], i) => (
        <button key={v} ref={el => { refs.current[i] = el; }} type="button" role="radio" aria-checked={value === v} tabIndex={i === idx ? 0 : -1}
          className={kind === "card" ? "nb-card" : "nb-chip"} onClick={() => onPick(v)} onKeyDown={e => key(e, i)}>{t}</button>
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
  const [nums, setNums] = useState<Record<NumKey, string>>({ a: "15", b: "10", h: "15" });
  const [dir, setDir] = useState<1 | -1>(1);
  const loaded = useRef(false), titleRef = useRef<HTMLHeadingElement>(null), moved = useRef(false);

  // enter: a saved work to edit (?edit=id, step 3) or the saved draft and step
  useEffect(() => {
    if (!ready || loaded.current) return;
    loaded.current = true;
    const id = new URLSearchParams(location.search).get("edit");
    const p = id ? projects.find(x => x.id === id) : null;
    let d = draft;
    if (p) {
      d = { name: p.name, object: p.object, yarn: p.yarn, weight: p.weight, hook: p.hook, shape: p.shape, a: p.a, b: p.b, h: p.h, handle: p.handle };
      setDraft(d); setEditId(p.id); setStep(3);
    } else {
      const s = store.get<number>(STEP_KEY, 1); setStep((s === 2 || s === 3 ? s : 1) as Step);
    }
    setNums({ a: String(d.a), b: String(d.b), h: String(d.h) });
  }, [ready, draft, projects, setDraft]);
  useEffect(() => { if (loaded.current && !editId) store.set(STEP_KEY, step); }, [step, editId]);

  const patch = (p: Partial<Draft>) => setDraft({ ...draft, ...p });

  // size fields: keep the raw text; apply to the draft only when valid
  const errors = useMemo(() => {
    const e: Partial<Record<NumKey, string>> = {};
    const check = (k: NumKey, on: boolean) => {
      if (!on) return;
      const raw = nums[k].trim(), v = Number(raw), [lo, hi] = LIMIT[k];
      if (!raw) e[k] = "숫자를 적어 주세요.";
      else if (!Number.isFinite(v) || v <= 0) e[k] = "0보다 큰 숫자를 적어 주세요.";
      else if (v < lo || v > hi) e[k] = `${lo}~${hi}cm 사이로 적어 주세요.`;
    };
    check("a", true); check("b", draft.shape !== "circle"); check("h", draft.object === "bag");
    return e;
  }, [nums, draft.shape, draft.object]);
  const setNum = (k: NumKey) => (raw: string) => {
    setNums(n => ({ ...n, [k]: raw }));
    const v = Number(raw.trim()), [lo, hi] = LIMIT[k];
    if (raw.trim() && Number.isFinite(v) && v >= lo && v <= hi) patch({ [k]: v } as Partial<Draft>);
  };

  const pp = useMemo(() => plan(draft), [draft]);
  const g = useMemo(() => gauge(draft), [draft]);
  const handleRow = pp.rows.find(r => r.part === "handle");
  const stepOk = step < 3 || Object.keys(errors).length === 0;

  const go = (s: Step) => { setDir(s > step ? 1 : -1); setStep(s); moved.current = true; };
  // after a step change, keyboard focus goes to the new question (the field that had it is gone)
  useEffect(() => { if (moved.current) { moved.current = false; titleRef.current?.focus(); } }, [step]);
  const save = () => {
    const d: Draft = { ...draft, name: draft.name.trim() || OBJECT_KO[draft.object] };
    if (d.shape !== "circle" && d.b >= d.a) d.b = Math.max(4, d.a - 2); // as the old form did
    setDraft(d);
    if (editId) {
      const old = projects.find(x => x.id === editId);
      const same = old && (["object", "weight", "hook", "shape", "a", "b", "h", "handle"] as const).every(k => old[k] === d[k]);
      updateProject(editId, { ...d, ...(same ? {} : { current: 0, measuredH: null }) });
      setActive(editId);
    } else {
      addProject({ id: "p" + Date.now().toString(36), ...JSON.parse(JSON.stringify(d)), measuredH: null, current: 0, created: Date.now() });
      store.set(STEP_KEY, 1);
    }
    router.push("/pattern");
  };
  const next = () => { if (!stepOk) return; if (step < 3) go((step + 1) as Step); else save(); };

  if (!ready) return <main id="view-new" className="nb-main" />;

  const size = draft.shape === "circle" ? `지름 ${draft.a}cm` : `${draft.a} × ${draft.b}cm`;
  const titles: Record<Step, string> = { 1: "무엇을 뜰까요?", 2: "어떤 실과 바늘을 쓰나요?", 3: "어떤 모양, 어떤 크기로 뜰까요?" };
  const nextLabel: Record<Step, string> = { 1: "다음 · 실과 바늘 →", 2: "다음 · 모양과 크기 →", 3: "도안 보기 →" };

  const progress = (
    <ol className="nb-progress" aria-label="진행 단계">
      {(["무엇을", "실과 바늘", "모양과 크기"] as const).map((t, i) => {
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
    left = (
      <>
        <Radios kind="card" label="만들 작품" value={draft.object} onPick={v => patch({ object: v })}
          options={[["coaster", <><CoasterArt /><span>미니 코스터</span></>], ["bag", <><BagArt /><span>미니 손가방</span></>]]} />
        <Field label="작품 이름">{id => <input id={id} className="nb-input" autoComplete="off" placeholder={OBJECT_KO[draft.object]} value={draft.name} onChange={e => patch({ name: e.target.value })} />}</Field>
      </>
    );
    right = (
      <div className="nb-show">
        {draft.object === "bag" ? <BagArt big /> : <CoasterArt big />}
        <h3>{draft.name.trim() || OBJECT_KO[draft.object]}</h3>
        <p>{OBJECT_NOTE[draft.object]}</p>
      </div>
    );
  } else if (step === 2) {
    left = (
      <>
        <Field label="실 이름 (선택)">{id => <input id={id} className="nb-input" autoComplete="off" placeholder="예: 면 혼방 합사" value={draft.yarn} onChange={e => patch({ yarn: e.target.value })} />}</Field>
        <div className="nb-field"><span className="nb-lbl">실 굵기</span>
          <Radios label="실 굵기" value={draft.weight} onPick={v => patch({ weight: v as Weight })} options={(["thin", "medium", "thick"] as Weight[]).map(w => [w, YARN_KO[w]])} />
        </div>
        <div className="nb-field"><span className="nb-lbl">코바늘 호수</span>
          <Radios label="코바늘 호수" value={draft.hook} onPick={v => patch({ hook: v })} options={HOOKS.map(([k, mm]) => [k, `${k} · ${mm}mm`])} />
        </div>
        <p className="nb-help">잘 모르겠으면 보통으로 두세요.</p>
      </>
    );
    right = (
      <div className="nb-summary">
        <h3>지금까지 고른 것</h3>
        <dl>
          <div><dt>작품</dt><dd>{OBJECT_KO[draft.object]}{draft.name.trim() ? ` · ${draft.name.trim()}` : ""}</dd></div>
          <div><dt>실</dt><dd>{(draft.yarn.trim() || "실 이름 없음") + " · " + YARN_KO[draft.weight]}</dd></div>
          <div><dt>코바늘</dt><dd>{draft.hook}</dd></div>
        </dl>
        <p className="nb-big">한 코 크기 약 <b>{fmt(g.h * 10)}mm</b> <span>(예상)</span></p>
      </div>
    );
  } else {
    const isCircle = draft.shape === "circle";
    left = (
      <>
        <div className="nb-field"><span className="nb-lbl">바닥 모양</span>
          <Radios label="바닥 모양" value={draft.shape} onPick={v => {
            const d: Partial<Draft> = { shape: v as Shape };
            if (v !== "circle" && draft.b >= draft.a) { d.b = Math.max(4, draft.a - 5); setNums(n => ({ ...n, b: String(d.b) })); }
            patch(d);
          }} options={(["circle", "oval", "rect"] as Shape[]).map(s => [s, SHAPE_KO[s]])} />
        </div>
        <div className="nb-two">
          <Field label={isCircle ? "지름 (cm)" : "가로 (cm)"} error={errors.a}>{(id, eb) => <input id={id} className="nb-input" inputMode="decimal" autoComplete="off" aria-invalid={!!errors.a} aria-describedby={eb} value={nums.a} onChange={e => setNum("a")(e.target.value)} />}</Field>
          {!isCircle && <Field label="세로 (cm)" error={errors.b}>{(id, eb) => <input id={id} className="nb-input" inputMode="decimal" autoComplete="off" aria-invalid={!!errors.b} aria-describedby={eb} value={nums.b} onChange={e => setNum("b")(e.target.value)} />}</Field>}
        </div>
        {draft.object === "bag" && (
          <>
            <Field label="몸통 높이 (cm)" error={errors.h}>{(id, eb) => <input id={id} className="nb-input nb-short" inputMode="decimal" autoComplete="off" aria-invalid={!!errors.h} aria-describedby={eb} value={nums.h} onChange={e => setNum("h")(e.target.value)} />}</Field>
            <div className="nb-field"><span className="nb-lbl">손잡이</span>
              <Radios label="손잡이" value={draft.handle} onPick={v => patch({ handle: v as Handle })} options={(["short", "long", "none"] as Handle[]).map(h => [h, HANDLE_KO[h]])} />
            </div>
          </>
        )}
      </>
    );
    right = (
      <div className="nb-preview">
        <h3>미리 보기</h3>
        {/* drawing() only interpolates numbers and fixed labels */}
        <div className="drawing nb-drawing" dangerouslySetInnerHTML={{ __html: drawing(draft, pp) }} />
        <p className="nb-counts" aria-live="polite">
          <span>{`${SHAPE_KO[draft.shape]} ${size}`}</span>
          <b>{`바닥 ${pp.bottomRounds}단 · 마지막 단 ${pp.last}코`}</b>
          {draft.object === "bag" && <b>{`몸통 ${pp.bodyRows}단` + (handleRow ? ` · 손잡이 사슬 ${handleRow.n}코` : "")}</b>}
        </p>
        <p className="nb-help">코 수는 공식으로 계산해요. 3단을 뜬 뒤 지름을 재면 내 손에 맞게 다시 계산해 드려요.</p>
      </div>
    );
  }

  return (
    <main id="view-new" className="nb-main">
      <form className="nb-book" noValidate onSubmit={e => { e.preventDefault(); next(); }}
        onKeyDown={e => {
          // Enter = next step from anywhere in the book (inputs submit by themselves; chips and the title too);
          // other buttons and links keep their own Enter
          const t = e.target as HTMLElement;
          if (e.key === "Enter" && !e.nativeEvent.isComposing && (t.getAttribute("role") === "radio" || t === titleRef.current)) { e.preventDefault(); next(); }
        }}>
        <span className="nb-ribbon" aria-hidden="true" />
        <span className="nb-marker" aria-hidden="true" />
        <section className="nb-page nb-left" aria-labelledby="nbTitle">
          {progress}
          <div key={"l" + step} className={"nb-turn " + (dir > 0 ? "fwd" : "back")}>
            <h1 id="nbTitle" ref={titleRef} tabIndex={-1}>{titles[step]}</h1>
            {left}
          </div>
          <div className="nb-foot">
            {step > 1 ? <button type="button" className="nb-prev" onClick={() => go((step - 1) as Step)}>← 이전</button> : editId ? <Link className="nb-prev" href="/mine">← 내 작품</Link> : <span />}
            <span className="nb-folio">{step * 2 - 1}</span>
          </div>
        </section>
        <section className="nb-page nb-right" aria-label={step === 3 ? "미리 보기" : "지금까지"}>
          <div key={"r" + step} className={"nb-turn " + (dir > 0 ? "fwd" : "back")}>{right}</div>
          <div className="nb-foot">
            <span className="nb-folio">{step * 2}</span>
            <button type="submit" className="nb-next" disabled={!stepOk}>{nextLabel[step]}</button>
          </div>
        </section>
      </form>
    </main>
  );
}
