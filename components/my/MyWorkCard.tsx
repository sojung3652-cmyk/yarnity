"use client";
// My Page's latest work on the hook (Kim): on top of 나의 도안집, laid out exactly as the app's 나의 도안집 card
// (components/mobile/MobileMine.tsx "mm-card"): the cover, the item, the name, where it is, the bar, yarn · hook,
// ··· at the top right (도안 고치기, 잠시 쉬기 / 다시 시작, 완성으로 표시); under it two cloth labels side by side,
// 도안 보기 (ivory) and 이어서 뜨기 → (pink). A small line above says it is the work knitted last.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { BookCover, whereOf } from "@/components/BookCover";
import { ClothPatch } from "@/components/diary/Diary";
import { ITEM, itemIdOf } from "@/lib/items";
import { statusOf } from "@/lib/status";
import type { Project } from "@/lib/types";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";

export function HookCard({ p }: { p: Project }) {
  const { setActive, updateProject } = useApp(), router = useRouter(), book = useBook();
  const w = whereOf(p), st = statusOf(p);
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
  const spec = [yarnWeightText(p), hookLabel(hookMmOf(p))].filter(t => t && t !== "—").join(" · ");
  return (
    <section className="my-latest" aria-labelledby="myLatest">
      <p className="my-recent" id="myLatest">가장 최근에 뜬 작품</p>
      <article className="my-hook">
        <div className="my-hook-more" ref={box}>
          <button type="button" aria-label={`${p.name} 메뉴`} aria-expanded={menu} onClick={() => setMenu(v => !v)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" /></svg>
          </button>
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
        <div className="my-hook-in">
          <span className="my-hook-cover"><BookCover p={p} w={74} /></span>
          <div className="my-hook-text">
            <p className="my-hook-small">{ITEM[itemIdOf(p)].name}</p>
            <h3>{p.name}</h3>
            <p className="my-hook-where">{w.long}</p>
            <span className="my-bar"><i style={{ width: `${Math.round(w.pct * 100)}%` }} /></span>
            {spec && <p className="my-hook-small">{spec}</p>}
          </div>
        </div>
        <div className="my-hook-btns">
          <ClothPatch color="cream" small onClick={view}>도안 보기</ClothPatch>
          <ClothPatch color="lavender" small onClick={resume}>{w.cur > 0 ? "이어서 뜨기 →" : "뜨기 시작 →"}</ClothPatch>
        </div>
      </article>
    </section>
  );
}
