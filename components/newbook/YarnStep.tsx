"use client";
// 실과 바늘 (step 3 of 도안 만들기), one spread:
//   left page  - the two required fields (yarn thickness, hook size), then "가지고 있는 실 정보" folded:
//                name / brand, material, and what the yarn's label says (skein weight / length, count,
//                shop, memo)
//   right page - the colours (one row per yarn: colour, colour number, LOT), "+ 색 추가" for more yarns,
//                and a short summary
// Only the required fields are open; everything else is a folded row showing its current value, one row
// open at a time. Every choice keeps its own "직접 입력". Errors appear only when trying to move on with a
// required field empty.
import { useState, type ReactNode } from "react";
import type { Item } from "@/lib/items";
import { fmt, YARN_KO, type Weight } from "@/lib/pattern";
import type { Draft, YarnColor } from "@/lib/types";
import { clean, HOOK_CHIPS, HOOK_MM_RANGE, hookLabel, hookMmOf, hookYarnMismatch, MATERIALS, MAX_TEXT, parseNum, weightFromMm, YARN_MM_RANGE } from "@/lib/yarn";
import { Fold, useOneOpen } from "./Fold";
import { HookSelect } from "./HookSelect";

export const COLORS: [string, string][] = [
  ["크림", "#F3E9D2"], ["라벤더", "#C9B8E0"], ["연핑크", "#F2C4CC"], ["하늘", "#BCD8EC"], ["세이지 그린", "#B5C4A8"],
  ["버터 노랑", "#F3DE98"], ["살구", "#F5C3A0"], ["모카 브라운", "#9C7A62"], ["차콜", "#4E4A4C"], ["흰색", "#FFFFFF"],
];
const COMMON_MATERIALS = ["코튼", "울", "아크릴", "메리노", "리넨", "혼방"];
const MAX_COLORS = 6;

/** Required on this step: yarn thickness (mm in range, or a level picked) and a hook size. */
export function yarnStepOk(d: Draft) {
  const yarnOk = d.yarnMode === "level" || (d.yarnMm != null && d.yarnMm >= YARN_MM_RANGE[0] && d.yarnMm <= YARN_MM_RANGE[1]);
  const mm = d.hook ? hookMmOf(d) : NaN;
  return yarnOk && mm >= HOOK_MM_RANGE[0] && mm <= HOOK_MM_RANGE[1];
}

type Patch = (p: Partial<Draft>) => void;

/** Chips as a radio group: roving tab stop, arrows move and select. */
function Radios({ label, value, options, onPick }: { label: string; value: string; options: [string, ReactNode][]; onPick: (v: string) => void }) {
  const idx = Math.max(0, options.findIndex(([v]) => v === value));
  return (
    <div className="nb-chips" role="radiogroup" aria-label={label}>
      {options.map(([v, t], i) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} tabIndex={i === idx ? 0 : -1} className="nb-chip" onClick={() => onPick(v)}
          onKeyDown={e => {
            const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
            if (!d) return; e.preventDefault(); const j = (i + d + options.length) % options.length; onPick(options[j][0]);
            (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
          }}>{t}</button>
      ))}
    </div>
  );
}

/** "+ 직접 입력": opens a small text box; Enter adds. */
function AddChip({ label, onAdd }: { label: string; onAdd: (v: string) => void }) {
  const [open, setOpen] = useState(false), [v, setV] = useState("");
  const add = () => { const c = clean(v); if (c) onAdd(c); setV(""); };
  if (!open) return <button type="button" className="nb-chip nb-chip-add" onClick={() => setOpen(true)}>+ 직접 입력</button>;
  return (
    <span className="nb-addbox">
      <input className="nb-input nb-input-sm" autoFocus aria-label={label} maxLength={MAX_TEXT} value={v} onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); add(); } if (e.key === "Escape") { e.preventDefault(); setOpen(false); } }} /* preventDefault: Esc closes this box, not the book */ />
      <button type="button" className="nb-chip" onClick={add}>추가</button>
    </span>
  );
}

