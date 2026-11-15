"use client";
// 준비물과 모양 form. Inputs keep the raw text the user typed (as the DOM did in the prototype);
// the draft is derived from them with the same trimming / clamping as readForm().
import { clamp, fmt, HOOKS, plan, SHAPE_KO, type Weight } from "@/lib/pattern";
import type { Draft } from "@/lib/types";

export interface Fields { name: string; yarn: string; weight: string; hook: string; a: string; b: string; h: string; handle: string }

export const fieldsFromDraft = (d: Draft): Fields => ({ name: d.name, yarn: d.yarn, weight: d.weight, hook: d.hook, a: String(d.a), b: String(d.b), h: String(d.h), handle: d.handle });

export function readForm(f: Fields, d: Draft): Draft {
  return {
    ...d,
    name: f.name.trim() || "이름 없는 작품", yarn: f.yarn.trim(),
    weight: f.weight as Weight, hook: f.hook,
    a: clamp(+f.a || 15, 4, 40), b: clamp(+f.b || 10, 4, 30),
    h: clamp(+f.h || 15, 2, 40), handle: f.handle as Draft["handle"],
  };
}

function Seg<T extends string>({ id, label, value, options, onPick }: { id: string; label: string; value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="seg" id={id} role="group" aria-label={label}>
      {options.map(([v, t]) => <button key={v} type="button" data-v={v} aria-pressed={value === v} onClick={() => onPick(v)}>{t}</button>)}
    </div>
  );
}

export function PrepForm({ fields, draft, onChange }: { fields: Fields; draft: Draft; onChange: (f: Fields, d: Draft) => void }) {
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...fields, [k]: e.target.value }, draft);
  const pp = plan(draft), size = draft.shape === "circle" ? `지름 ${draft.a}cm` : `${draft.a} × ${draft.b}cm`;
  const summary = `${SHAPE_KO[draft.shape]} 바닥 ${size} · ${pp.bottomRounds}단 · 마지막 단 ${pp.last}코` + (draft.object === "bag" ? ` · 몸통 ${pp.bodyRows}단` : "") + ` · 코 크기 예상 ${fmt(pp.g.h * 10)}mm`;

  return (
    <form className="card" id="prepForm" noValidate onSubmit={e => e.preventDefault()}>
      <div className="field"><label htmlFor="pName">작품 이름</label><input id="pName" className="txt" autoComplete="off" value={fields.name} onChange={set("name")} /></div>
      <div className="field"><span className="lbl">만들 작품</span>
        <Seg id="pObject" label="만들 작품" value={draft.object} options={[["coaster", "미니 코스터"], ["bag", "미니 손가방"]]} onPick={v => onChange(fields, { ...draft, object: v })} />
      </div>
      <div className="two">
        <div className="field"><label htmlFor="pYarn">실 이름</label><input id="pYarn" className="txt" autoComplete="off" value={fields.yarn} onChange={set("yarn")} /></div>
        <div className="field"><label htmlFor="pWeight">실 굵기</label>
          <select id="pWeight" className="txt" value={fields.weight} onChange={set("weight")}><option value="thin">가는 실</option><option value="medium">보통</option><option value="thick">굵은 실</option></select></div>
      </div>
      <div className="field"><label htmlFor="pHook">코바늘 호수</label>
        <select id="pHook" className="txt" value={fields.hook} onChange={set("hook")}>{HOOKS.map(([k, mm]) => <option key={k} value={k}>{`${k} · ${mm}mm`}</option>)}</select></div>
      <div className="field"><span className="lbl">바닥 모양</span>
        <Seg id="pShape" label="바닥 모양" value={draft.shape} options={[["circle", "원형"], ["oval", "타원"], ["rect", "사각"]]} onPick={v => {
          const d = { ...draft, shape: v }; let f = fields;
          if (v !== "circle" && d.b >= d.a) { d.b = Math.max(4, d.a - 5); f = { ...fields, b: String(d.b) }; }
          onChange(f, d);
        }} />
      </div>
      <div className="two">
        <div className="field"><label htmlFor="pA" id="pALbl">{draft.shape === "circle" ? "지름 (cm)" : "길이 (cm)"}</label><input id="pA" className="txt" type="number" inputMode="decimal" min={4} max={40} step={0.5} value={fields.a} onChange={set("a")} /></div>
        <div className="field" id="pBField" hidden={draft.shape === "circle"}><label htmlFor="pB">폭 (cm)</label><input id="pB" className="txt" type="number" inputMode="decimal" min={4} max={30} step={0.5} value={fields.b} onChange={set("b")} /></div>
      </div>
      <div className="two" id="bagFields" hidden={draft.object !== "bag"}>
        <div className="field"><label htmlFor="pH">몸통 높이 (cm)</label><input id="pH" className="txt" type="number" inputMode="decimal" min={2} max={40} step={0.5} value={fields.h} onChange={set("h")} /></div>
        <div className="field"><label htmlFor="pHandle">손잡이</label>
          <select id="pHandle" className="txt" value={fields.handle} onChange={set("handle")}><option value="short">짧은 끈 · 25cm</option><option value="long">긴 끈 · 90cm</option><option value="none">없음</option></select></div>
      </div>
      <p className="summary" id="prepSummary">{summary}</p>
    </form>
  );
}
