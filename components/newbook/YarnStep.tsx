"use client";
// 실과 바늘 (step 3 of 도안 만들기), one spread:
//   left page  - the supplies in two groups. 실: thickness (required), the colours (one row per yarn:
//                colour, colour number, LOT; "+ 색 추가" for more yarns), then name / material / what the
//                yarn's label says, folded. 바늘: the hook size (required)
//   right page - the supplies card: what was picked, and how much yarn the pattern will take
// Only the required fields are open; everything else is a folded row showing its current value, one row
// open at a time. Every choice keeps its own "직접 입력". Errors appear only when trying to move on with a
// required field empty.
import { useState, type ReactNode } from "react";
import type { Item } from "@/lib/items";
import { fmt, YARN_KO, type Plan, type Weight } from "@/lib/pattern";
import type { Draft, YarnColor } from "@/lib/types";
import { clean, HOOK_CHIPS, HOOK_MM_RANGE, hookLabel, hookMmOf, hookYarnMismatch, MATERIALS, MAX_TEXT, parseNum, weightFromMm, YARN_MM_RANGE, yarnWeightText } from "@/lib/yarn";
import { yarnUse } from "@/lib/yarnUse";
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
      {/* everything about the yarn in one group: thickness (required), colours, then name / material / label */}
      <section className="nb-sec" aria-labelledby="secYarn">
      <h2 className="nb-sec-title" id="secYarn">실</h2>
      <div className="nb-field nb-field-open">
        <span className="nb-lbl" id="yMmLbl">굵기</span>
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

      {/* the yarn colours (one row per yarn, with its colour number and LOT) */}
      <ColorList draft={draft} patch={patch} open={open} toggle={toggle} />

      <div className="nb-folds">
        {/* everything the yarn's own label says, in one place */}
        <Fold label="이름 · 재질 · 라벨 정보" value={info} open={open === "info"} onToggle={() => toggle("info")}>
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
      </section>

      {/* the hook, its own group */}
      <section className="nb-sec" aria-labelledby="secHook">
        <h2 className="nb-sec-title" id="secHook">바늘</h2>
        <HookField draft={draft} patch={patch} tried={tried} />
      </section>
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
      <span className="nb-lbl">굵기</span>
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
        {/* the browser's colour picker behind a clear face: a colour wheel + "직접 고르기" until a colour of
            one's own is picked, then that colour + "직접 고른 색" (the wheel is an SVG, so a turn's page
            picture shows it too) */}
        <label className={"nb-picker" + (!preset && c.hex ? " is-own" : "")} title="팔레트에서 색 고르기">
          <span className="nb-picker-dot" aria-hidden="true">
            {!preset && c.hex ? <i style={{ background: c.hex }} /> : (
              <svg viewBox="0 0 32 32">{["#F28B82", "#F6C177", "#F3E08A", "#A8D5A2", "#9CC7EA", "#B9A3E3"].map((col, k) => {
                const a0 = (k / 6) * 2 * Math.PI - Math.PI / 2, a1 = ((k + 1) / 6) * 2 * Math.PI - Math.PI / 2;
                return <path key={col} d={`M16 16L${16 + 15 * Math.cos(a0)} ${16 + 15 * Math.sin(a0)}A15 15 0 0 1 ${16 + 15 * Math.cos(a1)} ${16 + 15 * Math.sin(a1)}Z`} fill={col} />;
              })}<circle cx="16" cy="16" r="5.5" fill="#FFFBF5" /><path d="M16 13.2v5.6M13.2 16h5.6" stroke="#6B5C55" strokeWidth="1.4" strokeLinecap="round" /></svg>
            )}
          </span>
          <span className="nb-picker-text">{!preset && c.hex ? "직접 고른 색" : "직접 고르기"}</span>
          <input type="color" aria-label="팔레트에서 색 고르기" value={!preset && c.hex ? c.hex : "#C9B8E0"} onChange={e => onChange({ ...c, hex: e.target.value, name: preset ? undefined : c.name })} />
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

/** The colours (page 5, under the hook): one folded row per yarn, "+ 색 추가" under them. Shares the page's
 *  one-open-at-a-time state (keys "c0", "c1"...). */
