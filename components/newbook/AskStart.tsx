"use client";
// 조립하기의 첫 창 (Kim): when the 3D screen opens it asks the piece's name (may stay empty: it is named from
// the finished pattern) and what the reader wants to make; 얀이 (app/api/shape with the words) lays out the
// parts, the reader ticks what stays, and the piece comes up put together. Without the AI (no key, no network)
// the words are read here (lib/assemble guessSpec), so the window always leads somewhere (Rule 6).
import { useState } from "react";
import type { Draft } from "@/lib/types";
import { readSpec, specToDraft } from "@/lib/sketchShape";
import { guessSpec } from "@/lib/assemble";
import { ClothLabel } from "./ClothLabel";


/** the first window (Kim: 이름을 먼저): the piece's name; may stay empty */
export function NameStart({ name, onName, onNext }: { name: string; onName: (v: string) => void; onNext: () => void }) {
  return (
    <div className="ask" role="dialog" aria-modal="true" aria-labelledby="ask-h">
      <div className="ask-box">
        <h2 id="ask-h">작품 이름을 지어 주십시오</h2>
        <p className="ask-lead">다음 화면에서 실과 색을 고르고, 그다음에 무엇을 뜰지 정합니다.</p>
        <label className="ask-f"><span>작품 이름<small>비워 두면 완성된 도안을 보고 자동으로 지어 드립니다</small></span>
          <input value={name} maxLength={40} placeholder="예: 봄 나들이 가방" autoComplete="off" spellCheck={false} autoFocus
            onChange={e => onName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); onNext(); } }} /></label>
        <div className="ask-foot">
          <ClothLabel side="next" type="button" onClick={onNext}>다음 · 실 고르기 →</ClothLabel>
        </div>
      </div>
    </div>
  );
}

/** what to make, in the reader's own words (Kim: 주관식): 얀이 lays out the parts and they go on at once */
function useAsk(draft: Draft, onApply: (d: Draft) => void) {
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
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
    // the parts go on at once (Kim): they are added, changed and taken off afterwards in 모양
    onApply(specToDraft(draft, spec));
  };
  const field = (
    <label className="ask-f"><span>뜨고 싶은 것</span>
      <textarea value={text} maxLength={300} rows={3} placeholder="예: 어깨에 메는 둥근 가방. 덮개가 있고 단추로 잠그면 좋겠어요."
        onChange={e => { setText(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); prepare(); } }} /></label>
  );
  return { busy, err, prepare, field };
}

/** the window after the yarn (Kim): only what to make; the parts and the rest are in 모양 */
export function AskStart({ draft, onApply, onSkip }: { draft: Draft; onApply: (d: Draft) => void; onSkip: () => void }) {
  const q = useAsk(draft, onApply);
  return (
    <div className="ask" role="dialog" aria-modal="true" aria-labelledby="ask-h">
      <div className="ask-box">
        <h2 id="ask-h">무엇을 떠 볼까요</h2>
        <p className="ask-lead">자유롭게 적어 주십시오. 얀이가 부품을 맞춰 조립하고, 크기와 부품은 다음 화면에서 정합니다.</p>
        {q.field}
        {q.err && <p className="ask-err" role="alert">{q.err}</p>}
        <div className="ask-foot">
          <ClothLabel side="back" type="button" onClick={onSkip}>나중에</ClothLabel>
          <ClothLabel side="next" type="button" onClick={q.prepare} blocked={q.busy}>{q.busy ? "조립하는 중…" : "조립하기 →"}</ClothLabel>
        </div>
      </div>
    </div>
  );
}

/** the same question inside 모양, while nothing is made yet (no list of items to pick: the reader's own words) */
export function AskInline({ draft, onApply }: { draft: Draft; onApply: (d: Draft) => void }) {
  const q = useAsk(draft, onApply);
  return (
    <div className="ask-in">
      <p className="ask-in-h">무엇을 떠 볼까요</p>
      {q.field}
      {q.err && <p className="ask-err" role="alert">{q.err}</p>}
      <button type="button" className="sk-make" onClick={q.prepare} disabled={q.busy}>{q.busy ? "조립하는 중…" : "조립하기"}</button>
    </div>
  );
}
