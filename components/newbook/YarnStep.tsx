"use client";
// 실과 바늘 (step 3 of 도안 만들기): the yarn on the left page, the hook and a short summary on the right.
// Only what is needed now is open: the two required fields (yarn thickness, hook size). Everything else
// is a folded row showing its current value; one row opens at a time. Every choice keeps its own
// "직접 입력". Errors appear only when trying to move on with a required field empty.
import { useState, type ReactNode } from "react";
import type { Item } from "@/lib/items";
import { fmt, YARN_KO, type Weight } from "@/lib/pattern";
import type { Draft } from "@/lib/types";
import { clean, HOOK_CHIPS, HOOK_MATERIALS, HOOK_MM_RANGE, hookLabel, hookMmOf, hookYarnMismatch, MATERIALS, MAX_TEXT, parseNum, weightFromMm, YARN_MM_RANGE } from "@/lib/yarn";
import { Fold, useOneOpen } from "./Fold";
import { HookSelect } from "./HookSelect";

export const COLORS: [string, string][] = [
  ["크림", "#F3E9D2"], ["라벤더", "#C9B8E0"], ["연핑크", "#F2C4CC"], ["하늘", "#BCD8EC"], ["세이지 그린", "#B5C4A8"],
  ["버터 노랑", "#F3DE98"], ["살구", "#F5C3A0"], ["모카 브라운", "#9C7A62"], ["차콜", "#4E4A4C"], ["흰색", "#FFFFFF"],
];
const COMMON_MATERIALS = ["코튼", "울", "아크릴", "메리노", "리넨", "혼방"];

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
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); add(); } if (e.key === "Escape") setOpen(false); }} />
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

// ---------------------------------------------------------------- left page: the yarn
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
  const preset = draft.color ? COLORS.find(([n, hex]) => hex === draft.color && n === draft.colorName) : undefined;
  const num = (k: "skeinG" | "skeinM" | "skeins") => (raw: string) => { const v = parseNum(raw); patch({ [k]: Number.isFinite(v) ? v : null } as Partial<Draft>); };
  const labelVal = [draft.skeinG ? `${draft.skeinG}g` : "", draft.skeinM ? `${draft.skeinM}m` : "", draft.skeins ? `${draft.skeins}타래` : "", draft.shop ?? ""].filter(Boolean).join(" · ");

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

      <div className="nb-folds">
        <Fold label="실 이름 / 브랜드" value={draft.yarn} open={open === "name"} onToggle={() => toggle("name")}>
          <Text id="yName" label="실 이름 / 브랜드" value={draft.yarn} onChange={v => patch({ yarn: v })} placeholder="예: 면 혼방 합사" />
        </Fold>
        <Fold label="재질" value={mats.join(" · ")} open={open === "mat"} onToggle={() => toggle("mat")}>
          <div className="nb-chips" role="group" aria-label="재질 (여러 개)">
            {listed.map(m => <button key={m} type="button" className="nb-chip" aria-pressed={mats.includes(m)} onClick={() => toggleMat(m)}>{m}</button>)}
            {customMats.map(m => <span key={m} className="nb-chip nb-chip-own">{m}<button type="button" aria-label={`${m} 지우기`} onClick={() => toggleMat(m)}>×</button></span>)}
            {!moreMats && <button type="button" className="nb-chip nb-chip-more" onClick={() => setMoreMats(true)}>더 보기</button>}
            <AddChip label="재질 직접 입력" onAdd={v => { if (!mats.includes(v)) patch({ materials: [...mats, v] }); }} />
          </div>
          {mats.includes("혼방") && <div className="nb-sub"><Text id="yBlend" label="혼방 비율" value={draft.blend} onChange={v => patch({ blend: v })} placeholder="혼방 비율 (예: 코튼 60 · 아크릴 40)" /></div>}
        </Fold>
        <Fold label="색" open={open === "color"} onToggle={() => toggle("color")}
          value={draft.color || draft.colorName ? <>{draft.color && <i className="nb-swatch" style={{ background: draft.color }} />}{draft.colorName || "직접 고른 색"}{draft.colorNo ? ` · ${draft.colorNo}` : ""}</> : ""}>
          {/* ten unlabelled dots (name on hover / for screen readers); clicking the picked one clears it */}
          <div className="nb-dots" role="radiogroup" aria-label="실 색">
            {COLORS.map(([n, hex]) => {
              const on = preset?.[0] === n;
              return <button key={n} type="button" role="radio" aria-checked={on} aria-label={n} title={n} className="nb-dot-color" style={{ background: hex }}
                onClick={() => patch(on ? { color: undefined, colorName: undefined } : { color: hex, colorName: n })} />;
            })}
          </div>
          <div className="nb-custom">
            <label htmlFor="yColorName" className="sr">직접 입력한 색 이름</label>
            <input id="yColorName" className="nb-input nb-input-sm" autoComplete="off" maxLength={MAX_TEXT} placeholder="직접 입력 (예: 올리브)" value={preset ? "" : draft.colorName ?? ""}
              onChange={e => patch({ colorName: e.target.value || undefined, color: preset ? undefined : draft.color })} onBlur={e => patch({ colorName: clean(e.target.value) || undefined })} />
            <label className="nb-picker" title="색 고르기"><span className="sr">직접 고른 색</span>
              <input type="color" value={!preset && draft.color ? draft.color : "#C9B8E0"} onChange={e => patch({ color: e.target.value, colorName: preset ? undefined : draft.colorName })} />
            </label>
            <label htmlFor="yColorNo" className="sr">색 번호</label>
            <input id="yColorNo" className="nb-input nb-input-sm" autoComplete="off" maxLength={MAX_TEXT} placeholder="색 번호 (예: No. 214)" value={draft.colorNo ?? ""} onChange={e => patch({ colorNo: e.target.value })} onBlur={e => patch({ colorNo: clean(e.target.value) })} />
          </div>
        </Fold>
        <Fold label="LOT 번호" value={draft.lot} open={open === "lot"} onToggle={() => toggle("lot")}>
          <Text id="yLot" label="LOT (염색 로트) 번호" value={draft.lot} onChange={v => patch({ lot: v })} placeholder="예: A2417-03" />
          <p className="nb-help">나중에 같은 색 실을 더 살 때 필요해요. 실 라벨에 적혀 있어요.</p>
        </Fold>
        <Fold label="라벨 정보 더 적기" value={labelVal} open={open === "label"} onToggle={() => toggle("label")}>
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

