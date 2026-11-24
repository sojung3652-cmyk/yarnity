"use client";
// Yarni at hand while the shape is set (Kim: 모양 설정할 때 Yarni의 도움을 쉽게): a line at the top of 모양 - a
// question typed here, or one of a few common ones, opens Yarni with it in the box (sent by the maker, as
// AskAiLine does); 말로 설명하기 opens the window where the whole piece is said in words.
import { useState } from "react";
import { useApp } from "@/components/AppProvider";

const QUICK = ["손잡이 길이는 얼마가 좋습니까?", "덮개를 달면 어울립니까?", "이 크기면 실이 얼마나 듭니까?"];

export function YarniBar({ onWords }: { onWords?: () => void }) {
  const { setChat } = useApp();
  const [q, setQ] = useState("");
  const ask = (text: string) => { setChat(c => ({ ...c, open: true, prefill: text })); setQ(""); };
  return (
    <div className="yb" role="group" aria-label="Yarni에게 묻기">
      <form className="yb-row" onSubmit={e => { e.preventDefault(); ask(q.trim()); }}>
        <svg className="yb-star" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .5 7.1 4.9 11.5 6 7.1 7.1 6 11.5 4.9 7.1.5 6 4.9 4.9Z" /></svg>
        <span className="yb-lb" aria-hidden="true">Yarni</span>
        <input id="yb-q" className="nb-input yb-in" value={q} autoComplete="off" onChange={e => setQ(e.target.value)} aria-label="Yarni에게 물을 것" />
        <button type="submit" className="pp-mini yb-go">묻기</button>
      </form>
      <div className="yb-chips">
        {QUICK.map(t => <button key={t} type="button" className="yb-chip" onClick={() => ask(t)}>{t}</button>)}
        {onWords && <button type="button" className="yb-chip" onClick={onWords}>말로 설명해서 다시 만들기</button>}
      </div>
    </div>
  );
}
