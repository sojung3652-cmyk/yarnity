"use client";
// My Page · 나의 도안집 (/my, Kim): the latest work on the hook as a wide card on top (the others are under the
// 뜨는 중 tab), then the shelves as they were (MineList: tabs with counts, sort, 고르기, a cover opens its
// details), the search box in the head, a dashed + 새 도안 slot after the last book.
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { MineList } from "@/components/mine/MineList";
import { statusOf } from "@/lib/status";
import { HookCard } from "./MyWorkCard";
import { MyHead } from "./MyLayout";

export function MyPatterns() {
  const { projects } = useApp(), book = useBook(), [q, setQ] = useState("");
  // the most recently knitted work that is going (started or not)
  const latest = useMemo(() => projects.filter(p => statusOf(p) === "knitting")
    .sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created))[0] ?? null, [projects]);
  return (
    <>
      <MyHead title="나의 도안집" line={`${projects.length}권`}>
        <label className="my-search">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10.4 10.4 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span className="sr">작품 찾기</span>
          <input type="search" autoComplete="off" placeholder="이름, 실, 색으로 찾기" value={q} onChange={e => setQ(e.target.value)} />
        </label>
      </MyHead>
      {latest && <HookCard p={latest} />}
      <div className="mine my-shelf"><MineList query={q} onNew={book.newPattern} /></div>
    </>
  );
}
