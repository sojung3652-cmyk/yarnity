"use client";
// 조립하기의 첫 창 (Kim): when the 3D screen opens it asks the piece's name (may stay empty: it is named from
// the finished pattern) and what the reader wants to make; 얀이 (app/api/shape with the words) lays out the
// parts, the reader ticks what stays, and the piece comes up put together. Without the AI (no key, no network)
// the words are read here (lib/assemble guessSpec), so the window always leads somewhere (Rule 6).
import { useState } from "react";
import type { Draft } from "@/lib/types";
import { ITEM, itemIdOf } from "@/lib/items";
import { readSpec, specToDraft } from "@/lib/sketchShape";
import { guessSpec, partLines } from "@/lib/assemble";
import { ClothLabel } from "./ClothLabel";

const QUICK = ["가방", "파우치", "바구니", "모자", "목도리", "수세미", "코스터", "담요"];
type Opt = "손잡이" | "덮개" | "단추" | "지퍼" | "라벨";

export function AskStart({ draft, onName, onApply, onSkip }: { draft: Draft; onName: (v: string) => void; onApply: (d: Draft) => void; onSkip: () => void }) {
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const [made, setMade] = useState<{ d: Draft; say: string } | null>(null);

  const prepare = async () => {
    const t = text.trim(); if (!t || busy) { if (!t) setErr("무엇을 뜨고 싶은지 한 줄만 적어 주십시오."); return; }
    setBusy(true); setErr("");
    let spec = null;
    try {
      const res = await fetch("/api/shape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) });
      if (res.ok) spec = readSpec((await res.json()).shape);
    } catch { /* read here instead */ }
    // the AI's answer without an item of ours, or no AI: the words themselves
    if (!spec || !spec.item) spec = guessSpec(t) ?? spec;
    setBusy(false);
    if (!spec) { setErr("무엇인지 알아보지 못했습니다. 가방, 목도리처럼 뜰 것의 이름을 넣어 주십시오."); return; }
    setMade({ d: specToDraft(draft, spec), say: spec.summary ?? "" });
  };

  if (made) {
    const d = made.d, it = ITEM[itemIdOf(d)], bag = it.kind === "base-body", ex = d.extras ?? {};
    const on: Record<Opt, boolean> = { 손잡이: d.handle !== "none", 덮개: !!d.flapCm, 단추: !!ex.button, 지퍼: !!ex.zipper, 라벨: !!ex.label };
    const can: Opt[] = [...(it.handles ? ["손잡이" as Opt] : []), ...(bag && it.id !== "beanie" ? ["덮개" as Opt] : []), "단추", ...(bag ? ["지퍼" as Opt] : []), "라벨"];
    const set = (k: Opt, v: boolean) => {
      const n: Draft = k === "손잡이" ? { ...d, handle: v ? "short" : "none", handleCm: v ? d.handleCm ?? 45 : null, handleCount: v ? d.handleCount ?? 2 : undefined }
        : k === "덮개" ? { ...d, flapCm: v ? Math.max(4, Math.round(d.h * .45)) : null, closure: v ? "flap" : "open", flapShape: v ? d.flapShape ?? "half" : undefined }
        : { ...d, extras: { ...ex, [k === "단추" ? "button" : k === "지퍼" ? "zipper" : "label"]: v } };
      setMade({ ...made, d: n });
    };
    const lines = partLines(d), fixed = lines.filter(([p]) => !can.includes(p as Opt));
    return (
      <div className="ask" role="dialog" aria-modal="true" aria-labelledby="ask-h">
        <div className="ask-box">
          <h2 id="ask-h">이렇게 준비했습니다<small>{it.name}</small></h2>
          {made.say && <p className="ask-say"><b>얀이</b><span>{made.say}</span></p>}
          <ul className="ask-list">
            {fixed.map(([p, t]) => <li key={p} className="is-fixed"><i aria-hidden="true" /><b>{p}</b><span>{t}</span></li>)}
            {can.map(k => {
              const line = lines.find(([p]) => p === k);
              return <li key={k}><label><input type="checkbox" checked={on[k]} onChange={e => set(k, e.target.checked)} /><b>{k}</b><span>{on[k] ? line?.[1] ?? "넣음" : "넣으려면 체크"}</span></label></li>;
            })}
          </ul>
          <p className="ask-note">부품의 크기와 모양은 다음 화면에서 슬라이더로 바꿉니다.</p>
          <div className="ask-foot">
            <ClothLabel side="back" type="button" onClick={() => setMade(null)}>← 다시 적기</ClothLabel>
            <ClothLabel side="next" type="button" onClick={() => onApply(d)}>이대로 조립 시작 →</ClothLabel>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="ask" role="dialog" aria-modal="true" aria-labelledby="ask-h">
      <div className="ask-box">
        <h2 id="ask-h">무엇을 떠 볼까요</h2>
        <p className="ask-lead">적어 주신 내용으로 얀이가 조립할 부품을 준비합니다. 준비된 부품은 언제든 더하고 뺄 수 있습니다.</p>
        <label className="ask-f"><span>작품 이름<small>비워 두면 완성된 도안을 보고 자동으로 지어 드립니다</small></span>
          <input value={draft.name} maxLength={40} placeholder="예: 봄 나들이 가방" autoComplete="off" spellCheck={false} onChange={e => onName(e.target.value)} /></label>
        <label className="ask-f"><span>뜨고 싶은 것</span>
          <textarea value={text} maxLength={300} rows={3} autoFocus placeholder="예: 어깨에 메는 둥근 가방. 덮개가 있고 단추로 잠그면 좋겠어요. 손잡이는 넓적하게."
            onChange={e => { setText(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); prepare(); } }} /></label>
        <div className="ask-quick" role="group" aria-label="눌러서 넣기">
          {QUICK.map(q => <button key={q} type="button" onClick={() => { setText(t => (t.trim() ? t.trim() + " " : "") + q); setErr(""); }}>{q}</button>)}
          <span>눌러서 넣어도 됩니다</span>
        </div>
        {err && <p className="ask-err" role="alert">{err}</p>}
        <div className="ask-foot">
          <span className="ask-skipnote">건너뛰면 부품을 목록에서 직접 고릅니다.</span>
          <ClothLabel side="back" type="button" onClick={onSkip}>건너뛰기</ClothLabel>
          <ClothLabel side="next" type="button" onClick={prepare} blocked={busy}>{busy ? "준비하는 중…" : "부품 준비하기 →"}</ClothLabel>
        </div>
      </div>
    </div>
  );
}
