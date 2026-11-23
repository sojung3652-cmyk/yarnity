"use client";
// The web's 3D book, step 3, right pages (Kim: the old pages were hard to read and ran off the bottom).
// One question per spread, the main choices open (no folded rows for them), square tiles instead of pill
// chips, numbers in boxes:
//   실          - thickness, colour (dots), material (tiles: the 3D shows it at once); the label details
//                 (brand, colour no., LOT, skeins, shop, memo) in one folded row at the bottom
//   바늘과 크기  - the hook as tiles (+ 직접 입력) with a line on whether it suits the yarn; shape, size
//   가방 모양    - body, flap, handle as tiles (bags only; NewBook.tsx builds it from BagTiles)
// Phones keep YarnStep.tsx's pages as they are.
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Draft } from "@/lib/types";
import { YARN_KO, type Weight } from "@/lib/pattern";
import { clean, HOOK_CHIPS, HOOK_MM_RANGE, HOOK_YARN_RATIO, hookMmOf, hookYarnMismatch, MATERIALS, MAX_TEXT, parseNum, weightFromMm, YARN_MM_RANGE } from "@/lib/yarn";
import { Fold, useOneOpen } from "./Fold";
import { COLORS, ColorEditor } from "./YarnStep";

type Patch = (p: Partial<Draft>) => void;

/** Square tiles as a radio group (roving tab stop, arrows move and pick). An option's second line is small. */
export function Tiles<T extends string>({ label, value, options, onPick, cols = 3 }: { label: string; value: T | ""; options: [T, ReactNode, ReactNode?][]; onPick: (v: T) => void; cols?: 2 | 3 | 4 | 5 }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, options.findIndex(([v]) => v === value));
  const key = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault(); const j = (i + d + options.length) % options.length; onPick(options[j][0]); refs.current[j]?.focus();
  };
  return (
    <div className={"nb-tiles nb-tiles-" + cols} role="radiogroup" aria-label={label}>
      {options.map(([v, t, sub], i) => (
        <button key={v} ref={el => { refs.current[i] = el; }} type="button" role="radio" aria-checked={value === v} tabIndex={i === idx ? 0 : -1}
          className="nb-tile" onClick={() => onPick(v)} onKeyDown={e => key(e, i)}>{t}{sub != null && sub !== "" && <small>{sub}</small>}</button>
      ))}
    </div>
  );
}

/** A heading for one group on the page, a short note on its right. */
export const Head = ({ id, children, note }: { id?: string; children: ReactNode; note?: ReactNode }) => (
  <div className="nb-wh"><span id={id}>{children}</span>{note && <small>{note}</small>}</div>
);

// the materials shown at once (the rest under 더 보기); the 3D draws each of them its own way
const WEB_MATERIALS = ["코튼", "울", "메리노", "알파카", "모헤어", "아크릴", "리넨", "실크", "벨벳(셔닐)", "라피아", "코드사", "메탈릭"];

