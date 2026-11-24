"use client";
// The web's 3D book, step 3, right pages (Kim: the old pages were hard to read and ran off the bottom).
// One question per spread, the main choices open (no folded rows for them), square tiles instead of pill
// chips, numbers in boxes:
//   실          - thickness, colour (dots), material (tiles: the 3D shows it at once); the label details
//                 (brand, colour no., LOT, skeins, shop, memo) in one folded row at the bottom
//   바늘과 크기  - the hook as tiles (+ 직접 입력) with a line on whether it suits the yarn; shape, size
//   가방 모양    - body, flap, handle as tiles (bags only; NewBook.tsx builds it)
//   무늬         - a knitted item's stitch pattern as chart tiles (WebStitch)
// Phones keep YarnStep.tsx's pages as they are.
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Draft, YarnColor } from "@/lib/types";
import { ColorStudio } from "./ColorStudio";
import { CROCHET, YARN_KO, type CrochetStitch, type Weight } from "@/lib/pattern";
import { clean, HOOK_CHIPS, HOOK_MM_RANGE, HOOK_YARN_RATIO, hookMmOf, hookYarnMismatch, MATERIALS_WEB, MAX_TEXT, parseNum, weightFromMm, YARN_MM_RANGE } from "@/lib/yarn";
import { KNIT_STITCHES, stitchOf, type KnitStitch } from "@/lib/knit";
import { familiesOf, PATTERN_BY_ID, STITCH_PATTERNS, type StitchPattern } from "@/lib/stitchPatterns";
import { CHART_MULT, CHART_ROWS, type Chart, type ChartKey } from "@/lib/crochetChart";
import { chartFromSteps } from "@/lib/stitchGrammar";
import { chartFor } from "@/lib/stitchCharts";
import { GROUPS, ITEM, ITEMS, type Item, type ItemId } from "@/lib/items";
import { Fold, useOneOpen } from "./Fold";
import { ItemArt } from "./ItemArt";
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

// ---------------------------------------------------------------- 무엇을 뜰지 (Kim: like Photoshop's new-document
// window - kinds as tabs, every preset as a tile with its usual size, the picked one's details under them)
/** an item's usual size in a few characters, for its tile */
export function sizeHint(i: Item): string {
  const d = i.defaults;
  if (i.id === "beanie") return `머리 ${d.circ}cm`;
  if (i.kind === "tube") return `둘레 ${d.a}cm`;
  if (i.kind === "flat-rows") return `${d.a} × ${d.b}cm`;
  if (d.shape === "circle") return `지름 ${d.a}cm`;
  return i.kind === "base-body" ? `${d.a} × ${d.h}cm` : `${d.a} × ${d.b}cm`;
}
/** `hint`: shown under the tiles while nothing is picked; `extra`: one more tile at the end (직접 그리기) */
export function WebItems({ value, onPick, tried, hint, extra }: { value: ItemId | ""; onPick: (id: ItemId) => void; tried: boolean; hint?: ReactNode; extra?: ReactNode }) {
  const [tab, setTab] = useState<string>("전체");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = ITEMS.filter(i => tab === "전체" || i.group === tab), idx = Math.max(0, list.findIndex(i => i.id === value));
  const key = (e: KeyboardEvent, k: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? 5 : e.key === "ArrowUp" ? -5 : 0;
    if (!d) return;
    e.preventDefault(); const j = Math.min(list.length - 1, Math.max(0, k + d)); onPick(list[j].id); refs.current[j]?.focus();
  };
  const it = value ? ITEM[value] : null;
  return (
    <div className="nb-web nb-pick">
      <div className="nb-tabs" role="tablist" aria-label="종류">
        {["전체", ...GROUPS].map(g => <button key={g} type="button" role="tab" aria-selected={tab === g} onClick={() => setTab(g)}>{g}</button>)}
      </div>
      {tried && !it && <p className="nb-err" role="alert">뜨고 싶은 것을 하나 골라 주십시오.</p>}
      <div className="nb-pre" role="radiogroup" aria-label="뜰 것">
        {list.map((i, k) => (
          <button key={i.id} ref={el => { refs.current[k] = el; }} type="button" role="radio" aria-checked={i.id === value} tabIndex={k === idx ? 0 : -1} className="nb-pre-t" onClick={() => onPick(i.id)} onKeyDown={e => key(e, k)}>
            <ItemArt id={i.id} tile />
            <span>{i.name}{i.beta && <em className="nb-beta">베타</em>}</span>
            <small>{sizeHint(i)}</small>
          </button>
        ))}
        {tab === "전체" && extra}
      </div>
      <div className="nb-det" aria-live="polite">
        {it ? (
          <>
            <h3>{it.name}<small>{it.group}</small></h3>
            <p>{it.desc}</p>
            <dl><div><dt>난이도</dt><dd>{it.level}</dd></div><div><dt>시간</dt><dd>{it.time}</dd></div><div><dt>순서</dt><dd>{it.method}</dd></div></dl>
            {it.note && <p className="nb-help">{it.note}</p>}
          </>
        ) : <>{hint}<p className="nb-help">칸에 적힌 크기는 흔히 뜨는 값입니다. 다음 장에서 바꿀 수 있습니다.</p></>}
      </div>
    </div>
  );
}

// the materials shown at once (the rest under 더 보기); the 3D draws each of them its own way
const WEB_MATERIALS = ["코튼", "울", "알파카", "모헤어", "앙고라", "수면사", "벨벳(셔닐)", "부클레", "페이크퍼", "수세미실", "리넨", "실크", "라피아", "패브릭얀", "코드사", "메탈릭"];

