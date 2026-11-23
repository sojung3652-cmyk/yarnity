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

const QUICK = ["가방", "파우치", "바구니", "모자", "목도리", "수세미", "코스터", "담요"];

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

export function AskStart({ draft, onApply, onSkip }: { draft: Draft; onApply: (d: Draft) => void; onSkip: () => void }) {
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

  return (
    <div className="ask" role="dialog" aria-modal="true" aria-labelledby="ask-h">
      <div className="ask-box">
        <h2 id="ask-h">무엇을 떠 볼까요</h2>
        <p className="ask-lead">적어 주신 내용으로 얀이가 부품을 맞춰 바로 조립합니다. 부품은 다음 화면에서 언제든 더하고 빼고 바꿀 수 있습니다.</p>
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
          <ClothLabel side="next" type="button" onClick={prepare} blocked={busy}>{busy ? "조립하는 중…" : "조립하기 →"}</ClothLabel>
        </div>
      </div>
    </div>
  );
}