// ---------------------------------------------------------------- 실
export function WebYarn({ draft, patch, tried }: { draft: Draft; patch: Patch; tried: boolean }) {
  const [open, toggle] = useOneOpen();
  const [mmRaw, setMmRaw] = useState(draft.yarnMm != null ? String(draft.yarnMm) : "");
  const [more, setMore] = useState(false), [adding, setAdding] = useState(false), [own, setOwn] = useState("");
  const mode = draft.yarnMode ?? (draft.yarnMm ? "mm" : "level");
  const mm = parseNum(mmRaw);
  const mmErr = !mmRaw.trim() ? "실 굵기를 적거나 '잘 모르겠습니다'를 눌러 주십시오." : !Number.isFinite(mm) ? "숫자로 적어 주십시오 (예: 3.2)."
    : mm < YARN_MM_RANGE[0] || mm > YARN_MM_RANGE[1] ? `${YARN_MM_RANGE[0]}~${YARN_MM_RANGE[1]}mm 사이로 적어 주십시오.` : "";
  const showErr = !!mmErr && (tried || mmRaw.trim() !== "");
  const setMm = (raw: string) => {
    setMmRaw(raw); const v = parseNum(raw);
    if (Number.isFinite(v) && v >= YARN_MM_RANGE[0] && v <= YARN_MM_RANGE[1]) { const r = Math.round(v * 10) / 10; patch({ yarnMm: r, weight: weightFromMm(r), yarnMode: "mm" }); }
    else patch({ yarnMm: null, yarnMode: "mm" });
  };
  const mats = draft.materials ?? [];
  const toggleMat = (m: string) => patch({ materials: mats.includes(m) ? mats.filter(x => x !== m) : [...mats, m], ...(m === "혼방" && mats.includes(m) ? { blend: "" } : {}) });
  const listed = more ? MATERIALS : WEB_MATERIALS, customMats = mats.filter(m => !MATERIALS.includes(m));
  const addOwn = () => { const c = clean(own); if (c && !mats.includes(c)) patch({ materials: [...mats, c] }); setOwn(""); setAdding(false); };
  const preset = draft.color ? COLORS.find(([n, hex]) => hex === draft.color && n === draft.colorName) : undefined;
  const extra = draft.moreColors ?? [];
  const num = (k: "skeinG" | "skeinM" | "skeins") => (raw: string) => { const v = parseNum(raw); patch({ [k]: Number.isFinite(v) ? v : null } as Partial<Draft>); };
  const label = [draft.yarn, draft.colorNo, draft.lot ? `LOT ${draft.lot}` : "", draft.skeins ? `${draft.skeins}타래` : ""].filter(Boolean).join(" · ");

  return (
    <div className="nb-web">
      <div className="nb-wg">
        <Head id="wMmLbl" note="실 라벨에 적힌 mm">굵기</Head>
        {mode === "mm" ? (
          <div className="nb-wrow">
            <span className="nb-box"><input id="yMm" inputMode="decimal" autoComplete="off" aria-labelledby="wMmLbl" aria-invalid={showErr} aria-describedby={showErr ? "yMmErr" : undefined} value={mmRaw} onChange={e => setMm(e.target.value)} placeholder="예: 3.2" /><span>mm</span></span>
            {!mmErr && <span className="nb-wtag">{YARN_KO[weightFromMm(Math.round(mm * 10) / 10)]} 굵기</span>}
            <button type="button" className="nb-link nb-wright" onClick={() => patch({ yarnMode: "level" })}>잘 모르겠습니다</button>
          </div>
        ) : (
          <div className="nb-wrow">
            <Tiles label="실 굵기" value={draft.weight} cols={3} onPick={v => patch({ weight: v as Weight, yarnMode: "level" })} options={(["thin", "medium", "thick"] as Weight[]).map(w => [w, YARN_KO[w]])} />
            <button type="button" className="nb-link nb-wright" onClick={() => { patch({ yarnMode: "mm" }); setMm(mmRaw); }}>mm로 적기</button>
          </div>
        )}
        {showErr && mode === "mm" && <p className="nb-err" id="yMmErr">{mmErr}</p>}
      </div>

      <div className="nb-wg">
        <Head note={extra.length < 5 && <button type="button" className="nb-link" onClick={() => { patch({ moreColors: [...extra, {}] }); toggle("c" + extra.length); }}>+ 색 추가 (실 추가)</button>}>색</Head>
        <div className="nb-dots nb-wdots" role="radiogroup" aria-label="실 색">
          {COLORS.map(([n, hex]) => {
            const on = preset?.[0] === n;
            return <button key={n} type="button" role="radio" aria-checked={on} aria-label={n} title={n} className="nb-dot-color" style={{ background: hex }}
              onClick={() => patch(on ? { color: undefined, colorName: undefined } : { color: hex, colorName: n })} />;
          })}
          <label className={"nb-picker" + (!preset && draft.color ? " is-own" : "")} title="팔레트에서 색 고르기">
            <span className="nb-picker-dot" aria-hidden="true">{!preset && draft.color ? <i style={{ background: draft.color }} /> : <i className="nb-wheel" />}</span>
            <span className="nb-picker-text">{!preset && draft.color ? "직접 고른 색" : "직접 고르기"}</span>
            <input type="color" aria-label="팔레트에서 색 고르기" value={!preset && draft.color ? draft.color : "#F0C1CA"} onChange={e => patch({ color: e.target.value, colorName: undefined })} />
          </label>
        </div>
        {extra.length > 0 && (
          <div className="nb-folds nb-wextra">
            {extra.map((c, i) => (
              <Fold key={i} label={`색 ${i + 2}`} open={open === "c" + i} onToggle={() => toggle("c" + i)}
                value={c.hex || c.name ? <>{c.hex && <i className="nb-swatch" style={{ background: c.hex }} />}{c.name || "직접 고른 색"}</> : ""}>
                <ColorEditor c={c} i={i + 1} onChange={nc => { const m = [...extra]; m[i] = nc; patch({ moreColors: m }); }} />
                <button type="button" className="nb-link nb-color-del" onClick={() => { patch({ moreColors: extra.filter((_, j) => j !== i) }); toggle("c" + i); }}>이 색 빼기</button>
              </Fold>
            ))}
          </div>
        )}
      </div>

      <div className="nb-wg">
        <Head note={<>{!more && <button type="button" className="nb-link" onClick={() => setMore(true)}>더 보기</button>}{!adding && <button type="button" className="nb-link" onClick={() => setAdding(true)}>직접 입력</button>}</>}>재질 <em className="nb-wsoft">여러 개 고를 수 있습니다</em></Head>
        <div className="nb-tiles nb-tiles-4" role="group" aria-label="재질 (여러 개)">
          {listed.map(m => <button key={m} type="button" className="nb-tile" aria-pressed={mats.includes(m)} onClick={() => toggleMat(m)}>{m}</button>)}
          {customMats.map(m => <button key={m} type="button" className="nb-tile" aria-pressed="true" aria-label={`${m} 지우기`} onClick={() => toggleMat(m)}>{m}<small>지우기 ×</small></button>)}
        </div>
        {adding && (
          <div className="nb-wrow nb-wsub">
            <span className="nb-box nb-box-text"><input autoFocus aria-label="재질 직접 입력" maxLength={MAX_TEXT} value={own} onChange={e => setOwn(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); addOwn(); } if (e.key === "Escape") { e.preventDefault(); setAdding(false); } }} /></span>
            <button type="button" className="nb-tile nb-tile-inline" onClick={addOwn}>추가</button>
          </div>
        )}
        {mats.includes("혼방") && (
          <div className="nb-wsub"><label htmlFor="yBlend" className="sr">혼방 비율</label>
            <span className="nb-box nb-box-text"><input id="yBlend" maxLength={MAX_TEXT} placeholder="혼방 비율 (예: 코튼 60 · 아크릴 40)" value={draft.blend ?? ""} onChange={e => patch({ blend: e.target.value })} onBlur={e => patch({ blend: clean(e.target.value) })} /></span></div>
        )}
      </div>

      {/* what the yarn's label says: optional, one folded row */}
      <div className="nb-folds nb-wmore">
        <Fold label="실 라벨 정보 더 적기" value={label || "브랜드 · 색 번호 · LOT · 타래 (선택)"} open={open === "info"} onToggle={() => toggle("info")}>
          <div className="nb-grid2">
            <div className="nb-mini"><label htmlFor="yName">실 이름 / 브랜드</label><input id="yName" className="nb-input nb-input-sm" autoComplete="off" maxLength={MAX_TEXT} placeholder="예: 면 혼방 합사" value={draft.yarn} onChange={e => patch({ yarn: e.target.value })} onBlur={e => patch({ yarn: clean(e.target.value) })} /></div>
            <div className="nb-mini"><label htmlFor="yNo">색 번호</label><input id="yNo" className="nb-input nb-input-sm" autoComplete="off" maxLength={MAX_TEXT} placeholder="예: No. 214" value={draft.colorNo ?? ""} onChange={e => patch({ colorNo: e.target.value })} onBlur={e => patch({ colorNo: clean(e.target.value) })} /></div>
            <div className="nb-mini"><label htmlFor="yLot">LOT 번호</label><input id="yLot" className="nb-input nb-input-sm" autoComplete="off" maxLength={MAX_TEXT} placeholder="예: A2417-03" value={draft.lot ?? ""} onChange={e => patch({ lot: e.target.value })} onBlur={e => patch({ lot: clean(e.target.value) })} /></div>
            {([["skeinG", "한 타래 무게 (g)"], ["skeinM", "한 타래 길이 (m)"], ["skeins", "가지고 있는 타래 수"]] as const).map(([k, l]) => (
              <div key={k} className="nb-mini"><label htmlFor={"y" + k}>{l}</label><input id={"y" + k} className="nb-input nb-input-sm" inputMode="decimal" defaultValue={draft[k] ?? ""} onChange={e => num(k)(e.target.value)} /></div>
            ))}
            <div className="nb-mini"><label htmlFor="yShop">구입처</label><input id="yShop" className="nb-input nb-input-sm" maxLength={MAX_TEXT} value={draft.shop ?? ""} onChange={e => patch({ shop: e.target.value })} onBlur={e => patch({ shop: clean(e.target.value) })} /></div>
          </div>
          <div className="nb-mini"><label htmlFor="yMemo">메모</label><input id="yMemo" className="nb-input nb-input-sm nb-wide" maxLength={MAX_TEXT} value={draft.memo ?? ""} onChange={e => patch({ memo: e.target.value })} onBlur={e => patch({ memo: clean(e.target.value) })} /></div>
          <p className="nb-help">LOT(염색 로트)는 같은 색 실을 더 살 때 필요합니다. 실 라벨에 적혀 있습니다.</p>
        </Fold>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 바늘