function ColorList({ draft, patch, open, toggle }: { draft: Draft; patch: Patch; open: string | null; toggle: (k: string) => void }) {
  const colors = colorsOf(draft);
  const add = () => { patch({ moreColors: [...(draft.moreColors ?? []), {}] }); toggle("c" + colors.length); };
  const remove = (i: number) => { patch({ moreColors: (draft.moreColors ?? []).filter((_, j) => j !== i - 1) }); toggle("c" + i); };
  return (
    <div className="nb-field nb-field-open nb-colorfield">
      <span className="nb-lbl">색</span>
      <div className="nb-folds nb-colors">
        {colors.map((c, i) => (
          <Fold key={i} label={colors.length > 1 ? `색 ${i + 1}` : "실 색"} open={open === "c" + i} onToggle={() => toggle("c" + i)}
            value={c.hex || c.name || c.no || c.lot ? <>{c.hex && <i className="nb-swatch" style={{ background: c.hex }} />}{c.name || (c.hex ? "직접 고른 색" : "")}{c.no ? ` · ${c.no}` : ""}{c.lot ? ` · LOT ${c.lot}` : ""}</> : ""}>
            <ColorEditor c={c} i={i} onChange={nc => patch(setColor(draft, i, nc))} />
            {i > 0 && <button type="button" className="nb-link nb-color-del" onClick={() => remove(i)}>이 색 빼기</button>}
          </Fold>
        ))}
      </div>
      {colors.length < MAX_COLORS && <button type="button" className="nb-chip nb-chip-add nb-color-add" onClick={add}>+ 색 추가 (실 추가)</button>}
    </div>
  );
}

// ---------------------------------------------------------------- right page: the supplies card
/** Page 6: what was picked on page 5 as one card, like a supplies list (yarn, hook, colours), and how much
 *  yarn the pattern will take (lib/yarnUse.ts: a rule of thumb, shown with "약"). */
export function SuppliesPage({ draft, item, pp, stitchMm, measureNote }: { draft: Draft; item: Item; pp: Plan; stitchMm: number; measureNote: string }) {
  const colors = colorsOf(draft).filter(c => c.hex || c.name);
  const mm = draft.hook ? hookMmOf(draft) : NaN;
  const use = yarnUse(pp, { weight: draft.weight, skeinG: draft.skeinG, skeinM: draft.skeinM, skeins: draft.skeins, colors: Math.max(1, colors.length) });
  const yarnLine = [draft.yarn, draft.materials?.join(" · ")].filter(Boolean).join(" · ");
  const label = draft.skeinG && draft.skeinM ? `한 타래 ${draft.skeinG}g · ${draft.skeinM}m 기준` : draft.skeinG ? `한 타래 ${draft.skeinG}g 기준` : draft.skeinM ? `한 타래 ${draft.skeinM}m 기준` : "";
  return (
    <div className="nb-supplies" aria-live="polite">
      <h2 className="nb-sup-title">준비물</h2>
      <p className="nb-sup-for">{[draft.name.trim() || "이름 없는 작품", item.name].join(" · ")}</p>
      <dl className="nb-sup-list">
        <div><dt>실</dt><dd>{yarnLine || <span className="nb-none">이름 없음</span>}{yarnWeightText(draft) !== "—" && <small>{yarnWeightText(draft)}</small>}</dd></div>
        <div><dt>바늘</dt><dd>{Number.isFinite(mm) ? hookLabel(mm) : <span className="nb-none">고르지 않음</span>}</dd></div>
        <div><dt>색</dt><dd className="nb-sup-colors">{colors.length ? colors.map((c, i) => (
          <span key={i} className="nb-sup-color">{c.hex && <i className="nb-swatch" style={{ background: c.hex }} />}{c.name || "직접 고른 색"}{c.lot ? <small>LOT {c.lot}</small> : null}</span>
        )) : <span className="nb-none">고르지 않음</span>}</dd></div>
      </dl>

      <div className="nb-sup-use">
        <span className="nb-sup-use-lbl">예상 실 양</span>
        <p className="nb-sup-use-num">약 <b>{use.m}m</b> · 약 <b>{use.g}g</b></p>
        {use.perColor && <p className="nb-sup-use-sub">색마다 약 {use.perColor}m</p>}
        {use.skeins != null && <p className="nb-sup-use-sub">{label}으로 <b>{use.skeins}타래</b>{draft.skeins ? ` · 가지고 있는 ${draft.skeins}타래` : ""}</p>}
        {use.short && <p className="nb-warn" role="status">가지고 있는 실이 조금 모자랄 수 있어요. 같은 LOT로 한 타래 더 준비해 두세요.</p>}
        <p className="nb-help">도안의 코 수로 어림한 양이에요 (여유 10% 포함). 실 라벨의 무게와 길이를 적으면 타래 수도 알려 드려요.</p>
      </div>

      <p className="nb-sup-stitch">한 코 크기 약 <b>{fmt(stitchMm)}mm</b></p>
      <p className="nb-help">{measureNote}</p>
    </div>
  );
}