// ---------------------------------------------------------------- right page: the hook and a short summary
export function HookPage({ draft, patch, item, stitchMm, measureNote, tried }: { draft: Draft; patch: Patch; item: Item; stitchMm: number; measureNote: string; tried: boolean }) {
  const [open, toggle] = useOneOpen();
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
  const preset = HOOK_MATERIALS.includes(draft.hookMaterial ?? "");
  const [ownMat, setOwnMat] = useState(!!draft.hookMaterial && !preset);
  const line1 = [draft.name.trim() || "이름 없는 작품", item.name].join(" · ");
  const line2 = [draft.yarn, draft.materials?.join(" · "), Number.isFinite(mm) ? hookLabel(mm).replace(" · ", " ") : ""].filter(Boolean).join(" · ");

  return (
    <div className="nb-stack nb-hook">
      {/* required, open: hook size */}
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

      <div className="nb-folds">
        <Fold label="코바늘 재질" value={draft.hookMaterial} open={open === "hmat"} onToggle={() => toggle("hmat")}>
          <div className="nb-chips" role="group" aria-label="코바늘 재질">
            {HOOK_MATERIALS.map(m => <button key={m} type="button" className="nb-chip" aria-pressed={draft.hookMaterial === m} onClick={() => { setOwnMat(false); patch({ hookMaterial: draft.hookMaterial === m ? undefined : m }); }}>{m}</button>)}
            <button type="button" className="nb-chip nb-chip-add" aria-pressed={ownMat} onClick={() => { setOwnMat(true); if (preset) patch({ hookMaterial: "" }); }}>+ 직접 입력</button>
          </div>
          {ownMat && <div className="nb-sub"><Text id="hMat" label="코바늘 재질 직접 입력" value={preset ? "" : draft.hookMaterial} onChange={x => patch({ hookMaterial: x || undefined })} placeholder="예: 카본" /></div>}
        </Fold>
      </div>

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