const CUSTOM = "own";
/** The hook as tiles (all the usual sizes) + 직접 입력 in mm, and one line on whether it suits the yarn. */
export function WebHook({ draft, patch, tried }: { draft: Draft; patch: Patch; tried: boolean }) {
  const chip = HOOK_CHIPS.find(([k, v]) => k === draft.hook && (!draft.hookMm || draft.hookMm === v));
  const [custom, setCustom] = useState(!chip && !!draft.hook);
  const [raw, setRaw] = useState(!chip && draft.hookMm ? String(draft.hookMm) : "");
  const v = parseNum(raw);
  const err = !custom ? (!draft.hook ? "코바늘 굵기를 골라 주십시오." : "") : !raw.trim() ? "바늘 굵기를 mm로 적어 주십시오." : !Number.isFinite(v) ? "숫자로 적어 주십시오 (예: 1.25)."
    : v < HOOK_MM_RANGE[0] || v > HOOK_MM_RANGE[1] ? `${HOOK_MM_RANGE[0]}~${HOOK_MM_RANGE[1]}mm 사이로 적어 주십시오.` : "";
  const showErr = !!err && (tried || (custom && raw.trim() !== ""));
  const setMm = (s: string) => {
    setRaw(s); const n = parseNum(s);
    if (Number.isFinite(n) && n >= HOOK_MM_RANGE[0] && n <= HOOK_MM_RANGE[1]) { const r = Math.round(n * 100) / 100; patch({ hook: `${r}mm`, hookMm: r }); }
    else patch({ hook: "", hookMm: null });
  };
  const mm = draft.hook ? hookMmOf(draft) : NaN, yarnMm = draft.yarnMode !== "level" ? draft.yarnMm : null;
  const mis = Number.isFinite(mm) ? hookYarnMismatch(mm, yarnMm) : null;
  // the usual sizes that suit this yarn (the same ratio hookYarnMismatch uses)
  const fit = yarnMm ? HOOK_CHIPS.filter(([, m]) => m / yarnMm >= HOOK_YARN_RATIO[0] && m / yarnMm <= HOOK_YARN_RATIO[1] && m >= yarnMm * .85 && m <= yarnMm * 1.35).map(([k]) => k) : [];
  const value = custom ? CUSTOM : chip?.[0] ?? "";
  return (
    <div className="nb-wg">
      <Head note="바늘에 적힌 mm">바늘</Head>
      <Tiles label="코바늘 굵기" value={value} cols={5} onPick={k => {
        if (k === CUSTOM) { setCustom(true); setMm(raw); return; }
        const c = HOOK_CHIPS.find(([n]) => n === k)!; setCustom(false); patch({ hook: c[0], hookMm: c[1] });
      }} options={[...HOOK_CHIPS.map(([k, m]): [string, ReactNode, ReactNode] => [k, k, `${m.toFixed(1)}mm`]), [CUSTOM, "직접", "mm"]]} />
      {custom && (
        <div className="nb-wrow nb-wsub"><label htmlFor="hMm" className="sr">코바늘 굵기 mm</label>
          <span className="nb-box"><input id="hMm" inputMode="decimal" autoComplete="off" autoFocus aria-invalid={showErr} aria-describedby={showErr ? "hErr" : undefined} value={raw} onChange={e => setMm(e.target.value)} placeholder="예: 1.25" /><span>mm</span></span>
        </div>
      )}
      {showErr && <p className="nb-err" id="hErr">{err}</p>}
      {mis ? <p className="nb-wnote is-warn" role="status">{mis === "thin" ? "이 실에는 바늘이 가늡니다. 편물이 빳빳해질 수 있습니다." : "이 실에는 바늘이 굵습니다. 편물이 성글어질 수 있습니다."}</p>
        : fit.length > 0 && <p className="nb-wnote">{`실 ${yarnMm}mm에는 ${fit.length > 1 ? `${fit[0]}~${fit[fit.length - 1]}` : fit[0]}가 잘 맞습니다.`}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- 확인
/** The web's 확인 page: what was picked as short rows, each with 고치기 (back to its spread), the yarn
 *  amount, and the counts as small cards. Fits the page (Kim: the old one ran under the final button). */
export function WebCheck({ draft, itemName, rows, use, facts, measureNote }: {
  draft: Draft; itemName: string;
  rows: { k: string; v: ReactNode; fix: () => void }[];
  use: { g: number; m: number; skeins: number | null; short: boolean; labelOdd: boolean; perColor: boolean; colors: number; per100: number; basis: string; skeinText: string };
  facts: [string, string][]; measureNote: string;
}) {
  return (
    <div className="nb-web nb-wcheck" aria-live="polite">
      <p className="nb-wfor">{[draft.name.trim() || "이름 없는 작품", itemName].join(" · ")}</p>
      <dl className="nb-wsum">
        {rows.map(r => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd><dd className="nb-wfix"><button type="button" className="nb-link" onClick={r.fix}>고치기</button></dd></div>)}
      </dl>
      <div className="nb-sup-use">
        <span className="nb-sup-use-lbl">예상 실 양</span>
        <p className="nb-sup-use-num">약 <b>{use.g}g</b><span className="nb-wlen">길이로는 약 {use.m}m</span></p>
        {use.perColor && <p className="nb-sup-use-sub">색마다 약 {Math.ceil(use.g / Math.max(1, use.colors))}g</p>}
        {use.skeins != null && <p className="nb-sup-use-sub">{use.skeinText}으로 <b>{use.skeins}타래</b>{draft.skeins ? ` · 가지고 있는 ${draft.skeins}타래` : ""}</p>}
        {use.short && <p className="nb-warn" role="status">가지고 있는 실이 조금 모자랄 수 있습니다. 같은 LOT로 한 타래 더 준비해 두십시오.</p>}
        {use.labelOdd && <p className="nb-warn" role="status">적어 주신 라벨 정보({draft.skeinG}g · {draft.skeinM}m)는 실 한 타래로 보기 어려워서 빼고 계산했습니다.</p>}
        <p className="nb-help">여유 10%를 넣은 어림값입니다 ({use.basis} 기준 100g에 약 {use.per100}m).{use.basis !== "실 라벨" ? " 실 라벨의 무게와 길이를 적으면 타래 수도 알려 드립니다." : ""}</p>
      </div>
      <div className="nb-wfacts">{facts.map(([k, v]) => <div key={k}><span>{k}</span>{v}</div>)}</div>
      <p className="nb-help">{measureNote}</p>
    </div>
  );
}
