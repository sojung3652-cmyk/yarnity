"use client";
// My Page · 나의 도안집 (/my, Kim): the latest work on the hook as a wide card on top (the others are under the
// 뜨는 중 tab), then the shelves as they were (MineList: tabs with counts, sort, 고르기, a cover opens its
// details), the search box after 고르기, a dashed + 새 도안 slot after the last book.
import { useMemo } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { MineList } from "@/components/mine/MineList";
import { statusOf } from "@/lib/status";
import { HookCard } from "./MyWorkCard";
import { MyHead } from "./MyLayout";

export function MyPatterns() {
  const { projects } = useApp(), book = useBook();
  // the most recently knitted work that is going (started or not)
  const latest = useMemo(() => projects.filter(p => statusOf(p) === "knitting")
    .sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created))[0] ?? null, [projects]);
  return (
    <>
      <MyHead title="나의 도안집" line={`${projects.length}권`} />
      {latest && <HookCard p={latest} />}
      <div className="mine my-shelf"><MineList onNew={book.newPattern} /></div>
    </>
  );
}
