"use client";
// My Page · 나의 도안집 (/my/patterns, Kim): the shelves as they were (MineList: tabs with counts, sort, 고르기,
// a cover opens its details), the search box in the head, a dashed + 새 도안 slot after the last book.
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { MineList } from "@/components/mine/MineList";
import { MyHead } from "./MyLayout";

export function MyPatterns() {
  const { projects } = useApp(), book = useBook(), [q, setQ] = useState("");
  return (
    <>
      <MyHead title="나의 도안집" line={`${projects.length}권`}>
        <label className="my-search">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10.4 10.4 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span className="sr">작품 찾기</span>
          <input type="search" autoComplete="off" placeholder="이름, 실, 색으로 찾기" value={q} onChange={e => setQ(e.target.value)} />
        </label>
      </MyHead>
      <div className="mine my-shelf"><MineList query={q} onNew={book.newPattern} /></div>
    </>
  );
}
