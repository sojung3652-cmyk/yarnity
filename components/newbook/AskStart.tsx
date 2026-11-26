"use client";
// 조립하기의 첫 창 (Kim): when the 3D screen opens it asks the piece's name (may stay empty: it is named from
// the finished pattern) and what the reader wants to make; Yarni (app/api/shape with the words) lays out the
// parts, the reader ticks what stays, and the piece comes up put together. Without the AI (no key, no network)
// the words are read here (lib/assemble guessSpec), so the window always leads somewhere (Rule 6).
import { useState } from "react";
import type { Draft } from "@/lib/types";
import { readSpec, specToDraft } from "@/lib/sketchShape";
import { guessSpec } from "@/lib/assemble";
import { PROTO_GROUPS, PROTOS, protoDraft, type Proto } from "@/lib/prototypes";
import { ClothLabel } from "./ClothLabel";
import { useApp } from "@/components/AppProvider";

/** 기본형 (Kim): pressed, the piece comes up ready - bags and pouches in a few kinds, the rest as they are.
 *  Each is a card with a picture of its 3D (Kim: 그래픽을 미리보기로 - public/protos/<id>.webp, taken from the 3D
 *  itself), its name and a line. Starters of one family (호보백) are one card that opens in place into its
 *  members (Kim: 누르면 둘 중에 선택). */
const COUNT = ["한", "두", "세", "네"];
function Protos({ onPick }: { onPick: (p: Proto) => void }) {
  const [open, setOpen] = useState<string | null>(null), [grp, setGrp] = useState(PROTO_GROUPS[0]);
  // (a family is one card: the chip counts the cards there are, not the starters)
  const cardsIn = (g: string) => new Set(PROTOS.filter(p => p.group === g).map(p => p.family ?? p.id)).size;
  // (a picture that is not there leaves its place empty; the card still works by its name)
  const pic = (id: string) => <img className="ask-pic" src={`/protos/${id}.webp`} alt="" width={360} height={360} loading="lazy" decoding="async" onError={e => { e.currentTarget.style.visibility = "hidden"; }} />;
  const card = (p: Proto, name: string, note: string, onClick: () => void, expanded?: boolean) => (
    <button key={p.id + name} type="button" className="ask-card" aria-expanded={expanded} onClick={onClick}>{pic(p.id)}<em className="ask-card-name">{name}</em>{note && <small>{note}</small>}</button>
  );
  return (
    <div className="ask-protos">
      <p className="ask-protos-lead">누르면 바로 그 모양이 3D로 나옵니다. 크기와 부품은 모양에서 고쳐 나가면 됩니다.</p>
      {/* 그룹 이름으로 고르기 (Kim, 목록 B): the cards of the group picked, the list kept short */}
      <div className="ask-chips" role="tablist" aria-label="기본형 묶음">
        {PROTO_GROUPS.map(g => <button key={g} type="button" role="tab" aria-selected={g === grp} onClick={() => { setGrp(g); setOpen(null); }}>{g}<small>{cardsIn(g)}</small></button>)}
      </div>
      {PROTO_GROUPS.filter(g => g === grp).map(g => {
        const list = PROTOS.filter(p => p.group === g), seen = new Set<string>();
        return (
          <div key={g} className="ask-grp" role="tabpanel" aria-label={g}>
            <span>{list.map(p => {
              if (!p.family) return card(p, p.name, p.note, () => onPick(p));
              if (seen.has(p.family)) return null;
              seen.add(p.family);
              const members = list.filter(x => x.family === p.family), on = open === p.family, fam = p.family, cover = members.find(m => m.cover) ?? p;
              return (
                <div key={fam} className={"ask-fam" + (on ? " is-open" : "")}>
                  {card(cover, fam, on ? "닫기" : `${COUNT[members.length - 1] ?? members.length} 가지 방식`, () => setOpen(on ? null : fam), on)}
                  {on && members.map(m => card(m, m.choice?.[0] ?? m.name, m.choice?.[1] ?? m.note, () => onPick(m)))}
                </div>
              );
            })}</span>
          </div>
        );
      })}
    </div>
  );
}


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

/** what to make, in the reader's own words (Kim: 주관식): Yarni lays out the parts and they go on at once */
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
  const put = (t: string) => { setText(x => (x.trim() ? x.trim() + " " : "") + t); setErr(""); };
  return { busy, err, prepare, field, put };
}

/** the window after the yarn (Kim): only what to make; the parts and the rest are in 모양 */
export function AskStart({ draft, onApply, onSkip }: { draft: Draft; onApply: (d: Draft) => void; onSkip: () => void }) {
  const q = useAsk(draft, onApply), [list, setList] = useState(false);
  return (
    <div className="ask" role="dialog" aria-modal="true" aria-labelledby="ask-h">
      <div className="ask-box">
        <h2 id="ask-h">무엇을 떠 볼까요</h2>
        {/* Kim: 기본형에서 시작하기 first, easy to see - a ready shape at once, changed afterwards in 모양 */}
        <button type="button" className="ask-proto" aria-expanded={list} onClick={() => setList(v => !v)}><b>기본형에서 시작하기</b><span>{list ? "닫기" : "토트백, 버킷백, 파우치… 바로 고르기"}</span></button>
        {list && <Protos onPick={p => onApply(protoDraft(draft, p))} />}
        <p className="ask-lead">또는 자유롭게 적어 주십시오. Yarni가 부품을 맞춰 두고, 실을 고른 뒤 모양에서 크기와 부품을 정합니다.</p>
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

/** 모양, while nothing is made yet (Kim: 1. Yarni와 대화하기 2. 기본형으로 시작하기, nothing else). Yarni asks
 *  what it needs and what it settles is drawn at once (chat.shape, components/newbook/AiPanel); without the AI
 *  the 기본형 are still there (Rule 6) */
export function AskInline({ draft, onApply }: { draft: Draft; onApply: (d: Draft) => void }) {
  const { chat, setChat } = useApp();
  const [list, setList] = useState(false), off = !!chat.off;
  return (
    <div className="ask-in">
      <p className="ask-in-h">무엇을 떠 볼까요</p>
      {/* (Kim: 기본형이 위로, 누르면 그 바로 아래에 목록이 펼쳐지게) */}
      <button type="button" className="ask-proto ask-pick" aria-expanded={list} onClick={() => setList(v => !v)}>
        <b><i aria-hidden="true">1</i>기본형으로 시작하기</b>
        <span>{list ? "닫기" : "토트백, 버킷백, 파우치… 바로 고르기"}</span>
      </button>
      {list && <Protos onPick={p => onApply(protoDraft(draft, p))} />}
      <button type="button" className="ask-proto ask-pick" disabled={off} onClick={() => setChat(c => ({ ...c, open: true, conv: "new", shape: true, prefill: null }))}>
        <b><i aria-hidden="true">2</i>Yarni와 대화하기</b>
        {off && <span>지금은 Yarni를 쓸 수 없습니다.</span>}
      </button>
    </div>
  );
}