const Text = ({ id, value, onChange, placeholder, label }: { id: string; value?: string; onChange: (v: string) => void; placeholder?: string; label: string }) => (
  <>
    <label htmlFor={id} className="sr">{label}</label>
    <input id={id} className="nb-input" autoComplete="off" maxLength={MAX_TEXT} placeholder={placeholder} value={value ?? ""} onChange={e => onChange(e.target.value)} onBlur={e => onChange(clean(e.target.value))} />
  </>
);

// ---------------------------------------------------------------- left page: yarn thickness, hook, the yarn
export function YarnPage({ draft, patch, tried }: { draft: Draft; patch: Patch; tried: boolean }) {
  const [open, toggle] = useOneOpen();
  const mats = draft.materials ?? [];
  const [mmRaw, setMmRaw] = useState(draft.yarnMm != null ? String(draft.yarnMm) : "");
  const [moreMats, setMoreMats] = useState(false);
  const mode = draft.yarnMode ?? (draft.yarnMm ? "mm" : "level");
  const mm = parseNum(mmRaw);
  const mmErr = !mmRaw.trim() ? "실 굵기를 적거나 '잘 모르겠어요'를 눌러 주세요." : !Number.isFinite(mm) ? "숫자로 적어 주세요 (예: 3.2)."
    : mm < YARN_MM_RANGE[0] || mm > YARN_MM_RANGE[1] ? `${YARN_MM_RANGE[0]}~${YARN_MM_RANGE[1]}mm 사이로 적어 주세요.` : "";
  const showErr = !!mmErr && (tried || mmRaw.trim() !== ""); // a wrong value shows at once; an empty one only when moving on
  const setMm = (raw: string) => {
    setMmRaw(raw); const v = parseNum(raw);
    if (Number.isFinite(v) && v >= YARN_MM_RANGE[0] && v <= YARN_MM_RANGE[1]) { const r = Math.round(v * 10) / 10; patch({ yarnMm: r, weight: weightFromMm(r), yarnMode: "mm" }); }
    else patch({ yarnMm: null, yarnMode: "mm" });
  };
  const toggleMat = (m: string) => patch({ materials: mats.includes(m) ? mats.filter(x => x !== m) : [...mats, m], ...(m === "혼방" && mats.includes(m) ? { blend: "" } : {}) });
  const customMats = mats.filter(m => !MATERIALS.includes(m));
  const listed = moreMats ? MATERIALS : COMMON_MATERIALS;
  const num = (k: "skeinG" | "skeinM" | "skeins") => (raw: string) => { const v = parseNum(raw); patch({ [k]: Number.isFinite(v) ? v : null } as Partial<Draft>); };
  const info = [draft.yarn, mats.join(" · "), draft.skeinG ? `${draft.skeinG}g` : "", draft.skeinM ? `${draft.skeinM}m` : "", draft.skeins ? `${draft.skeins}타래` : "", draft.shop ?? ""].filter(Boolean).join(" · ");

  return (
    <div className="nb-stack">
      {/* required, open: yarn thickness */}
      <div className="nb-field nb-field-open">
        <span className="nb-lbl" id="yMmLbl">실 굵기</span>
        {mode === "mm" ? (
          <div className="nb-mm">
            <input id="yMm" className="nb-input nb-short" inputMode="decimal" autoComplete="off" aria-labelledby="yMmLbl" aria-invalid={showErr} aria-describedby={showErr ? "yMmErr" : undefined} value={mmRaw} onChange={e => setMm(e.target.value)} placeholder="예: 3.2" />
            <span className="nb-unit">mm</span>
            {!mmErr && <span className="nb-hint">{YARN_KO[weightFromMm(Math.round(mm * 10) / 10)]}으로 계산해요</span>}
            <button type="button" className="nb-link" onClick={() => patch({ yarnMode: "level" })}>잘 모르겠어요</button>
          </div>
        ) : (
          <div className="nb-mm">
            <Radios label="실 굵기" value={draft.weight} onPick={v => patch({ weight: v as Weight, yarnMode: "level" })} options={(["thin", "medium", "thick"] as Weight[]).map(w => [w, YARN_KO[w]])} />
            <button type="button" className="nb-link" onClick={() => { patch({ yarnMode: "mm" }); setMm(mmRaw); }}>mm로 적기</button>
          </div>
        )}
        {showErr && mode === "mm" ? <p className="nb-err" id="yMmErr">{mmErr}</p> : <p className="nb-help">실 라벨에 없으면 자로 실 가닥의 폭을 재 보세요.</p>}
      </div>

      {/* required, open: hook size */}
      <HookField draft={draft} patch={patch} tried={tried} />

      <div className="nb-folds">
        {/* everything the yarn's own label says, in one place */}
        <Fold label="가지고 있는 실 정보" value={info} open={open === "info"} onToggle={() => toggle("info")}>
          <div className="nb-mini"><label htmlFor="yName">실 이름 / 브랜드</label>
            <input id="yName" className="nb-input nb-input-sm nb-wide" autoComplete="off" maxLength={MAX_TEXT} placeholder="예: 면 혼방 합사" value={draft.yarn} onChange={e => patch({ yarn: e.target.value })} onBlur={e => patch({ yarn: clean(e.target.value) })} />
          </div>
          <div className="nb-mini"><span className="nb-mini-lbl">재질</span>
            <div className="nb-chips" role="group" aria-label="재질 (여러 개)">
              {listed.map(m => <button key={m} type="button" className="nb-chip" aria-pressed={mats.includes(m)} onClick={() => toggleMat(m)}>{m}</button>)}
              {customMats.map(m => <span key={m} className="nb-chip nb-chip-own">{m}<button type="button" aria-label={`${m} 지우기`} onClick={() => toggleMat(m)}>×</button></span>)}
              {!moreMats && <button type="button" className="nb-chip nb-chip-more" onClick={() => setMoreMats(true)}>더 보기</button>}
              <AddChip label="재질 직접 입력" onAdd={v => { if (!mats.includes(v)) patch({ materials: [...mats, v] }); }} />
            </div>
            {mats.includes("혼방") && <div className="nb-sub"><Text id="yBlend" label="혼방 비율" value={draft.blend} onChange={v => patch({ blend: v })} placeholder="혼방 비율 (예: 코튼 60 · 아크릴 40)" /></div>}
          </div>
          <div className="nb-grid2">
            {([["skeinG", "한 타래 무게 (g)"], ["skeinM", "한 타래 길이 (m)"], ["skeins", "가지고 있는 타래 수"]] as const).map(([k, l]) => (
              <div key={k} className="nb-mini"><label htmlFor={"y" + k}>{l}</label><input id={"y" + k} className="nb-input nb-input-sm" inputMode="decimal" defaultValue={draft[k] ?? ""} onChange={e => num(k)(e.target.value)} /></div>
            ))}
            <div className="nb-mini"><label htmlFor="yShop">구입처</label><input id="yShop" className="nb-input nb-input-sm" maxLength={MAX_TEXT} value={draft.shop ?? ""} onChange={e => patch({ shop: e.target.value })} onBlur={e => patch({ shop: clean(e.target.value) })} /></div>
          </div>
          <div className="nb-mini"><label htmlFor="yMemo">메모</label><input id="yMemo" className="nb-input nb-input-sm nb-wide" maxLength={MAX_TEXT} value={draft.memo ?? ""} onChange={e => patch({ memo: e.target.value })} onBlur={e => patch({ memo: clean(e.target.value) })} /></div>
        </Fold>
      </div>
    </div>
  );
}

