"use client";
// My Page's work card (Kim): the latest work on the hook, on top of 나의 도안집 (no separate 진행 중 screen any more).
// Cover, chip, name, where it is, the bar, when it stopped; 이어서 뜨기 and, small under it, 도안 보기 · ···
// (고치기, 중단하기 / 다시 시작, 완성으로 표시).
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { BookCover, whereOf } from "@/components/BookCover";
import { ClothPatch } from "@/components/diary/Diary";
import { plan } from "@/lib/pattern";
import { statusOf } from "@/lib/status";
import type { Project } from "@/lib/types";

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

/** `recent`: the card on top of 나의 도안집 says it is the work knitted last (Kim), and is smaller */
export function WorkCard({ p, recent }: { p: Project; recent?: boolean }) {
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
    <article className={"my-card my-work" + (recent ? " is-recent" : "")}>
      <span className="my-work-cover"><BookCover p={p} w={recent ? 44 : 84} /></span>
      <div className="my-work-text">
        <span className="my-work-kick">{recent && <span className="my-recent">가장 최근에 뜬 작품</span>}<span className={"my-chip " + chip.cls}>{chip.text}</span></span>
        <h3>{p.name}</h3>
        <p className="my-work-where">{w.cur > 0 ? `${w.long}${nx ? ` (${nx.n}코)` : ""}` : `${w.total}단 · 아직 시작 전`}</p>
        <span className="my-bar"><i style={{ width: `${Math.round(w.pct * 100)}%` }} /></span>
        <p className="my-work-when">{st === "paused" && p.pausedAt ? stoppedAt(p.pausedAt) : stoppedAt(p.updatedAt ?? p.created)}</p>
      </div>
      <div className="my-work-end" ref={box}>
        {/* the ivory cloth label button (Kim), as the app's */}
        <ClothPatch color="cream" small className="my-go" onClick={resume}>{w.cur > 0 ? "이어서 뜨기" : "뜨기 시작"}</ClothPatch>
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
