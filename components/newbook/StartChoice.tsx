"use client";
// 새 도안 (Kim): start fresh, or go on with something - the draft left half made, or a work already in 나의 도안집
// (it opens in 도안 만들기 to be changed). Shown on the first page while there is something to go on with.
import type { Draft, Project } from "@/lib/types";
import { freshDraft, ITEM, itemIdOf } from "@/lib/items";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/components/AppProvider";
import { store } from "@/lib/store";
import { Tiles } from "./WebPages";
import { shots } from "@/lib/shots";
import { binder, type BinderEntry } from "@/lib/binder";

export function StartChoice({ draft, mode, onMode, onFresh, onDraft, onKept, always }: {
  draft: Draft; projects: Project[]; mode: "new" | "go" | null;
  onMode: (m: "new" | "go") => void; onFresh: () => void; onDraft: () => void; onOpen: (id: string) => void;
  /** a draft kept in the binder (a tab or put away) taken up to go on with */
  onKept: (id: string) => void;
  /** the first page on wide screens (Kim): this choice in place of the name, shown even with nothing to go on with */
  always?: boolean;
}) {
  const { setDraft } = useApp();
  const hasDraft = !draft.editOf && !!(draft.itemPicked || draft.name.trim() || draft.free || draft.paint);
  const [ask, setAsk] = useState<string | null>(null), [win, setWin] = useState(false);
  const [undo, setUndo] = useState<{ d?: Draft; e?: BinderEntry } | null>(null);
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(t); }, [undo]);
  // 이어서 하기 (Kim): every draft left half made - the one being worked on and the ones kept in the binder (tabs or
  // put away) - in one list; a row pointed at shows its piece as it looked when the 3D was closed
  const [kept, setKept] = useState<BinderEntry[]>([]);
  useEffect(() => { const f = () => setKept(binder.all()); f(); return binder.subscribe(f); }, []);
  const [hover, setHover] = useState<{ id: string; top: number; left: number } | null>(null);
  const kind = (d: Draft) => d.itemPicked ? (d.free || d.paint ? "직접 그린 모양" : ITEM[itemIdOf(d)].name) : "";
  const day = (t: number) => new Date(t).toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  const rows: { id: string; name: string; sub: string; shot: string; go: () => void }[] = [
    ...(hasDraft ? [{ id: "draft", name: draft.name.trim() || "이름 없는 도안", sub: ["지금 만들던 도안", kind(draft)].filter(Boolean).join(" · "), shot: "draft", go: () => { setWin(false); onDraft(); } }] : []),
    ...kept.map(e => ({ id: e.id, name: e.draft.name.trim() || "이름 없는 도안", sub: [kind(e.draft), day(e.at)].filter(Boolean).join(" · "), shot: "b-" + e.id, go: () => { setWin(false); onKept(e.id); } })),
    // saved works are not here (Kim): they are in 나의 도안집, changed only with 고치기
  ];
  const any = rows.length > 0;
  const del = (id: string) => {
    if (id === "draft") { setUndo({ d: draft }); setDraft(freshDraft()); store.set("iyarn.newstep", 1); }
    else { const e = kept.find(x => x.id === id); binder.remove(id); setUndo({ e }); }
    setAsk(null); setHover(null); if (rows.length <= 1) setWin(false);
  };
  const bringBack = () => { if (!undo) return; if (undo.d) setDraft(undo.d); if (undo.e) binder.put(undo.e); setUndo(null); };
  if (!hasDraft && !always && !kept.length) return null;
  const hv = hover && rows.find(r => r.id === hover.id), pic = hv ? shots.get(hv.shot) : null;
  // Kim: the list opens in a window of its own when 이어서 하기 is pressed, not under the button
  const list = win && any && createPortal(
    <div className="st-pv-dim" onMouseDown={e => { if (e.target === e.currentTarget) { setWin(false); setHover(null); } }}>
    <div className="st-pv st-go" role="dialog" aria-modal="true" aria-label="만들던 도안" onMouseLeave={() => setHover(null)}>
      <p className="st-pv-title"><b>만들던 도안</b><span>{rows.length}개</span></p>
      {ask && (
        <div className="st-ask-del" role="alertdialog" aria-label="지우기">
          {/* asked here, never with a browser dialog; it can be brought back for a few seconds */}
          <p>{`'${rows.find(r => r.id === ask)?.name ?? ""}'을(를) 지우시겠습니까?`}</p>
          <button type="button" className="nb-link" autoFocus onClick={() => setAsk(null)}>취소</button>
          <button type="button" className="nb-link st-danger" onClick={() => del(ask)}>지우기</button>
        </div>
      )}
      <ul className="st-list" onScroll={() => setHover(null)}>
        {rows.map(r => {
          // beside the window, on its left (or its right when there is no room)
          const show = (el: HTMLElement) => { const b = el.getBoundingClientRect(), u = (el.closest(".st-pv") as HTMLElement).getBoundingClientRect(), w = 240;
            setHover({ id: r.id, top: Math.max(8, Math.min(b.top, window.innerHeight - 300)), left: u.left - w - 18 >= 8 ? u.left - w - 18 : Math.min(u.right + 18, window.innerWidth - w - 8) }); };
          return (
            <li key={r.id} className={"st-row" + (hover?.id === r.id ? " is-on" : "")}>
              <button type="button" onClick={r.go} onMouseEnter={e => show(e.currentTarget)} onFocus={e => show(e.currentTarget)}>
                <b>{r.name}</b><span>{r.sub}</span>
              </button>
              <button type="button" className="st-del" aria-label={`${r.name} 지우기`} title="지우기" onClick={() => setAsk(r.id)}>×</button>
            </li>
          );
        })}
      </ul>
      {/* the piece of the row pointed at, beside the list */}
      {hv && createPortal(
        <div className="st-peek" style={{ top: hover!.top, left: hover!.left }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {pic ? <img src={pic} alt="" /> : <p>아직 사진이 없습니다.<br />3D를 닫을 때 그 모습이 남습니다.</p>}
          <b>{hv.name}</b>
        </div>, document.body
      )}
      <div className="st-pv-acts"><button type="button" className="nb-link st-muted" onClick={() => { setWin(false); setHover(null); }}>닫기</button></div>
    </div>
    </div>, document.body
  );
  const none = mode === "go" && !any && !undo && <p className="nb-help st-none">만들다 만 도안이 없습니다.<br />저장한 도안은 나의 도안집에서 고칠 수 있습니다.</p>;
  // outside the list: with everything taken away it is still there to bring them back
  const back = undo && <p className="st-undo" role="status">지웠습니다. <button type="button" className="nb-link" onClick={bringBack}>되돌리기</button></p>;
  if (always) return (
    <div className="st st-big">
      <p className="st-kicker" lang="en">new pattern</p>
      <p className="st-ask">어디서부터 시작하시겠습니까?</p>
      <span className="st-rule" aria-hidden="true" />
      <div className="st-labels" role="group" aria-label="시작">
        <button type="button" className="tp-label st-label" aria-pressed={mode === "new"} onClick={() => { onMode("new"); onFresh(); }}>
          <span className="tp-label-top" lang="en">from scratch</span><b>새로 시작</b><span className="st-desc">빈 종이에서</span>
        </button>
        <button type="button" className="tp-label st-label st-label-b" aria-pressed={mode === "go"} aria-expanded={mode === "go"} onClick={() => { onMode("go"); setWin(true); }}>
          <span className="tp-label-top" lang="en">continue</span><b>이어서 하기</b><span className="st-desc">만들던 것 불러오기</span>
        </button>
      </div>
      {none}{list}{back}
      <p className="st-foot" lang="en">with love · yarnity</p>
    </div>
  );
  return (
    <div className="st nb-web">
      <p className="st-ask">어디서부터 시작하시겠습니까?</p>
      <Tiles label="시작" value={mode ?? ""} cols={2} onPick={v => { onMode(v as "new" | "go"); if (v === "new") onFresh(); else setWin(true); }}
        options={[["new", "새로 시작", "빈 종이에서"], ["go", "이어서 하기", "만들던 것 불러오기"]]} />
      {none}{list}{back}
    </div>
  );
}
