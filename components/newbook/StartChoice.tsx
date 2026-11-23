"use client";
// 새 도안 (Kim): start fresh, or go on with something - the draft left half made, or a work already in 나의 도안집
// (it opens in 도안 만들기 to be changed). Shown on the first page while there is something to go on with.
import type { Draft, Project } from "@/lib/types";
import { ITEM, itemIdOf } from "@/lib/items";
import { Tiles } from "./WebPages";

export function StartChoice({ draft, projects, mode, onMode, onFresh, onDraft, onOpen, always }: {
  draft: Draft; projects: Project[]; mode: "new" | "go" | null;
  onMode: (m: "new" | "go") => void; onFresh: () => void; onDraft: () => void; onOpen: (id: string) => void;
  /** the first page on wide screens (Kim): this choice in place of the name, shown even with nothing to go on with */
  always?: boolean;
}) {
  const hasDraft = !!(draft.itemPicked || draft.name.trim() || draft.free || draft.paint);
  const works = [...projects].sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created)).slice(0, 6);
  if (!hasDraft && !works.length && !always) return null;
  const day = (t: number) => new Date(t).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  if (always) return (
    <div className="st st-big">
      <p className="st-kicker" lang="en">new pattern</p>
      <p className="st-ask">어디서부터 시작하시겠습니까?</p>
      <span className="st-rule" aria-hidden="true" />
      <div className="st-labels" role="group" aria-label="시작">
        <button type="button" className="tp-label st-label" aria-pressed={mode === "new"} onClick={() => { onMode("new"); onFresh(); }}>
          <span className="tp-label-top" lang="en">from scratch</span><b>새로 시작</b><span className="st-desc">빈 종이에서</span>
        </button>
        <button type="button" className="tp-label st-label st-label-b" aria-pressed={mode === "go"} aria-expanded={mode === "go"} onClick={() => onMode("go")}>
          <span className="tp-label-top" lang="en">continue</span><b>이어서 하기</b><span className="st-desc">만들던 것 불러오기</span>
        </button>
      </div>
      {mode === "go" && !hasDraft && !works.length && <p className="nb-help st-none">이어서 할 것이 아직 없습니다. 새로 시작해 주십시오.</p>}
      {mode === "go" && (hasDraft || !!works.length) && (
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
      <p className="st-foot" lang="en">with love · yarnity</p>
    </div>
  );
  return (
    <div className="st nb-web">
      <p className="st-ask">어디서부터 시작하시겠습니까?</p>
      <Tiles label="시작" value={mode ?? ""} cols={2} onPick={v => { onMode(v as "new" | "go"); if (v === "new") onFresh(); }}
        options={[["new", "새로 시작", "빈 종이에서"], ["go", "이어서 하기", "만들던 것 불러오기"]]} />
      {mode === "go" && !hasDraft && !works.length && <p className="nb-help st-none">이어서 할 것이 아직 없습니다. 새로 시작해 주십시오.</p>}
      {mode === "go" && (hasDraft || !!works.length) && (
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