/** The hook size (required): a size from the list, or "직접 입력" in mm. */
function HookField({ draft, patch, tried }: { draft: Draft; patch: Patch; tried: boolean }) {
  const chip = HOOK_CHIPS.find(([k, v]) => k === draft.hook && (!draft.hookMm || draft.hookMm === v));
  const [custom, setCustom] = useState(!chip && !!draft.hook);
  const [raw, setRaw] = useState(!chip && draft.hookMm ? String(draft.hookMm) : "");
  const v = parseNum(raw);
  const err = !custom ? (!draft.hook ? "코바늘 굵기를 골라 주세요." : "") : !raw.trim() ? "바늘 굵기를 mm로 적어 주세요." : !Number.isFinite(v) ? "숫자로 적어 주세요 (예: 1.25)."
    : v < HOOK_MM_RANGE[0] || v > HOOK_MM_RANGE[1] ? `${HOOK_MM_RANGE[0]}~${HOOK_MM_RANGE[1]}mm 사이로 적어 주세요.` : "";
  const showErr = !!err && (tried || (custom && raw.trim() !== ""));
  const setMm = (s: string) => {
    setRaw(s); const n = parseNum(s);
    if (Number.isFinite(n) && n >= HOOK_MM_RANGE[0] && n <= HOOK_MM_RANGE[1]) { const r = Math.round(n * 100) / 100; patch({ hook: `${r}mm`, hookMm: r }); }
    else patch({ hook: "", hookMm: null });
  };
  const mm = draft.hook ? hookMmOf(draft) : NaN;
  const mis = Number.isFinite(mm) ? hookYarnMismatch(mm, draft.yarnMode !== "level" ? draft.yarnMm : null) : null;
  return (
    <div className="nb-field nb-field-open">
      <span className="nb-lbl">코바늘 굵기</span>
      <div className="nb-mm">
        <HookSelect value={chip?.[0] ?? ""} custom={custom} invalid={showErr} describedBy={showErr ? "hErr" : undefined}
          onPick={(k, m) => { setCustom(false); patch({ hook: k, hookMm: m }); }} onCustom={() => { setCustom(true); setMm(raw); }} />
        {custom && <><label htmlFor="hMm" className="sr">코바늘 굵기 mm</label>
          <input id="hMm" className="nb-input nb-short" inputMode="decimal" autoComplete="off" autoFocus aria-invalid={showErr} aria-describedby={showErr ? "hErr" : undefined} value={raw} onChange={e => setMm(e.target.value)} placeholder="예: 1.25" /><span className="nb-unit">mm</span></>}
      </div>
      {showErr ? <p className="nb-err" id="hErr">{err}</p> : <p className="nb-help">바늘에 적힌 mm를 기준으로 해요.</p>}
      {mis && <p className="nb-warn" role="status">{mis === "thin" ? "이 실에는 바늘이 가늘어요. 편물이 빳빳해질 수 있어요." : "이 실에는 바늘이 굵어요. 편물이 성글어질 수 있어요."}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- right page: the colours and a short summary
/** The yarns' colours as one list: the first one lives in color / colorName / colorNo / lot (the preview
 *  and the stitch map use it), the ones added after it in moreColors. */
const colorsOf = (d: Draft): YarnColor[] => [{ hex: d.color, name: d.colorName, no: d.colorNo, lot: d.lot }, ...(d.moreColors ?? [])];
function setColor(d: Draft, i: number, c: YarnColor): Partial<Draft> {
  if (i === 0) return { color: c.hex, colorName: c.name, colorNo: c.no, lot: c.lot };
  const more = [...(d.moreColors ?? [])]; more[i - 1] = c; return { moreColors: more };
}

function ColorEditor({ c, i, onChange }: { c: YarnColor; i: number; onChange: (c: YarnColor) => void }) {
  const preset = c.hex ? COLORS.find(([n, hex]) => hex === c.hex && n === c.name) : undefined;
  const id = (k: string) => `yc${i}${k}`;
  return (
    <>
      {/* ten unlabelled dots (name on hover / for screen readers); clicking the picked one clears it */}
      <div className="nb-dots" role="radiogroup" aria-label={`색 ${i + 1}`}>
        {COLORS.map(([n, hex]) => {
          const on = preset?.[0] === n;
          return <button key={n} type="button" role="radio" aria-checked={on} aria-label={n} title={n} className="nb-dot-color" style={{ background: hex }}
            onClick={() => onChange(on ? { ...c, hex: undefined, name: undefined } : { ...c, hex, name: n })} />;
        })}
      </div>
      <div className="nb-custom">
        <label htmlFor={id("n")} className="sr">직접 입력한 색 이름</label>
        <input id={id("n")} className="nb-input nb-input-sm" autoComplete="off" maxLength={MAX_TEXT} placeholder="직접 입력 (예: 올리브)" value={preset ? "" : c.name ?? ""}
          onChange={e => onChange({ ...c, name: e.target.value || undefined, hex: preset ? undefined : c.hex })} onBlur={e => onChange({ ...c, name: clean(e.target.value) || undefined })} />
        <label className="nb-picker" title="색 고르기"><span className="sr">직접 고른 색</span>
          <input type="color" value={!preset && c.hex ? c.hex : "#C9B8E0"} onChange={e => onChange({ ...c, hex: e.target.value, name: preset ? undefined : c.name })} />
        </label>
      </div>
      <div className="nb-grid2">
        <div className="nb-mini"><label htmlFor={id("no")}>색 번호</label>
          <input id={id("no")} className="nb-input nb-input-sm" autoComplete="off" maxLength={MAX_TEXT} placeholder="예: No. 214" value={c.no ?? ""} onChange={e => onChange({ ...c, no: e.target.value })} onBlur={e => onChange({ ...c, no: clean(e.target.value) })} /></div>
        <div className="nb-mini"><label htmlFor={id("lot")}>LOT 번호</label>
          <input id={id("lot")} className="nb-input nb-input-sm" autoComplete="off" maxLength={MAX_TEXT} placeholder="예: A2417-03" value={c.lot ?? ""} onChange={e => onChange({ ...c, lot: e.target.value })} onBlur={e => onChange({ ...c, lot: clean(e.target.value) })} /></div>
      </div>
      <p className="nb-help">LOT(염색 로트)는 같은 색 실을 더 살 때 필요해요. 실 라벨에 적혀 있어요.</p>
    </>
  );
}

export function HookPage({ draft, patch, item, stitchMm, measureNote }: { draft: Draft; patch: Patch; item: Item; stitchMm: number; measureNote: string; tried?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const colors = colorsOf(draft);
  const mm = draft.hook ? hookMmOf(draft) : NaN;
  const line1 = [draft.name.trim() || "이름 없는 작품", item.name].join(" · ");
  const line2 = [draft.yarn, draft.materials?.join(" · "), Number.isFinite(mm) ? hookLabel(mm).replace(" · ", " ") : ""].filter(Boolean).join(" · ");
  const add = () => { patch({ moreColors: [...(draft.moreColors ?? []), {}] }); setOpen(colors.length); };
  const remove = (i: number) => { patch({ moreColors: (draft.moreColors ?? []).filter((_, j) => j !== i - 1) }); setOpen(null); };

  return (
    <div className="nb-stack nb-hook">
      <span className="nb-lbl">색</span>
      <div className="nb-folds nb-colors">
        {colors.map((c, i) => (
          <div key={i} className="nb-color-row">
            <Fold label={colors.length > 1 ? `색 ${i + 1}` : "실 색"} open={open === i} onToggle={() => setOpen(o => (o === i ? null : i))}
              value={c.hex || c.name || c.no || c.lot ? <>{c.hex && <i className="nb-swatch" style={{ background: c.hex }} />}{c.name || (c.hex ? "직접 고른 색" : "")}{c.no ? ` · ${c.no}` : ""}{c.lot ? ` · LOT ${c.lot}` : ""}</> : ""}>
              <ColorEditor c={c} i={i} onChange={nc => patch(setColor(draft, i, nc))} />
              {i > 0 && <button type="button" className="nb-link nb-color-del" onClick={() => remove(i)}>이 색 빼기</button>}
            </Fold>
          </div>
        ))}
      </div>
      {colors.length < MAX_COLORS && <button type="button" className="nb-chip nb-chip-add nb-color-add" onClick={add}>+ 색 추가 (실 추가)</button>}

      {/* summary: two sentences, then the expected stitch size */}
      <div className="nb-recap" aria-live="polite">
        <p className="nb-recap-1">{line1}</p>
        {line2 && <p className="nb-recap-2">{line2}</p>}
        <p className="nb-recap-st">한 코 크기 약 <b>{fmt(stitchMm)}mm</b></p>
        <p className="nb-help">{measureNote}</p>
      </div>
    </div>
  );
}
