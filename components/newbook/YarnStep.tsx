"use client";
// 실과 바늘 (step 3 of 도안 만들기): the yarn on the left page, the hook and a summary on the right.
// Nothing here may leave someone stuck: every choice has its own "직접 입력". Only the yarn thickness and
// the hook size are required; the rest is stored for the record (lib/types Draft), not calculated with.
import { useState, type KeyboardEvent, type ReactNode } from "react";
import type { Item } from "@/lib/items";
import { fmt, YARN_KO, type Weight } from "@/lib/pattern";
import type { Draft } from "@/lib/types";
import { yarnWeightText } from "@/lib/yarn";
import { clean, HOOK_CHIPS, HOOK_MATERIALS, HOOK_MM_RANGE, hookLabel, hookMmOf, hookYarnMismatch, MATERIALS, MAX_TEXT, parseNum, weightFromMm, YARN_MM_RANGE } from "@/lib/yarn";

export const COLORS: [string, string][] = [
  ["크림", "#F3E9D2"], ["라벤더", "#C9B8E0"], ["연핑크", "#F2C4CC"], ["하늘", "#BCD8EC"], ["세이지 그린", "#B5C4A8"],
  ["버터 노랑", "#F3DE98"], ["살구", "#F5C3A0"], ["모카 브라운", "#9C7A62"], ["차콜", "#4E4A4C"], ["흰색", "#FFFFFF"],
];

/** Required on this step: yarn thickness (mm in range, or a level picked) and a hook size. */
export function yarnStepOk(d: Draft) {
  const yarnOk = d.yarnMode === "level" || (d.yarnMm != null && d.yarnMm >= YARN_MM_RANGE[0] && d.yarnMm <= YARN_MM_RANGE[1]);
  const mm = d.hook ? hookMmOf(d) : NaN;
  return yarnOk && mm >= HOOK_MM_RANGE[0] && mm <= HOOK_MM_RANGE[1];
}

type Patch = (p: Partial<Draft>) => void;

/** Radio chips: roving tab stop, arrow keys move and select. */
function Radios({ label, value, options, onPick }: { label: string; value: string; options: [string, ReactNode][]; onPick: (v: string) => void }) {
  const idx = Math.max(0, options.findIndex(([v]) => v === value));
  const key = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault(); const j = (i + d + options.length) % options.length; onPick(options[j][0]);
    (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
  };
  return (
    <div className="nb-chips" role="radiogroup" aria-label={label}>
      {options.map(([v, t], i) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} tabIndex={i === idx ? 0 : -1} className="nb-chip" onClick={() => onPick(v)} onKeyDown={e => key(e, i)}>{t}</button>
      ))}
    </div>
  );
}

/** A "+ 직접 입력" chip that opens a text box; Enter adds. */
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

const Text = ({ id, value, onChange, placeholder }: { id: string; value?: string; onChange: (v: string) => void; placeholder?: string }) =>
  <input id={id} className="nb-input" autoComplete="off" maxLength={MAX_TEXT} placeholder={placeholder} value={value ?? ""} onChange={e => onChange(e.target.value)} onBlur={e => onChange(clean(e.target.value))} />;

