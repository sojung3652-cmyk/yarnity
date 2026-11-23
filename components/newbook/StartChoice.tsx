"use client";
// 새 도안 (Kim): start fresh, or go on with something - the draft left half made, or a work already in 나의 도안집
// (it opens in 도안 만들기 to be changed). Shown on the first page while there is something to go on with.
import type { Draft, Project } from "@/lib/types";
import { ITEM, itemIdOf } from "@/lib/items";
import { Tiles } from "./WebPages";

export function StartChoice({ draft, projects, mode, onMode, onFresh, onDraft, onOpen }: {
  draft: Draft; projects: Project[]; mode: "new" | "go" | null;
  onMode: (m: "new" | "go") => void; onFresh: () => void; onDraft: () => void; onOpen: (id: string) => void;
}) {
  const hasDraft = !!(draft.itemPicked || draft.name.trim() || draft.free || draft.paint);
  const works = [...projects].sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created)).slice(0, 6);
  if (!hasDraft && !works.length) return null;
  const day = (t: number) => new Date(t).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  return (
    <div className="st nb-web">
      <p className="st-ask">어디서부터 시작하시겠습니까?</p>
      <Tiles label="시작" value={mode ?? ""} cols={2} onPick={v => { onMode(v as "new" | "go"); if (v === "new") onFresh(); }}
        options={[["new", "새로 시작", "빈 종이에서"], ["go", "이어서 하기", "만들던 것 불러오기"]]} />
      {mode === "go" && (
        <ul className="st-list">
          {hasDraft && (
            <li><button type="button" onClick={onDraft}>
              <b>{draft.name.trim() || "이름 없는 도안"}</b><span>만들던 도안{draft.itemPicked ? ` · ${draft.free || draft.paint ? "직접 그린 모양" : ITEM[itemIdOf(draft)].name}` : ""}</span>
            </button></li>
          )}
          {works.map(p => (
            <li key={p.id}><button type="button" onClick={() => onOpen(p.id)}>
              <b>{p.name}</b><span>{ITEM[itemIdOf(p)].name} · {day(p.updatedAt ?? p.created)}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