/** One slider with its name and value (털 양, 털 길이, 굵기): the 3D follows while it is dragged. */
export function Slide({ label, min, max, step, value, onChange, text }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; text: string }) {
  // 직접 입력 (Kim): the value beside the slider is pressed and typed; Enter or leaving it sets it (kept within the
  // slider's range, on its steps); Esc leaves it as it was
  const [ed, setEd] = useState<string | null>(null);
  const commit = () => {
    if (ed == null) return; const v = parseNum(ed); setEd(null);
    if (!Number.isFinite(v)) return;
    const k = Math.round((Math.min(max, Math.max(min, v)) - min) / step) * step + min;
    onChange(Math.round(k * 1000) / 1000);
  };
  return (
    <div className="nb-slide">
      <span>{label}</span>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
      <output>{ed != null
        ? <input className="nb-slide-v" autoFocus inputMode="decimal" aria-label={`${label} 직접 입력`} value={ed} onChange={e => setEd(e.target.value)} onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); commit(); } if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setEd(null); } }} />
        : <button type="button" className="nb-slide-b" title="눌러서 직접 입력" onClick={() => setEd(String(value))}>{text}</button>}</output>
    </div>
  );
}
/** 털 양 / 털 길이 (Kim: turned while looking): only how the 3D draws the yarn, the pattern's counts stay. */
function HairSliders({ draft, patch }: { draft: Draft; patch: Patch }) {
  const f = draft.fuzzK ?? 1, h = draft.hairK ?? 1;
  return (
    <div className="nb-sliders">
      <Slide label="털 양" min={0} max={8} step={0.1} value={f} onChange={v => patch({ fuzzK: v })} text={f === 0 ? "없음" : `${Math.round(f * 100)}%`} />
      <Slide label="털 길이" min={0.3} max={6} step={0.1} value={h} onChange={v => patch({ hairK: v })} text={`${Math.round(h * 100)}%`} />
    </div>
  );
}

// ---------------------------------------------------------------- the work screen's 실 panel (크게 보기)
/** The yarn in the 3D work screen's narrow column: thickness, colour, material - the same values as the
 *  book's 실 page (a thickness that is not a valid number yet leaves the last one in place). */