// ---------------------------------------------------------------- left page: the yarn
export function YarnPage({ draft, patch }: { draft: Draft; patch: Patch }) {
  const mats = draft.materials ?? [];
  const [mmRaw, setMmRaw] = useState(draft.yarnMm != null ? String(draft.yarnMm) : "");
  const mode = draft.yarnMode ?? (draft.yarnMm ? "mm" : "level");
  const mm = parseNum(mmRaw), mmErr = !mmRaw.trim() ? "실 굵기를 적거나, 아래 '굵기를 모르겠어요'를 눌러 주세요."
    : !Number.isFinite(mm) ? "숫자로 적어 주세요 (예: 3.2)." : mm < YARN_MM_RANGE[0] || mm > YARN_MM_RANGE[1] ? `${YARN_MM_RANGE[0]}~${YARN_MM_RANGE[1]}mm 사이로 적어 주세요.` : "";
  const setMm = (raw: string) => {
    setMmRaw(raw); const v = parseNum(raw);
    if (Number.isFinite(v) && v >= YARN_MM_RANGE[0] && v <= YARN_MM_RANGE[1]) { const r = Math.round(v * 10) / 10; patch({ yarnMm: r, weight: weightFromMm(r), yarnMode: "mm" }); }
    else patch({ yarnMm: null, yarnMode: "mm" });
  };
  const toggle = (m: string) => patch({ materials: mats.includes(m) ? mats.filter(x => x !== m) : [...mats, m] });
  const custom = mats.filter(m => !MATERIALS.includes(m));
  const chosen = draft.color ? COLORS.find(([n, hex]) => hex === draft.color && n === draft.colorName)?.[0] : undefined;
  const num = (k: "skeinG" | "skeinM" | "skeins") => (raw: string) => { const v = parseNum(raw); patch({ [k]: Number.isFinite(v) ? v : null } as Partial<Draft>); };

  return (
    <div className="nb-scroll nb-yarn">
      <div className="nb-field"><label htmlFor="yName">실 이름 / 브랜드 (선택)</label><Text id="yName" value={draft.yarn} onChange={v => patch({ yarn: v })} placeholder="예: 면 혼방 합사" /></div>

      <div className="nb-field"><span className="nb-lbl">재질 (선택, 여러 개)</span>
        <div className="nb-chips" role="group" aria-label="재질">
          {MATERIALS.map(m => <button key={m} type="button" className="nb-chip" aria-pressed={mats.includes(m)} onClick={() => toggle(m)}>{m}</button>)}
          {custom.map(m => <span key={m} className="nb-chip nb-chip-own" aria-pressed="true">{m}<button type="button" aria-label={`${m} 지우기`} onClick={() => toggle(m)}>×</button></span>)}
          <AddChip label="재질 직접 입력" onAdd={v => { if (!mats.includes(v)) patch({ materials: [...mats, v] }); }} />
        </div>
        <label htmlFor="yBlend" className="sr">혼방 비율</label>
        <input id="yBlend" className="nb-input nb-input-sm nb-blend" autoComplete="off" maxLength={MAX_TEXT} placeholder="혼방 비율 (예: 코튼 60 · 아크릴 40)" value={draft.blend ?? ""} onChange={e => patch({ blend: e.target.value })} onBlur={e => patch({ blend: clean(e.target.value) })} />
      </div>

      <div className="nb-field"><span className="nb-lbl">색 (선택)</span>
        <Radios label="실 색" value={chosen ?? (draft.colorName || draft.color ? "custom" : "none")}
          onPick={v => { if (v === "none") patch({ color: undefined, colorName: undefined }); else if (v !== "custom") { const c = COLORS.find(([n]) => n === v)!; patch({ color: c[1], colorName: c[0] }); } }}
          options={[["none", "고르지 않음"], ...COLORS.map(([n, hex]): [string, ReactNode] => [n, <><i className="nb-swatch" style={{ background: hex }} />{n}</>])]} />
        {/* a colour of your own: its name and a swatch (the swatch tints the preview and the stitch map) */}
        <div className="nb-custom">
          <label htmlFor="yColorName" className="sr">직접 입력한 색 이름</label>
          <input id="yColorName" className="nb-input nb-colorname" autoComplete="off" maxLength={MAX_TEXT} placeholder="직접 입력 (예: 올리브)" value={chosen ? "" : draft.colorName ?? ""}
            onChange={e => patch({ colorName: e.target.value || undefined, color: chosen ? undefined : draft.color })} onBlur={e => patch({ colorName: clean(e.target.value) || undefined })} />
          <label className="nb-picker" title="색 고르기"><span className="sr">직접 고른 색</span>
            <input type="color" value={!chosen && draft.color ? draft.color : "#C9B8E0"} onChange={e => patch({ color: e.target.value, colorName: chosen ? undefined : draft.colorName })} />
          </label>
          <label htmlFor="yColorNo" className="sr">색 번호</label>
          <input id="yColorNo" className="nb-input nb-input-sm" autoComplete="off" maxLength={MAX_TEXT} placeholder="색 번호 (예: No. 214)" value={draft.colorNo ?? ""} onChange={e => patch({ colorNo: e.target.value })} onBlur={e => patch({ colorNo: clean(e.target.value) })} />
        </div>
      </div>

      <div className="nb-field"><label htmlFor="yLot">LOT (염색 로트) 번호 (선택)</label>
        <Text id="yLot" value={draft.lot} onChange={v => patch({ lot: v })} placeholder="예: A2417-03" />
        <p className="nb-help">나중에 같은 색 실을 더 살 때 필요해요. 실 라벨에 적혀 있어요.</p>
      </div>

      <div className="nb-field"><span className="nb-lbl">실 굵기 <b className="nb-req">필수</b></span>
        {mode === "mm" ? (
          <>
            <div className="nb-mm"><label htmlFor="yMm" className="sr">실 굵기 mm</label>
              <input id="yMm" className="nb-input nb-short" inputMode="decimal" autoComplete="off" aria-invalid={!!mmErr} aria-describedby={mmErr ? "yMmErr" : undefined} value={mmRaw} onChange={e => setMm(e.target.value)} placeholder="예: 3.2" /><span>mm</span>
              {!mmErr && <span className="nb-help">→ {YARN_KO[weightFromMm(Math.round(mm * 10) / 10)]}으로 계산해요</span>}
            </div>
            {mmErr && <p className="nb-err" id="yMmErr">{mmErr}</p>}
            <button type="button" className="nb-link" onClick={() => patch({ yarnMode: "level" })}>굵기를 모르겠어요</button>
          </>
        ) : (
          <>
            <Radios label="실 굵기" value={draft.weight} onPick={v => patch({ weight: v as Weight, yarnMode: "level" })} options={(["thin", "medium", "thick"] as Weight[]).map(w => [w, YARN_KO[w]])} />
            <button type="button" className="nb-link" onClick={() => { patch({ yarnMode: "mm" }); setMm(mmRaw); }}>mm로 적을게요</button>
          </>
        )}
        <p className="nb-help">실 라벨에 없으면 자로 실 가닥의 폭을 재 보세요.</p>
      </div>

      <details className="nb-more">
        <summary>실 라벨 정보 더 적기 (선택)</summary>
        <div className="nb-grid2">
          <div className="nb-field"><label htmlFor="yG">한 타래 무게 (g)</label><input id="yG" className="nb-input" inputMode="decimal" defaultValue={draft.skeinG ?? ""} onChange={e => num("skeinG")(e.target.value)} /></div>
          <div className="nb-field"><label htmlFor="yM">한 타래 길이 (m)</label><input id="yM" className="nb-input" inputMode="decimal" defaultValue={draft.skeinM ?? ""} onChange={e => num("skeinM")(e.target.value)} /></div>
          <div className="nb-field"><label htmlFor="yN">가지고 있는 타래 수</label><input id="yN" className="nb-input" inputMode="decimal" defaultValue={draft.skeins ?? ""} onChange={e => num("skeins")(e.target.value)} /></div>
          <div className="nb-field"><label htmlFor="yShop">구입처</label><Text id="yShop" value={draft.shop} onChange={v => patch({ shop: v })} /></div>
        </div>
        <div className="nb-field"><label htmlFor="yMemo">메모</label><Text id="yMemo" value={draft.memo} onChange={v => patch({ memo: v })} /></div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------- right page: the hook and a summary
export function HookPage({ draft, patch, item, stitchMm, measureNote }: { draft: Draft; patch: Patch; item: Item; stitchMm: number; measureNote: string }) {
  const chip = HOOK_CHIPS.find(([k, v]) => k === draft.hook && (!draft.hookMm || draft.hookMm === v));
  const [customOpen, setCustomOpen] = useState(!chip && !!draft.hook);
  const [raw, setRaw] = useState(!chip && draft.hookMm ? String(draft.hookMm) : "");
  const v = parseNum(raw), err = !customOpen ? "" : !raw.trim() ? "바늘 굵기를 mm로 적어 주세요." : !Number.isFinite(v) ? "숫자로 적어 주세요 (예: 1.25)."
    : v < HOOK_MM_RANGE[0] || v > HOOK_MM_RANGE[1] ? `${HOOK_MM_RANGE[0]}~${HOOK_MM_RANGE[1]}mm 사이로 적어 주세요.` : "";
  const setCustom = (s: string) => {
    setRaw(s); const n = parseNum(s);
    if (Number.isFinite(n) && n >= HOOK_MM_RANGE[0] && n <= HOOK_MM_RANGE[1]) { const r = Math.round(n * 100) / 100; patch({ hook: `${r}mm`, hookMm: r }); }
    else patch({ hook: "", hookMm: null });
  };
  const mm = draft.hook ? hookMmOf(draft) : NaN;
  const mis = Number.isFinite(mm) ? hookYarnMismatch(mm, draft.yarnMode !== "level" ? draft.yarnMm : null) : null;
  const mats = HOOK_MATERIALS.includes(draft.hookMaterial ?? "") ? draft.hookMaterial! : draft.hookMaterial ? "custom" : "none";
  const rows: [string, ReactNode][] = [
    ["작품", draft.name.trim() || "이름 없는 작품"], ["품목", item.name],
    ["실", [draft.yarn, yarnWeightText(draft)].filter(Boolean).join(" · ")],
    ...(draft.materials?.length ? [["재질", draft.materials.join(", ") + (draft.blend ? ` (${draft.blend})` : "")] as [string, ReactNode]] : []),
    ...(draft.color || draft.colorName ? [["색", <>{draft.color && <i className="nb-swatch" style={{ background: draft.color }} />}{draft.colorName || "직접 고른 색"}{draft.colorNo ? ` · ${draft.colorNo}` : ""}</>] as [string, ReactNode]] : []),
    ...(draft.lot ? [["LOT", <b key="l" className="nb-lot">{draft.lot}</b>] as [string, ReactNode]] : []),
    ["코바늘", Number.isFinite(mm) ? hookLabel(mm) + (draft.hookMaterial ? ` · ${draft.hookMaterial}` : "") : "—"],
  ];
  return (
    <div className="nb-hook">
      <div className="nb-field"><span className="nb-lbl">코바늘 굵기 <b className="nb-req">필수</b></span>
        <Radios label="코바늘 굵기" value={customOpen ? "custom" : chip?.[0] ?? ""}
          onPick={k => { if (k === "custom") { setCustomOpen(true); setCustom(raw); } else { const c = HOOK_CHIPS.find(([n]) => n === k)!; setCustomOpen(false); patch({ hook: c[0], hookMm: c[1] }); } }}
          options={[...HOOK_CHIPS.map(([k, v]): [string, ReactNode] => [k, `${k} · ${v.toFixed(1)}mm`]), ["custom", "+ 직접 입력"]]} />
        {customOpen && (
          <div className="nb-mm"><label htmlFor="hMm" className="sr">코바늘 굵기 mm</label>
            <input id="hMm" className="nb-input nb-short" inputMode="decimal" autoComplete="off" autoFocus aria-invalid={!!err} aria-describedby={err ? "hMmErr" : undefined} value={raw} onChange={e => setCustom(e.target.value)} placeholder="예: 1.25" /><span>mm</span>
          </div>
        )}
        {err && <p className="nb-err" id="hMmErr">{err}</p>}
        <p className="nb-help">호수는 나라마다 달라요. 바늘에 적힌 mm를 기준으로 해요.</p>
        {mis && <p className="nb-warn" role="status">{mis === "thin" ? "이 실에는 바늘이 가늘어요. 편물이 빳빳해질 수 있어요." : "이 실에는 바늘이 굵어요. 편물이 성글어질 수 있어요."}</p>}
      </div>
      <div className="nb-field"><span className="nb-lbl">코바늘 재질 (선택)</span>
        <Radios label="코바늘 재질" value={mats} onPick={k => patch({ hookMaterial: k === "none" ? undefined : k === "custom" ? (mats === "custom" ? draft.hookMaterial : "") : k })}
          options={[["none", "고르지 않음"], ...HOOK_MATERIALS.map((m): [string, ReactNode] => [m, m]), ["custom", "직접 입력"]]} />
        {mats === "custom" && <Text id="hMat" value={draft.hookMaterial} onChange={v => patch({ hookMaterial: v || "" })} placeholder="예: 카본" />}
      </div>
      <div className="nb-summary nb-summary-sm">
        <h3>지금까지 고른 것</h3>
        <dl>{rows.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>
        <p className="nb-big">한 코 크기 약 <b>{fmt(stitchMm)}mm</b> <span>(예상)</span></p>
        <p className="nb-help">{measureNote}</p>
      </div>
    </div>
  );
}
