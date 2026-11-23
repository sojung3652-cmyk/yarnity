"use client";
// 새 도안 (Kim): start fresh, or go on with something - the draft left half made, or a work already in 나의 도안집
// (it opens in 도안 만들기 to be changed). Shown on the first page while there is something to go on with.
import type { Draft, Project } from "@/lib/types";
import type { Removed } from "@/components/AppProvider";
import { freshDraft, ITEM, itemIdOf } from "@/lib/items";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { store } from "@/lib/store";
import { Tiles } from "./WebPages";

export function StartChoice({ draft, projects, mode, onMode, onFresh, onDraft, onOpen, always }: {
  draft: Draft; projects: Project[]; mode: "new" | "go" | null;
  onMode: (m: "new" | "go") => void; onFresh: () => void; onDraft: () => void; onOpen: (id: string) => void;
  /** the first page on wide screens (Kim): this choice in place of the name, shown even with nothing to go on with */
  always?: boolean;
}) {
  const { removeProjects, restoreProjects, setDraft } = useApp();
  const hasDraft = !draft.editOf && !!(draft.itemPicked || draft.name.trim() || draft.free || draft.paint);
  // every work, newest first (the list scrolls), so each can be found and taken away (Kim)
  const [picking, setPicking] = useState(false), [picked, setPicked] = useState<string[]>([]), [ask, setAsk] = useState<string[] | null>(null);
  const [undo, setUndo] = useState<{ n: number; r?: Removed; d?: Draft } | null>(null);
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(t); }, [undo]);
  const rows: { id: string; name: string; sub: string; open: () => void }[] = [
    ...(hasDraft ? [{ id: "draft", name: draft.name.trim() || "이름 없는 도안", sub: `만들던 도안${draft.itemPicked ? ` · ${draft.free || draft.paint ? "직접 그린 모양" : ITEM[itemIdOf(draft)].name}` : ""}`, open: onDraft }] : []),
    // saved works are not here (Kim): they are in 나의 도안집, changed only with 고치기
  ];
  const allIds = rows.map(r => r.id), allOn = allIds.length > 0 && allIds.every(id => picked.includes(id));
  const nameOf = (id: string) => rows.find(r => r.id === id)?.name ?? "";
  const del = (ids: string[]) => {
    const ws = ids.filter(id => id !== "draft"), d = ids.includes("draft") ? draft : undefined;
    const r = ws.length ? removeProjects(ws) : undefined;
    if (d) { setDraft(freshDraft()); store.set("iyarn.newstep", 1); }
    setUndo({ n: ids.length, r, d }); setAsk(null); setPicked([]); setPicking(false);
  };
  if (!hasDraft && !always) return null;
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
      {mode === "go" && !hasDraft && !undo && <p className="nb-help st-none">만들다 만 도안이 없습니다.<br />저장한 도안은 나의 도안집에서 고칠 수 있습니다.</p>}
      {mode === "go" && hasDraft && (
        <div className="st-go">
          {/* asked here, never with a browser dialog; the works can be brought back for a few seconds */}
          {ask && (
            <div className="st-ask-del" role="alertdialog" aria-label="지우기">
              <p>{ask.length > 1 ? `고른 ${ask.length}개를 지우시겠습니까?` : `'${nameOf(ask[0])}'을(를) 지우시겠습니까?`}</p>
              <button type="button" className="nb-link" autoFocus onClick={() => setAsk(null)}>취소</button>
              <button type="button" className="nb-link st-danger" onClick={() => del(ask)}>지우기</button>
            </div>
          )}
          <ul className="st-list">
            {rows.map(r => {
              const on = picked.includes(r.id);
              return (
                <li key={r.id} className={"st-row" + (on ? " is-on" : "")}>
                  <button type="button" aria-pressed={picking ? on : undefined} onClick={() => picking ? setPicked(x => on ? x.filter(i => i !== r.id) : [...x, r.id]) : r.open()}>
                    {picking && <i className="st-check" aria-hidden="true">{on ? "✓" : ""}</i>}
                    <b>{r.name}</b><span>{r.sub}</span>
                  </button>
                  {!picking && <button type="button" className="st-del" aria-label={`${r.name} 지우기`} title="지우기" onClick={() => setAsk([r.id])}>×</button>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {/* outside the list: with everything taken away it is still there to bring them back */}
      {undo && <p className="st-undo" role="status">{undo.n > 1 ? `${undo.n}개를 지웠습니다.` : "지웠습니다."} <button type="button" className="nb-link" onClick={() => { if (undo.r) restoreProjects(undo.r); if (undo.d) setDraft(undo.d); setUndo(null); }}>되돌리기</button></p>}
      <p className="st-foot" lang="en">with love · yarnity</p>
    </div>
  );
  return (
    <div className="st nb-web">
      <p className="st-ask">어디서부터 시작하시겠습니까?</p>
      <Tiles label="시작" value={mode ?? ""} cols={2} onPick={v => { onMode(v as "new" | "go"); if (v === "new") onFresh(); }}
        options={[["new", "새로 시작", "빈 종이에서"], ["go", "이어서 하기", "만들던 것 불러오기"]]} />
      {mode === "go" && !hasDraft && <p className="nb-help st-none">만들다 만 도안이 없습니다.<br />저장한 도안은 나의 도안집에서 고칠 수 있습니다.</p>}
      {mode === "go" && hasDraft && (
        <ul className="st-list">
          {hasDraft && (
            <li><button type="button" onClick={onDraft}>
              <b>{draft.name.trim() || "이름 없는 도안"}</b><span>만들던 도안{draft.itemPicked ? ` · ${draft.free || draft.paint ? "직접 그린 모양" : ITEM[itemIdOf(draft)].name}` : ""}</span>
            </button></li>
          )}
        </ul>
      )}
    </div>
  );
}