export function PanelYarn({ draft, patch }: { draft: Draft; patch: Patch }) {
  const [mmRaw, setMmRaw] = useState(draft.yarnMm != null ? String(draft.yarnMm) : "");
  const good = (v: number) => Number.isFinite(v) && v >= YARN_MM_RANGE[0] && v <= YARN_MM_RANGE[1];
  const mm = parseNum(mmRaw);
  const setMm = (raw: string) => { setMmRaw(raw); const v = parseNum(raw); if (good(v)) { const r = Math.round(v * 10) / 10; patch({ yarnMm: r, weight: weightFromMm(r), yarnMode: "mm" }); } };
  const mats = draft.materials ?? [];
  const toggleMat = (m: string) => patch({ materials: mats.includes(m) ? mats.filter(x => x !== m) : [...mats, m] });
  const preset = draft.color ? COLORS.find(([n, hex]) => hex === draft.color && n === draft.colorName) : undefined;
  return (
    <div className="nb-web">
      <div className="nb-wg">
        <Head>굵기</Head>
        <div className="nb-wrow">
          <span className="nb-box"><input inputMode="decimal" autoComplete="off" aria-label="실 굵기 (mm)" aria-invalid={mmRaw.trim() !== "" && !good(mm)} value={mmRaw} onChange={e => setMm(e.target.value)} placeholder="예: 3.2" /><span>mm</span></span>
          {good(mm) && <span className="nb-wtag">{YARN_KO[weightFromMm(Math.round(mm * 10) / 10)]} 굵기</span>}
        </div>
        <Slide label="굵기" min={1} max={10} step={0.5} value={good(mm) ? mm : 3} onChange={v => setMm(String(v))} text={good(mm) ? `${mm}mm` : "—"} />
      </div>
      <div className="nb-wg">
        <Head>색</Head>
        <div className="nb-dots nb-wdots" role="radiogroup" aria-label="실 색">
          {COLORS.map(([n, hex]) => {
            const on = preset?.[0] === n;
            return <button key={n} type="button" role="radio" aria-checked={on} aria-label={n} title={n} className="nb-dot-color" style={{ background: hex }}
              onClick={() => patch(on ? { color: undefined, colorName: undefined } : { color: hex, colorName: n })} />;
          })}
          <label className={"nb-picker" + (!preset && draft.color ? " is-own" : "")} title="팔레트에서 색 고르기">
            <span className="nb-picker-dot" aria-hidden="true">{!preset && draft.color ? <i style={{ background: draft.color }} /> : <i className="nb-wheel" />}</span>
            <input type="color" aria-label="팔레트에서 색 고르기" value={!preset && draft.color ? draft.color : "#F0C1CA"} onChange={e => patch({ color: e.target.value, colorName: undefined })} />
          </label>
        </div>
      </div>
      <div className="nb-wg">
        <Head>재질</Head>
        <div className="nb-tiles nb-tiles-3" role="group" aria-label="재질 (여러 개)">
          {WEB_MATERIALS.map(m => <button key={m} type="button" className="nb-tile" aria-pressed={mats.includes(m)} onClick={() => toggleMat(m)}>{m === "벨벳(셔닐)" ? "셔닐" : m}</button>)}
        </div>
        <HairSliders draft={draft} patch={patch} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 실
/** `noColor`: the work screen has its own 색 section (ColorStudio), so the colour row is left out there */
export function WebYarn({ draft, patch, tried, noColor, sub, soft }: { draft: Draft; patch: Patch; tried: boolean; noColor?: boolean; sub?: boolean; soft?: ReactNode }) {
  const [open, toggle] = useOneOpen();
  const [mmRaw, setMmRaw] = useState(draft.yarnMm != null ? String(draft.yarnMm) : "");
  const [more, setMore] = useState(false), [adding, setAdding] = useState(false), [own, setOwn] = useState("");
  const mode = draft.yarnMode ?? (draft.yarnMm ? "mm" : "level");
  const mm = parseNum(mmRaw);
  const mmErr = !mmRaw.trim() ? "실 굵기를 적거나 '알 수 없음'을 눌러 주십시오." : !Number.isFinite(mm) ? "숫자로 적어 주십시오 (예: 3.2)."
    : mm < YARN_MM_RANGE[0] || mm > YARN_MM_RANGE[1] ? `${YARN_MM_RANGE[0]}~${YARN_MM_RANGE[1]}mm 사이로 적어 주십시오.` : "";
  const showErr = !!mmErr && (tried || mmRaw.trim() !== "");
  const setMm = (raw: string) => {
    setMmRaw(raw); const v = parseNum(raw);
    if (Number.isFinite(v) && v >= YARN_MM_RANGE[0] && v <= YARN_MM_RANGE[1]) { const r = Math.round(v * 10) / 10; patch({ yarnMm: r, weight: weightFromMm(r), yarnMode: "mm" }); }
    else patch({ yarnMm: null, yarnMode: "mm" });
  };
  const mats = draft.materials ?? [];
  // 수세미실 is 1mm thin as a rule (Kim): picked, the thickness becomes 1mm
  const toggleMat = (m: string) => {
    const on = !mats.includes(m);
    if (m === "수세미실" && on) { setMmRaw("1"); patch({ materials: [...mats, m], yarnMm: 1, weight: weightFromMm(1), yarnMode: "mm" }); return; }
    patch({ materials: on ? [...mats, m] : mats.filter(x => x !== m), ...(m === "혼방" && !on ? { blend: "" } : {}) });
  };
  const listed = more ? MATERIALS_WEB : WEB_MATERIALS, customMats = mats.filter(m => !MATERIALS_WEB.includes(m));
  const addOwn = () => { const c = clean(own); if (c && !mats.includes(c)) patch({ materials: [...mats, c] }); setOwn(""); setAdding(false); };
  const preset = draft.color ? COLORS.find(([n, hex]) => hex === draft.color && n === draft.colorName) : undefined;
  const extra = draft.moreColors ?? [];

  return (
    <div className="nb-web">
      <div className="nb-wg">
        <Head id="wMmLbl" note="실 라벨에 적힌 mm">굵기</Head>
        {mode === "mm" ? (
          <div className="nb-wrow">
            <span className="nb-box"><input id="yMm" inputMode="decimal" autoComplete="off" aria-labelledby="wMmLbl" aria-invalid={showErr} aria-describedby={showErr ? "yMmErr" : undefined} value={mmRaw} onChange={e => setMm(e.target.value)} placeholder="예: 3.2" /><span>mm</span></span>
            <label className="nb-slide nb-slide-in"><span className="sr">굵기 조절</span><input type="range" min={1} max={10} step={0.1} value={!mmErr ? mm : 3} onChange={e => setMm(e.target.value)} /></label>
            {!mmErr && <span className="nb-wtag">{YARN_KO[weightFromMm(Math.round(mm * 10) / 10)]} 굵기</span>}
            {/* 알 수 없음 (Kim): then only 가는 실 / 보통 / 굵은 실 to pick */}
            <button type="button" className="nb-link nb-wright" onClick={() => patch({ yarnMode: "level" })}>알 수 없음</button>
          </div>
        ) : (
          <div className="nb-wrow">
            <Tiles label="실 굵기" value={draft.weight} cols={3} onPick={v => patch({ weight: v as Weight, yarnMode: "level" })} options={(["thin", "medium", "thick"] as Weight[]).map(w => [w, YARN_KO[w]])} />
            <button type="button" className="nb-link nb-wright" onClick={() => { patch({ yarnMode: "mm" }); setMm(mmRaw); }}>mm로 적기</button>
          </div>
        )}
        {showErr && mode === "mm" && <p className="nb-err" id="yMmErr">{mmErr}</p>}
      </div>

      {!noColor && <div className="nb-wg">
        <Head note={extra.length < 5 && <button type="button" className="nb-link" onClick={() => { patch({ moreColors: [...extra, {}] }); toggle("c" + extra.length); }}>+ 색 추가 (실 추가)</button>}>색</Head>
        <div className="nb-dots nb-wdots" role="radiogroup" aria-label="실 색">
          {COLORS.map(([n, hex]) => {
            const on = preset?.[0] === n;
            return <button key={n} type="button" role="radio" aria-checked={on} aria-label={n} title={n} className="nb-dot-color" style={{ background: hex }}
              onClick={() => patch(on ? { color: undefined, colorName: undefined } : { color: hex, colorName: n })} />;
          })}
          <label className={"nb-picker" + (!preset && draft.color ? " is-own" : "")} title="팔레트에서 색 고르기">
            <span className="nb-picker-dot" aria-hidden="true">{!preset && draft.color ? <i style={{ background: draft.color }} /> : <i className="nb-wheel" />}</span>
            <span className="nb-picker-text">{!preset && draft.color ? `직접 고른 색 ${draft.color.toUpperCase()}` : "직접 고르기"}</span>
            <input type="color" aria-label="팔레트에서 색 고르기" value={!preset && draft.color ? draft.color : "#F0C1CA"} onChange={e => patch({ color: e.target.value, colorName: undefined })} />
          </label>
        </div>
        {extra.length > 0 && (
          <div className="nb-folds nb-wextra">
            {extra.map((c, i) => (
              <Fold key={i} label={`색 ${i + 2}`} open={open === "c" + i} onToggle={() => toggle("c" + i)}
                value={c.hex || c.name ? <>{c.hex && <i className="nb-swatch" style={{ background: c.hex }} />}{c.name || (c.hex ? `직접 고른 색 ${c.hex.toUpperCase()}` : "직접 고른 색")}</> : ""}>
                <ColorEditor c={c} i={i + 1} onChange={nc => { const m = [...extra]; m[i] = nc; patch({ moreColors: m }); }} />
                <button type="button" className="nb-link nb-color-del" onClick={() => { patch({ moreColors: extra.filter((_, j) => j !== i) }); toggle("c" + i); }}>이 색 빼기</button>
              </Fold>
            ))}
          </div>
        )}
      </div>}

      <div className="nb-wg">
        <Head note={<><button type="button" className="nb-link" disabled={!mats.length} onClick={() => patch({ materials: [], blend: "" })}>초기화</button><button type="button" className="nb-link" onClick={() => setMore(m => !m)}>{more ? "접기" : "더 보기"}</button>{!adding && <button type="button" className="nb-link" onClick={() => setAdding(true)}>직접 입력</button>}</>}>재질 <em className="nb-wsoft">여러 개 고를 수 있습니다</em></Head>
        <div className={"nb-matbox" + (more ? "" : " is-short")}>
          <div className="nb-tiles nb-tiles-4" role="group" aria-label="재질 (여러 개)">
            {listed.map(m => <button key={m} type="button" className="nb-tile" aria-pressed={mats.includes(m)} onClick={() => toggleMat(m)}>{m}</button>)}
            {customMats.map(m => <button key={m} type="button" className="nb-tile" aria-pressed="true" aria-label={`${m} 지우기`} onClick={() => toggleMat(m)}>{m}<small>지우기 ×</small></button>)}
          </div>
          {!more && <button type="button" className="nb-matmore" aria-label="재질 더 보기" onClick={() => setMore(true)} />}
        </div>
        {/* 기타 조절 (Kim): 탄성 체크 first, then the hairs */}
        <p className="nb-wsubhead nb-etc">기타 조절</p>
        {soft}
        <HairSliders draft={draft} patch={patch} />
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

      <LabelInfo draft={draft} patch={patch} />

      {/* 실 추가 (Kim: 갈색 울 + 흰색 앙고라): another yarn, set just as the main one - colour, thickness, material,
          its hairs, its label - and held together with it (합사) or worked on its own for colourwork (배색) */}
      {noColor && !sub && <div className="nb-wg xy">
        {extra.map((c, i) => {
          const set = (nc: Partial<YarnColor>) => { const m = [...extra]; m[i] = { ...c, ...nc }; patch({ moreColors: m }); };
          // this yarn as a draft, so the main yarn's own parts take it as they are
          const asDraft: Draft = { ...draft, color: c.hex, colorName: c.name, colorNo: c.no, lot: c.lot, yarnMm: c.yarnMm ?? null, yarnMode: c.yarnMode ?? "mm", weight: c.weight ?? draft.weight,
            materials: c.materials ?? (c.material ? [c.material] : []), blend: c.blend ?? "", fuzzK: c.fuzzK, hairK: c.hairK, yarn: c.yarn ?? "", skeinG: c.skeinG ?? null, skeinM: c.skeinM ?? null, skeins: c.skeins ?? null, moreColors: [] };
          const back = (p: Partial<Draft>) => {
            const o: Partial<YarnColor> = {};
            if ("color" in p) o.hex = p.color; if ("colorName" in p) o.name = p.colorName; if ("colorNo" in p) o.no = p.colorNo; if ("lot" in p) o.lot = p.lot;
            for (const k of ["yarnMm", "yarnMode", "weight", "materials", "blend", "fuzzK", "hairK", "yarn", "skeinG", "skeinM", "skeins"] as const) if (k in p) (o as Record<string, unknown>)[k] = p[k];
            if (o.materials) o.material = o.materials[o.materials.length - 1];
            set(o);
          };
          return (
            <section key={i} className="xy-card" aria-label={`실 ${i + 2}`}>
              <div className="xy-head"><b>실 {i + 2}</b>{c.hex && <i className="nb-swatch" style={{ background: c.hex }} />}<span>{[asDraft.materials?.join(" · "), c.held ? "합사" : "배색"].filter(Boolean).join(" · ")}</span>
                <button type="button" className="nb-link nb-exdel" onClick={() => patch({ moreColors: extra.filter((_, j) => j !== i) })}>이 실 빼기</button></div>
              <Tiles label="쓰는 방법" value={c.held ? "held" : "own"} cols={2} onPick={v => set({ held: v === "held" })}
                options={[["held", "합사", "본 실과 같이 뜨기"], ["own", "배색", "따로 바꿔 뜨기"]]} />
              <p className="nb-wsubhead">색</p>
              <ColorStudio draft={asDraft} patch={back} />
              <WebYarn key={"xy" + i} draft={asDraft} patch={back} tried={false} noColor sub />
            </section>
          );
        })}
        {extra.length < 4 && <button type="button" className="xy-add" onClick={() => patch({ moreColors: [...extra, { held: true }] })}><span aria-hidden="true">+</span>실 추가<small>다른 실과 합사하거나 배색할 때</small></button>}
      </div>}

      {/* 내 실 사진 is left out for now (Kim) */}
    </div>
  );
}

/** what the yarn's label says (Kim: where to write it must be plain to see, and before 실 추가): its own card, the
 *  boxes in view, every one optional */
function LabelInfo({ draft, patch }: { draft: Draft; patch: Patch }) {
  const num = (k: "skeinG" | "skeinM" | "skeins") => (raw: string) => { const v = parseNum(raw); patch({ [k]: Number.isFinite(v) ? v : null } as Partial<Draft>); };
  // a toggle, closed at first (Kim): only its name and what is written so far, until opened
  const [open, setOpen] = useState(false);
  const sum = [draft.yarn, draft.colorNo, draft.lot ? `LOT ${draft.lot}` : "", draft.skeins ? `${draft.skeins}타래` : ""].filter(Boolean).join(" · ");
  return (
      <div className={"nb-wg nb-labelbox" + (open ? " is-open" : "")}>
        <button type="button" className="nb-labeltoggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          <i aria-hidden="true">{open ? "▾" : "▸"}</i><b>실 라벨 정보</b><small>{sum || "선택 · 적으면 실 양과 타래 수가 정확해집니다"}</small></button>
        {open && <>
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
        </>}
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
      {/* Kim: say that the yarn against the hook decides how close the fabric is */}
      <p className="nb-help nb-ratio">편물이 얼마나 촘촘한지는 실 굵기와 바늘 굵기의 비율로 정해집니다. 실보다 바늘이 가늘수록 촘촘하고 단단해지고, 굵을수록 성글고 부드러워집니다.{Number.isFinite(mm) && yarnMm ? ` 지금은 바늘이 실의 ${(mm / yarnMm).toFixed(1)}배입니다.` : ""}</p>
    </div>
  );
}

// ---------------------------------------------------------------- 확인
/** The web's 확인 page: what was picked as short rows, each with 고치기 (back to its spread), the yarn
 *  amount, and the counts as small cards. Fits the page (Kim: the old one ran under the final button). */
export function WebCheck({ draft, itemName, rows, use, facts, measureNote, onName, soft }: {
  draft: Draft; itemName: string; onName?: (v: string) => void; soft?: ReactNode;
  rows: { k: string; v: ReactNode; fix: () => void }[];
  use: { g: number; m: number; skeins: number | null; short: boolean; labelOdd: boolean; perColor: boolean; colors: number; per100: number; basis: string; skeinText: string };
  facts: [string, string][]; measureNote: string;
}) {
  return (
    <div className="nb-web nb-wcheck" aria-live="polite">
      {onName
        ? <label className="nb-wname"><span>작품 이름</span><input value={draft.name} maxLength={40} placeholder="이름을 지어 주십시오 (비우면 자동으로)" autoComplete="off" spellCheck={false} onChange={e => onName(e.target.value)} /><small>{itemName}</small></label>
        : <p className="nb-wfor">{[draft.name.trim() || "이름 없는 작품", itemName].join(" · ")}</p>}
      <dl className="nb-wsum">
        {rows.map(r => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd><dd className="nb-wfix"><button type="button" className="nb-link" onClick={r.fix}>고치기</button></dd></div>)}
      </dl>
      <div className="nb-wfacts">{facts.map(([k, v]) => <div key={k}><span>{k}</span>{v}</div>)}</div>
      {/* 탄성 (Kim): compared and changed here too, before it is made - the 3D on the left page follows */}
      {soft}
      <p className="nb-help">{measureNote}</p>
    </div>
  );
}

// ---------------------------------------------------------------- 무늬 (knitted items)
/** A stitch pattern as knitters chart it, seen from the right side: an empty square = knit, a dash on
 *  dusty rose = purl (the same chart the 3D reads). */
export function StitchChart({ s, cells = 8 }: { s: KnitStitch; cells?: number }) {
  const c = 100 / cells, purl: ReactNode[] = [];
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) if (s.f(j, i) < 0) {
    const x = (cells - 1 - i) * c, y = (cells - 1 - j) * c; // stitch 0 is the right-hand column, row 0 the bottom
    purl.push(<g key={j + "-" + i}><rect x={x} y={y} width={c} height={c} fill="#F3DCDB" /><rect x={x + c * .22} y={y + c * .44} width={c * .56} height={c * .12} fill="#6E5350" /></g>);
  }
  const lines: string[] = []; for (let t = 0; t <= cells; t++) lines.push(`M${t * c} 0V100M0 ${t * c}H100`);
  return (
    <svg className="nb-chart" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" fill="#FFFDF8" />{purl}<path d={lines.join("")} stroke="#CDBFB4" strokeWidth=".6" fill="none" />
    </svg>
  );
}

/** A crochet stitch as a small chart in the usual symbols, four stitches over three rows: 짧은뜨기 an X,
 *  이랑뜨기 the X with the arc under it (back loop only), 긴뜨기 a T, 한길긴뜨기 a T crossed once - each row as tall
 *  as the stitch makes it, so the tiles also show how fast each grows. */
export function CrochetChart({ k }: { k: CrochetStitch }) {
  const h = 22 * CROCHET[k].h, rows = Math.max(2, Math.min(4, Math.floor(96 / h))), top = 100 - rows * h, sym: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < 4; i++) {
    const cx = 14 + i * 24, y1 = 100 - r * h - 4, y0 = y1 - h + 8, m = (y0 + y1) / 2, key = r + "-" + i;
    if (k === "sc" || k === "blo") sym.push(<g key={key}><path d={`M${cx - 6} ${m - 6}L${cx + 6} ${m + 6}M${cx + 6} ${m - 6}L${cx - 6} ${m + 6}`} />{k === "blo" && <path d={`M${cx - 6} ${y1 + 1}Q${cx} ${y1 + 5} ${cx + 6} ${y1 + 1}`} />}</g>);
    else sym.push(<g key={key}><path d={`M${cx - 7} ${y0}H${cx + 7}M${cx} ${y0}V${y1}`} />{k === "dc" && <path d={`M${cx - 5} ${m + 3}L${cx + 5} ${m - 3}`} />}</g>);
  }
  return (
    <svg className="nb-chart" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" fill="#FFFDF8" />
      {Array.from({ length: rows + 1 }, (_, r) => <path key={r} d={`M0 ${100 - r * h}H100`} stroke="#E4D8CC" strokeWidth=".8" />)}
      {top > 0 && <rect width="100" height={top} fill="#F6F0E6" />}
      <g stroke="#6E5350" strokeWidth="2" fill="none" strokeLinecap="round">{sym}</g>
    </svg>
  );
}
/** A named pattern's chart (lib/stitchCharts) as a small drawing of the fabric for its tile: each stitch a
 *  stroke of yarn from where it is worked into up to its head, knit stitches as Vs, purls as bumps, chains and
 *  holes as rings, bobbles as filled ovals; the other colours as they fall; a square from the middle. */
