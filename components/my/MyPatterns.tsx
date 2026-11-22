"use client";
// My Page · 나의 도안집 (/my, Kim): the latest work on the hook as a wide card on top (the others are under the
// 뜨는 중 tab) - a Yarnity pattern or a 가져온 도안, whichever was knitted last - then the shelves (MineList: tabs
// with counts, sort, 고르기, a cover opens its details or, for an imported one, its follow-along page), a dashed
// + 새 도안 slot after the last book offering 만들기 (New Pattern) · 가져오기 (MyImport).
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { MineList } from "@/components/mine/MineList";
import { useImported } from "@/lib/imported";
import { statusOf } from "@/lib/status";
import { HookCard, ImportedHookCard } from "./MyWorkCard";
import { MyHead } from "./MyLayout";
import { MyImport } from "./MyImport";

export function MyPatterns() {
  const { projects } = useApp(), book = useBook(), imp = useImported();
  const [importing, setImporting] = useState(false);
  // the most recently knitted work that is going (started or not), from both kinds
  const latest = useMemo(() => {
    const y = projects.filter(p => statusOf(p) === "knitting").map(p => ({ t: p.updatedAt ?? p.created, y: p, i: undefined }));
    const i = imp.list.filter(p => p.status === "knitting").map(p => ({ t: p.updatedAt, y: undefined, i: p }));
    return [...y, ...i].sort((a, b) => b.t - a.t)[0] ?? null;
  }, [projects, imp.list]);
  return (
    <>
      <MyHead title="나의 도안집" /> {/* no 권 count: 전체 shows it (Kim) */}
      {latest?.y && <HookCard p={latest.y} />}
      {latest?.i && <ImportedHookCard p={latest.i} />}
      <div className="mine my-shelf"><MineList onNew={book.newPattern} onImport={() => setImporting(true)} /></div>
      {importing && <MyImport onClose={() => setImporting(false)} />}
    </>
  );
}
