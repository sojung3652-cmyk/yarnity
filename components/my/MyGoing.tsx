"use client";
// My Page · 진행 중 (/my, Kim): every work on the hook (뜨는 중 and 시작 전) as a wide card, the latest knitted
// first; then 멈춘 작품 (중단). A card: cover, chip, name, where it is, the bar, when it stopped; 이어서 뜨기 and,
// small under it, 도안 보기 · ··· (고치기, 중단하기 / 다시 시작, 완성으로 표시).
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { BookCover, whereOf } from "@/components/BookCover";
import { plan } from "@/lib/pattern";
import { statusOf } from "@/lib/status";
import type { Project } from "@/lib/types";
import { MyHead } from "./MyLayout";

/** "오늘 저녁 7:33에 멈춤" */
export function stoppedAt(ms: number) {
  const d = new Date(ms), now = new Date(), day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  const part = h < 6 ? "새벽" : h < 12 ? "오전" : h < 18 ? "오후" : "저녁", h12 = h % 12 || 12;
  const when = diff === 0 ? "오늘" : diff === 1 ? "어제" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${when} ${part} ${h12}:${m}에 멈춤`;
}

export const chipOf = (p: Project) => {
  const st = statusOf(p);
  return st === "done" ? { cls: "is-done", text: "완성" } : st === "paused" ? { cls: "is-rest", text: "중단" } : (p.current || 0) > 0 ? { cls: "is-knit", text: "뜨는 중" } : { cls: "is-rest", text: "시작 전" };
};

function WorkCard({ p }: { p: Project }) {
  const { setActive, updateProject } = useApp(), router = useRouter(), book = useBook();
  const w = whereOf(p), rows = plan(p).rows, chip = chipOf(p), st = statusOf(p);
  const nx = rows[w.cur];
  const [menu, setMenu] = useState(false), box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [menu]);
  const resume = () => { setActive(p.id); if (st === "paused") updateProject(p.id, { status: "knitting", pausedAt: null }); router.push("/track"); };
  const view = () => { setActive(p.id); router.push("/pattern"); };
  return (
    <article className="my-card my-work">
      <span className="my-work-cover"><BookCover p={p} w={84} /></span>
      <div className="my-work-text">
        <span className={"my-chip " + chip.cls}>{chip.text}</span>
        <h3>{p.name}</h3>
        <p className="my-work-where">{w.cur > 0 ? `${w.long}${nx ? ` (${nx.n}코)` : ""}` : `${w.total}단 · 아직 시작 전`}</p>
        <span className="my-bar"><i style={{ width: `${Math.round(w.pct * 100)}%` }} /></span>
        <p className="my-work-when">{st === "paused" && p.pausedAt ? stoppedAt(p.pausedAt) : stoppedAt(p.updatedAt ?? p.created)}</p>
      </div>
      <div className="my-work-end" ref={box}>
        <button type="button" className="my-btn" onClick={resume}>{w.cur > 0 ? "이어서 뜨기 →" : "뜨기 시작 →"}</button>
        <p className="my-work-links">
          <button type="button" onClick={view}>도안 보기</button>
          <span aria-hidden="true">·</span>
          <button type="button" aria-label={`${p.name} 메뉴`} aria-expanded={menu} onClick={() => setMenu(v => !v)}>···</button>
        </p>
        {menu && (
          <div className="my-pop" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenu(false); book.editHere(p.id); }}>도안 고치기</button>
            {st === "paused"
              ? <button type="button" role="menuitem" onClick={() => { setMenu(false); updateProject(p.id, { status: "knitting", pausedAt: null }); }}>다시 시작</button>
              : <button type="button" role="menuitem" onClick={() => { setMenu(false); updateProject(p.id, { status: "paused", pausedAt: Date.now() }); }}>잠시 쉬기 (중단)</button>}
            <button type="button" role="menuitem" onClick={() => { setMenu(false); updateProject(p.id, { status: "done", pausedAt: null }); }}>완성으로 표시</button>
          </div>
        )}
      </div>
    </article>
  );
}

export function MyGoing() {
  const { ready, projects } = useApp(), book = useBook();
  const recent = (a: Project, b: Project) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created);
  const going = useMemo(() => projects.filter(p => statusOf(p) === "knitting").sort(recent), [projects]);
  const paused = useMemo(() => projects.filter(p => statusOf(p) === "paused").sort(recent), [projects]);
  const newBtn = <button type="button" className="my-btn" onClick={book.newPattern}>+ 새 도안</button>;
  if (!ready) return null;
  return (
    <>
      <MyHead title="진행 중" line={`뜨고 있는 작품 ${going.length} · 멈춘 작품 ${paused.length}`}>{newBtn}</MyHead>
      {going.length ? <div className="my-works">{going.map(p => <WorkCard key={p.id} p={p} />)}</div> : (
        <div className="my-card my-empty"><p>아직 뜨고 있는 작품이 없어요</p>{newBtn}</div>
      )}
      <h2 className="my-sub"><span>멈춘 작품</span></h2>
      {paused.length ? <div className="my-works">{paused.map(p => <WorkCard key={p.id} p={p} />)}</div>
        : <p className="my-quiet">멈춘 작품이 없어요. 작품을 잠시 쉬면 여기로 옮겨져요.</p>}
    </>
  );
}