const YARN_INK = ["#9C6F69", "#E2C49A", "#5E4744"];
export function ChartPicture({ name }: { name: string }) {
  const c = useMemo<Chart | null>(() => chartFor(name), [name]);
  if (!c) return null;
  if (c.st.length && c.st.every(t => t.g) && c.st.some(t => t.type === "k" || t.type === "p")) return <KnitChartPicture c={c} />;
  const S = Math.min(c.W, Math.max(c.H, 6)) * .9, x0 = (c.W - S) / 2 - .5, y0 = Math.max(0, (c.H - S) / 2), Y = (y: number) => y0 + S - y + y0;
  const ink = (k?: number) => YARN_INK[Math.max(0, Math.min(2, k ?? 0))], parts: ReactNode[] = [];
  c.ch.forEach((q, i) => parts.push(<ellipse key={"c" + i} cx={q[0]} cy={Y(q[1])} rx={.36} ry={.2} fill="none" stroke={ink(q[2])} strokeWidth={.16} />));
  c.st.forEach((t, i) => {
    const [bx, by] = t.b, [tx, ty] = t.t, col = ink(t.c), w = (t.z ?? 0) > .2 ? .4 : .3, k = "s" + i;
    if (t.type === "k") parts.push(<path key={k} d={`M${tx - .38} ${Y(ty)}L${bx} ${Y(by + .05)}L${tx + .38} ${Y(ty)}`} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />);
    else if (t.type === "p") parts.push(<path key={k} d={`M${bx - .42} ${Y(by + .4)}Q${bx} ${Y(by + .62)} ${bx + .42} ${Y(by + .4)}`} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" />);
    else if (t.type === "yo" || t.type === "picot") parts.push(<circle key={k} cx={tx} cy={Y((by + ty) / 2)} r={.26} fill="none" stroke={col} strokeWidth={.14} />);
    else if (t.type === "bob" || t.type === "pop" || t.type === "puff") parts.push(<ellipse key={k} cx={(bx + tx) / 2} cy={Y((by + ty) / 2)} rx={.5} ry={(ty - by) * .42} fill={col} />);
    else parts.push(<g key={k}><path d={`M${bx} ${Y(by)}L${tx} ${Y(ty - .15)}`} stroke={col} strokeWidth={w} strokeLinecap="round" />{t.type !== "bar" && t.type !== "loop" && <ellipse cx={tx} cy={Y(ty)} rx={.42} ry={.16} fill="none" stroke={col} strokeWidth={.15} />}</g>);
  });
  return (
    <svg className="nb-chart" viewBox={`${x0} ${y0} ${S} ${S}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x={x0} y={y0} width={S} height={S} fill="#FFFDF8" />{parts}
    </svg>
  );
}

/** A knitted pattern's chart the way knitters read it (like StitchChart): a square per stitch, seen from the
 *  right side, the bottom row first - an empty square a knit, a dash a purl, a ring a yarn over, a slash a
 *  stitch leaning (a cable's crossing, bold when it goes in front), a dot a bobble, grey where nothing is
 *  worked; the other colours as fills. Ten stitches by ten rows from the bottom corner. */
function KnitChartPicture({ c }: { c: Chart }) {
  const N = 10, s = 100 / N, cells: ReactNode[] = [], seen = new Set<string>();
  const FILL = ["#FFFDF8", "#EBD3AE", "#6E5350"];
  c.st.forEach((t, n) => {
    const [i, j] = t.g!; if (i >= N || j >= N || seen.has(i + "," + j)) return; seen.add(i + "," + j);
    const x = (N - 1 - i) * s, y = (N - 1 - j) * s, col = t.c ?? 0, ink = col === 2 ? "#FFFDF8" : "#6E5350", dx = t.t[0] - t.b[0], k = "k" + n;
    const mark = t.type === "p" ? <rect x={x + s * .22} y={y + s * .44} width={s * .56} height={s * .12} fill={ink} />
      : t.type === "yo" ? <circle cx={x + s / 2} cy={y + s / 2} r={s * .26} fill="none" stroke={ink} strokeWidth={1.2} />
      : t.type === "bob" || t.type === "pop" || t.type === "puff" ? <circle cx={x + s / 2} cy={y + s / 2} r={s * .3} fill={ink} />
      : t.type === "cl" ? <path d={`M${x + s * .2} ${y + s * .78}L${x + s / 2} ${y + s * .22}L${x + s * .8} ${y + s * .78}`} fill="none" stroke={ink} strokeWidth={1.3} />
      : t.type === "loop" ? <path d={`M${x + s * .25} ${y + s * .3}Q${x + s / 2} ${y + s * 1.05} ${x + s * .75} ${y + s * .3}`} fill="none" stroke={ink} strokeWidth={1.2} />
      : Math.abs(dx) > .2 ? <path d={dx > 0 ? `M${x + s * .85} ${y + s * .15}L${x + s * .15} ${y + s * .85}` : `M${x + s * .15} ${y + s * .15}L${x + s * .85} ${y + s * .85}`} stroke={ink} strokeWidth={(t.z ?? 0) > .3 ? 2.4 : 1.2} strokeLinecap="round" />
      : null;
    cells.push(<g key={k}><rect x={x} y={y} width={s} height={s} fill={FILL[Math.min(2, col)]} />{mark}</g>);
  });
  const lines: string[] = []; for (let q = 0; q <= N; q++) lines.push(`M${q * s} 0V100M0 ${q * s}H100`);
  return (
    <svg className="nb-chart" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" fill="#E8DFD3" />{cells}<path d={lines.join("")} stroke="#CDBFB4" strokeWidth=".6" fill="none" />
    </svg>
  );
}

/** 무늬 by the needle (Kim: 메리야스뜨기, 부채모양뜨기 - the named patterns, by the needle): the needle as a joined
 *  choice, the needle's families as tabs, every named pattern of the family as a tile - a picture where the 3D
 *  draws it, its name alone where it does not yet - and under them how the picked one is worked. Picking one
 *  sets what the 3D and the pattern use (Draft.stitch for knitting, crochetStitch / crochetChart for crochet). */
export function WebStitchByNeedle({ draft, patch, n, craft, flatOnly }: { draft: Draft; patch: Patch; n: number; craft: "crochet" | "knit"; flatOnly?: boolean }) {
  const fams = familiesOf(craft);
  const cur = (draft.pattern && PATTERN_BY_ID[draft.pattern]?.needle === craft ? PATTERN_BY_ID[draft.pattern] : null)
    ?? STITCH_PATTERNS.find(p => p.needle === craft && p.draw === (craft === "knit" ? "kn:" + (draft.stitch ?? "stock") : draft.crochetChart ? "ch:" + draft.crochetChart : "st:" + (draft.crochetStitch ?? "sc")))!;
  const [tab, setTab] = useState<string>(cur?.fam ?? fams[0]);
  const fam = fams.includes(tab) ? tab : fams[0], list = STITCH_PATTERNS.filter(p => p.needle === craft && p.fam === fam);
  const pick = (p: StitchPattern) => {
    const [k, v] = (p.draw ?? ":").split(":");
    if (craft === "knit") patch({ pattern: p.id, ...(k === "kn" ? { stitch: v } : k === "cc" ? { stitch: undefined } : {}) });
    else patch({ pattern: p.id, ...(k === "st" ? { crochetStitch: v === "sc" ? undefined : v as CrochetStitch, crochetChart: undefined } : k === "ch" ? { crochetChart: v as ChartKey, crochetStitch: undefined } : k === "cc" ? { crochetChart: undefined, crochetStitch: undefined } : {}) });
  };
  const pic = (p: StitchPattern) => {
    const [k, v] = (p.draw ?? ":").split(":");
    if (k === "kn") return <StitchChart s={stitchOf(v)} />;
    if (k === "st") return <CrochetChart k={v as CrochetStitch} />;
    if (k === "ch") return <img className="nb-chart" src={`/stitches/${v}.webp`} alt="" width={120} height={120} />;
    if (k === "cc") return <ChartPicture name={v} />;
    return null;
  };
  const [ck, cv] = (cur?.draw ?? ":").split(":");
  const knitNow = ck === "kn" ? stitchOf(cv) : null, left = knitNow && knitNow.mult > 1 ? n % knitNow.mult : 0;
  return (
    <div className="nb-web">
      <div className="nb-wg">
        <div className="nb-needle" role="radiogroup" aria-label="바늘">
          {([["crochet", "코바늘"], ["knit", "대바늘"]] as const).map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={craft === k} onClick={() => patch({ craft: k })}>{t}</button>)}
        </div>
        {flatOnly && <p className="nb-help nb-needle-note">대바늘 도안은 목도리처럼 평평하게 뜨는 편물에서 만들어집니다. 이 모양의 도안은 코바늘로 계산하고, 무늬는 3D 실 설정에서 볼 수 있습니다.</p>}
      </div>
      <div className="nb-tabs nb-famtabs" role="tablist" aria-label={(craft === "knit" ? "대바늘" : "코바늘") + " 무늬 종류"}>
        {fams.map(f => <button key={f} type="button" role="tab" aria-selected={f === fam} onClick={() => setTab(f)}>{f}</button>)}
      </div>
      <div className="nb-pats" role="radiogroup" aria-label={fam + " 무늬"}>
        {list.map(p => (
          <button key={p.id} type="button" role="radio" aria-checked={cur?.id === p.id} className={"nb-pat" + (p.draw ? " has-pic" : "")} onClick={() => pick(p)}>
            {pic(p)}<span>{p.ko}</span>{p.draw ? <small>{p.mult.split(" · ")[0]}</small> : <small className="nb-pat-later">3D 준비 중</small>}
          </button>
        ))}
      </div>
      {cur && (
        <div className="nb-patdet" aria-live="polite">
          <h3>{cur.ko}<small>{cur.en} · {cur.level}</small></h3>
          <p>{cur.how}</p>
          {cur.mult !== "—" && <p className="nb-patm">{cur.mult}</p>}
          {ck === "ch" && <ol>{CHART_ROWS[cv as ChartKey].map((r, i) => <li key={i}>{r}</li>)}</ol>}
          {knitNow && knitNow.mult > 1 && <p className="nb-patfit">{left ? `${knitNow.mult}코 단위 무늬인데 지금 폭은 ${n}코라서 가장자리에서 ${left}코 남습니다.` : `${knitNow.mult}코 단위 무늬이고, 지금 폭 ${n}코에 딱 맞습니다.`}</p>}
          {ck === "ch" && (() => { const [m, a] = CHART_MULT[cv as ChartKey], r = (n - a) % m; return <p className="nb-patfit">{r ? `${m}코 + ${a} 단위 무늬라서, 지금 폭 ${n}코에서는 ${n - r}코나 ${n - r + m}코가 딱 맞습니다.` : `지금 폭 ${n}코에 딱 맞습니다.`}</p>; })()}
          {ck === "cc" && <p className="nb-patfit">3D는 만드는 방법대로 그린 모습이라 실제와 조금 다를 수 있습니다. 도안의 단별 글은 아직 기본 코로 적힙니다.</p>}
          {!cur.draw && <p className="nb-patfit">이 무늬는 도안에 이름으로 적어 둡니다. 3D와 단별 글은 아직 기본 코로 보여 드립니다.</p>}
        </div>
      )}
      {craft === "crochet" && <OwnSteps draft={draft} patch={patch} />}
    </div>
  );
}

const OWN_EX = "1단: 짧은뜨기 1, (2코 건너뛰고 한 코에 한길긴뜨기 5, 2코 건너뛰고 짧은뜨기 1)을 끝까지\n2단: 사슬 3, 첫 코에 한길긴뜨기 2, (부채 가운데에 짧은뜨기 1, 짧은뜨기에 한길긴뜨기 5)를 끝까지\n1단과 2단을 반복";
/** 직접 적기 (Kim: 뜨는 원리대로): a crochet pattern written row by row as patterns are written; the 3D works out
 *  every stitch from where it goes (한 코에, 사슬 사이에, N코 모아, 구슬, 팝콘, 앞·뒤 걸어, N코 건너) */
function OwnSteps({ draft, patch }: { draft: Draft; patch: Patch }) {
  const [open, setOpen] = useState(!!draft.ownSteps), text = draft.ownSteps ?? "";
  const read = text.trim() ? chartFromSteps(text.split(/\n+/), 19, 4) : null;
  return (
    <div className="nb-wg nb-own">
      <button type="button" className="nb-link" aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? "직접 적기 닫기" : "뜨는 법을 직접 적어서 3D로 보기"}</button>
      {open && <>
        <label className="nb-own-f"><span className="sr">뜨는 법</span>
          <textarea rows={4} value={text} placeholder={OWN_EX} spellCheck={false} onChange={e => patch({ ownSteps: e.target.value, ownOn: !!e.target.value.trim() })} /></label>
        <p className="nb-help">한 줄에 한 단씩 적습니다. "한 코에", "사슬 사이에", "N코 모아", "구슬", "팝콘", "앞걸어·뒤걸어", "N코 건너뛰고", "(…)을 끝까지", "N단부터", "반복"을 읽어서, 코마다 어디에 떠 넣는지대로 3D를 만듭니다.</p>
        {text.trim() && <p className={"nb-patfit" + (read ? "" : " is-warn")} role="status">{read ? `${read.st.length}코를 읽었습니다. 3D가 이 뜨는 법으로 바뀌었습니다.` : "읽을 수 있는 코가 없습니다. 예시처럼 코 이름과 수를 적어 주십시오."}</p>}
        {text.trim() && <button type="button" className="nb-link st-muted" onClick={() => patch({ ownOn: !draft.ownOn })}>{draft.ownOn ? "고른 무늬로 다시 보기" : "적은 뜨는 법으로 보기"}</button>}
      </>}
    </div>
  );
}

/** The web's 무늬 spread: the knit-and-purl patterns as chart tiles; the 3D on the left knits the picked one.
 *  `n`: the stitches of a row (the plan's), to say whether the pattern's multiple fits the width. */
export function WebStitch({ draft, patch, n }: { draft: Draft; patch: Patch; n: number }) {
  const cur = stitchOf(draft.stitch), refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, KNIT_STITCHES.findIndex(s => s.key === cur.key));
  const key = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault(); const j = (i + d + KNIT_STITCHES.length) % KNIT_STITCHES.length; patch({ stitch: KNIT_STITCHES[j].key }); refs.current[j]?.focus();
  };
  const left = cur.mult > 1 ? n % cur.mult : 0;
  return (
    <div className="nb-web">
      <div className="nb-wg">
        <Head note="빈 칸 겉뜨기 · 줄 칸 안뜨기">겉뜨기 · 안뜨기 무늬</Head>
        <div className="nb-tiles nb-tiles-6 nb-stitches" role="radiogroup" aria-label="무늬">
          {KNIT_STITCHES.map((s, i) => (
            <button key={s.key} ref={el => { refs.current[i] = el; }} type="button" role="radio" aria-checked={s.key === cur.key} tabIndex={i === idx ? 0 : -1}
              className="nb-tile nb-stitch" onClick={() => patch({ stitch: s.key })} onKeyDown={e => key(e, i)}><StitchChart s={s} />{s.ko}</button>
          ))}
        </div>
        <p className="nb-wnote" aria-live="polite">{cur.note}{cur.mult > 1 && (left
          ? ` ${cur.mult}코 단위 무늬인데 지금 폭은 ${n}코라서, 가장자리에서 무늬가 ${left}코 남습니다. 그대로 떠도 되고, 폭을 조금 바꾸면 딱 맞습니다.`
          : ` ${cur.mult}코 단위 무늬이고, 지금 폭 ${n}코에 딱 맞습니다.`)}</p>
      </div>
    </div>
  );
}
