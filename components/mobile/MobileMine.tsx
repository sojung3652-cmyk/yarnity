"use client";
// 나의 도안집 on phones (/mine): its own screen, not a page of the book. The same works, storage and actions as
// the web's 내 작품 (app/mine): search, status tabs, sort, 도안 보기, 이어서 뜨기, 사진 기록 and the ⋯ menu
// (도안 고치기, 중단 / 다시 시작, 완성으로 표시, 이름 바꾸기, 복제, 삭제 with 6 seconds to undo).
// Layout: a top bar (‹ 처음으로, the gold wordmark, + 새 도안), the My Patterns title, the work on the hook as
// a cloth card, the tabs (and a search that opens), then the works as books on shelves, two to a shelf. A
// book opens a sheet from the bottom with everything about it. Light comes from the upper right: every
// shadow falls to the lower left. Styles: mine-mobile.css.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, type Removed } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { BookCover, GoldDefs, ProgressBar, tagOf, whereOf } from "@/components/BookCover";
import { LaceButton } from "@/components/diary/Diary";
import { CoverPicker } from "@/components/diary/CoverPicker";
import { PhotoLog } from "@/components/PhotoLog";
import { CopyLot } from "@/components/YarnInfo";
import { ITEM, itemIdOf } from "@/lib/items";
import { dropOrphans } from "@/lib/photos";
import { STATUS_KO, statusOf, type Status } from "@/lib/status";
import type { Project } from "@/lib/types";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";
import { useNewDraft } from "./useNewDraft";
import { MobileTopBar, NewButton } from "./MobileTopBar";
import "./mine-mobile.css";

type Filter = "all" | Status;
type Sort = "recent" | "created" | "name";
const SORT_KO: Record<Sort, string> = { recent: "최근에 뜬 순", created: "만든 순", name: "이름순" };
const haystack = (p: Project) => [p.name, ITEM[itemIdOf(p)].name, p.yarn, ...(p.materials ?? []), p.blend, p.colorName, p.colorNo, p.lot].filter(Boolean).join(" ").toLowerCase();
const recent = (p: Project) => p.updatedAt ?? p.created;
const I = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const where = whereOf;
const Cover = BookCover, Bar = ProgressBar;

export function MobileMine() {
  const { ready, projects, setActive, updateProject, addProject, removeProjects, restoreProjects } = useApp();
  const router = useRouter(), book = useBook(), newDraft = useNewDraft();
  const [q, setQ] = useState(""), [finding, setFinding] = useState(false), [filter, setFilter] = useState<Filter>("all"), [sort, setSort] = useState<Sort>("recent");
  const [open, setOpen] = useState<string | null>(null), [photoFor, setPhotoFor] = useState<string | null>(null);
  const [undo, setUndo] = useState<Removed | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (ready && !undo) dropOrphans(projects.map(p => p.id)).catch(() => {}); }, [ready, undo, projects]);

  const counts = useMemo(() => { const c = { all: projects.length, knitting: 0, paused: 0, done: 0 }; projects.forEach(p => c[statusOf(p)]++); return c; }, [projects]);
  // the work on the hook: the most recently knitted one that is going (started, not paused or done)
  const hook = useMemo(() => [...projects].filter(p => statusOf(p) === "knitting" && (p.current || 0) > 0).sort((a, b) => recent(b) - recent(a))[0] ?? null, [projects]);
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = projects.filter(p => (filter === "all" || statusOf(p) === filter) && words.every(w => haystack(p).includes(w)) && !(filter === "all" && !q && hook && p.id === hook.id));
    return [...list].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ko") : sort === "created" ? b.created - a.created : recent(b) - recent(a));
  }, [projects, q, filter, sort, hook]);
  // smaller books (Kim): three to a shelf
  const shelves = useMemo(() => { const out: Project[][] = []; for (let i = 0; i < shown.length; i += 3) out.push(shown.slice(i, i + 3)); return out; }, [shown]);

  const act = (p: Project) => (a: string, v?: string) => {
    if (a === "view") { setActive(p.id); router.push("/pattern"); }
    else if (a === "resume") { setActive(p.id); if (statusOf(p) === "paused") updateProject(p.id, { status: "knitting", pausedAt: null }); router.push("/track"); }
    else if (a === "again") { // 다시 뜨기: a fresh copy to knit, the finished one stays as it is
      const now = Date.now(), id = "p" + now.toString(36);
      addProject({ ...p, id, name: p.name.slice(0, 30), current: 0, measuredH: null, measuredW: null, status: "knitting", pausedAt: null, created: now, updatedAt: now });
      setActive(id); router.push("/track");
    }
    else if (a === "edit") book.editHere(p.id);
    else if (a === "photos") setPhotoFor(p.id);
    else if (a === "pause") updateProject(p.id, { status: "paused", pausedAt: Date.now() });
    else if (a === "unpause") updateProject(p.id, { status: "knitting", pausedAt: null });
    else if (a === "done") updateProject(p.id, { status: "done", pausedAt: null });
    else if (a === "rename" && v) updateProject(p.id, { name: v });
    else if (a === "cover" && v) updateProject(p.id, { cover: v });
    else if (a === "copy") { const now = Date.now(); addProject({ ...p, id: "p" + now.toString(36), name: `${p.name} (복제)`.slice(0, 30), current: 0, measuredH: null, measuredW: null, status: "knitting", pausedAt: null, created: now, updatedAt: now }); }
    else if (a === "delete") {
      setOpen(null); if (timer.current) clearTimeout(timer.current);
      setUndo(removeProjects([p.id])); timer.current = setTimeout(() => setUndo(null), 6000);
    }
  };
  const openP = open ? projects.find(x => x.id === open) ?? null : null;
  const hw = hook ? where(hook) : null;

  return (
    <main id="view-mine" className="mm">
      <GoldDefs />
      <MobileTopBar back={() => router.push("/")} logo={96} right={<NewButton onClick={newDraft} />} />
      <div className="mm-title">
        <h1 lang="en"><img src="/pic/my-patterns.png" alt="My Patterns" width={900} height={366} /></h1>
        <p>나의 도안집 · {projects.length}권</p>
      </div>

      {!ready ? null : !projects.length && !undo ? (
        <section className="mm-empty">
          <div className="mm-shelf" aria-hidden="true" />
          <p>아직 도안이 없어요</p>
          <button type="button" className="mm-new is-big" onClick={newDraft}><span>+ 새 도안 만들기</span></button>
        </section>
      ) : (
        <>
          {hook && hw && (
            <section className="mm-hook" aria-labelledby="mmHook">
              <p className="mm-kick" id="mmHook" lang="en">On the hook <span lang="ko">· 지금 뜨는 중</span></p>
              <div className="mm-card">
                {/* the work's sheet (도안 고치기 ... 삭제), as tapping its cover does (Kim: delete was not to be found) */}
                <button type="button" className="mm-card-more" aria-label={`${hook.name} 더 보기`} aria-haspopup="dialog" onClick={() => setOpen(hook.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" /></svg>
                </button>
                <div className="mm-card-in">
                  <button type="button" className="mm-card-cover" aria-label={`${hook.name} 자세히`} onClick={() => setOpen(hook.id)}><Cover p={hook} w={74} /></button>
                  <div className="mm-card-text">
                    <p className="mm-small">{ITEM[itemIdOf(hook)].name}</p>
                    <h2>{hook.name}</h2>
                    <p className="mm-where">{hw.long}</p>
                    <Bar pct={hw.pct} />
                    <p className="mm-small">{[yarnWeightText(hook), hookLabel(hookMmOf(hook))].filter(t => t && t !== "—").join(" · ")}</p>
                  </div>
                </div>
                <div className="mm-card-btns">
                  <button type="button" className="mm-label is-cream" onClick={() => act(hook)("view")}><span>도안 보기</span></button>
                  {/* the same cloth label as 도안 보기, in lavender (Kim) */}
                <button type="button" className="mm-label is-lavender" onClick={() => act(hook)("resume")}><span>이어서 뜨기 →</span></button>
                </div>
              </div>
            </section>
          )}

          <div className="mm-tools">
            <div className="mm-tabs" role="tablist" aria-label="상태로 거르기">
              {(["all", "knitting", "paused", "done"] as Filter[]).map(f => (
                <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "전체" : STATUS_KO[f]} <span>{counts[f]}</span></button>
              ))}
              <button type="button" className="mm-find-btn" aria-expanded={finding} onClick={() => { setFinding(f => !f); if (finding) setQ(""); }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" {...I} /><path d="m15 15 4.5 4.5" {...I} /></svg>찾기
              </button>
            </div>
            {finding && (
              <label className="mm-find" htmlFor="mmSearch"><span className="sr">작품 찾기</span>
                <input id="mmSearch" type="search" autoFocus autoComplete="off" placeholder="이름, 품목, 실, LOT로 찾기" value={q} onChange={e => setQ(e.target.value)} />
              </label>
            )}
            <div className="mm-sortrow">
              <label className="sr" htmlFor="mmSort">정렬</label>
              <select id="mmSort" value={sort} onChange={e => setSort(e.target.value as Sort)}>{(Object.keys(SORT_KO) as Sort[]).map(s => <option key={s} value={s}>{SORT_KO[s]}</option>)}</select>
            </div>
          </div>

          {shown.length ? (
            <div className="mm-shelves">
              {shelves.map((row, i) => (
                <div key={i} className="mm-row">
                  <ul className="mm-books">
                    {row.map(p => {
                      const w = where(p);
                      return (
                        <li key={p.id}>
                          <button type="button" className="mm-book" onClick={() => setOpen(p.id)}>
                            <Cover p={p} />
                            <span className="mm-name">{p.name}</span>
                            <span className="mm-where">{w.short}</span>
                            <Bar pct={w.pct} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mm-shelf" aria-hidden="true" />
                </div>
              ))}
            </div>
          ) : <p className="mm-none">{q ? "찾는 작품이 없어요" : "이 칸에는 아직 작품이 없어요"}</p>}
          <p className="mm-note">작품과 사진은 이 브라우저에만 저장돼요.</p>
        </>
      )}

      {openP && <Sheet p={openP} onClose={() => setOpen(null)} act={act(openP)} />}
      {photoFor && <PhotoLog projectId={photoFor} name={projects.find(x => x.id === photoFor)?.name ?? ""} onClose={() => setPhotoFor(null)} onChange={() => {}} />}
      {undo && (
        <div className="mm-undo" role="status">
          <span>지웠어요</span>
          <button type="button" onClick={() => { restoreProjects(undo); setUndo(null); if (timer.current) clearTimeout(timer.current); }}>되돌리기</button>
        </div>
      )}
    </main>
  );
}

/** A work's sheet, from the bottom: its cover and progress, what it is made with, its buttons and the ⋯ menu
 *  as small links. Swipe it down or tap the dim to close. */
function Sheet({ p, onClose, act }: { p: Project; onClose: () => void; act: (a: string, v?: string) => void }) {
  const it = ITEM[itemIdOf(p)], st = statusOf(p), w = where(p);
  const [asking, setAsking] = useState(false), [renaming, setRenaming] = useState(false), [name, setName] = useState(p.name);
  const y0 = useRef<number | null>(null), [drag, setDrag] = useState(0);
  const yarn = [p.yarn, p.colorName ? p.colorName + (p.colorNo ? ` ${p.colorNo}` : "") : "", yarnWeightText(p) !== "—" ? yarnWeightText(p) : ""].filter(Boolean).join(" · ");
  const hookText = hookLabel(hookMmOf(p));
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  const menu: [string, string][] = [["edit", "도안 고치기"], st === "paused" ? ["unpause", "다시 시작하기"] : ["pause", "중단하기"], ...(st !== "done" ? [["done", "완성으로 표시"] as [string, string]] : []), ["rename", "이름 바꾸기"], ["cover", "표지 바꾸기"], ["copy", "복제"]];
  const [picking, setPicking] = useState(false);
  if (picking) return <CoverPicker p={p} onPick={id => { act("cover", id); setPicking(false); }} onClose={() => setPicking(false)} />;
  return (
    <div className="mm-dim" onClick={onClose}>
      <div className="mm-sheet" role="dialog" aria-modal="true" aria-label={p.name} onClick={e => e.stopPropagation()} style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
        onTouchStart={e => { y0.current = (e.target as Element).closest(".mm-sheet-scroll")?.scrollTop ? null : e.touches[0].clientY; }}
        onTouchMove={e => { if (y0.current != null) setDrag(Math.max(0, e.touches[0].clientY - y0.current)); }}
        onTouchEnd={() => { if (drag > 90) onClose(); setDrag(0); y0.current = null; }}>
        <span className="mm-grip" aria-hidden="true" />
        <div className="mm-sheet-scroll">
          <div className="mm-sheet-head">
            <Cover p={p} w={96} />
            <div>
              <p className="mm-small">{it.name} · {tagOf(p)}</p>
              {renaming ? (
                <form className="mm-rename" onSubmit={e => { e.preventDefault(); const n = name.trim().slice(0, 30); if (n) act("rename", n); setRenaming(false); }}>
                  <label className="sr" htmlFor="mmName">작품 이름</label>
                  <input id="mmName" autoFocus maxLength={30} value={name} onChange={e => setName(e.target.value)} />
                  <button type="submit">저장</button>
                </form>
              ) : <h2>{p.name}</h2>}
              <p className="mm-where">{w.long}</p>
              <Bar pct={w.pct} />
            </div>
          </div>
          <dl className="mm-info">
            {yarn && <div><dt>실</dt><dd>{yarn}</dd></div>}
            {hookText && hookText !== "—" && <div><dt>바늘</dt><dd>{hookText}</dd></div>}
            {p.lot && <div><dt>LOT</dt><dd>{p.lot} <CopyLot lot={p.lot} /></dd></div>}
          </dl>
          <div className="mm-sheet-btns">
            <button type="button" className="mm-label is-cream" onClick={() => act("view")}><span>도안 보기</span></button>
            <button type="button" className="mm-label is-rose" onClick={() => { act("photos"); }}><span>사진 기록</span></button>
          </div>
          {w.done
            ? <button type="button" className="mm-label is-cream mm-again" onClick={() => act("again")}><span>다시 뜨기</span></button>
            : <LaceButton variant="lavender" width="fill" className="mm-lace" onClick={() => act("resume")}>{w.started ? `이어서 뜨기 · ${w.next}부터 →` : "뜨기 시작 →"}</LaceButton>}
          {asking ? (
            <p className="mm-ask">이 작품을 지울까요? <button type="button" onClick={() => setAsking(false)}>취소</button><button type="button" className="danger" onClick={() => act("delete")}>지우기</button></p>
          ) : (
            <nav className="mm-menu" aria-label="더 보기">
              {menu.map(([k, t]) => <button key={k} type="button" onClick={() => (k === "rename" ? setRenaming(true) : k === "cover" ? setPicking(true) : act(k))}>{t}</button>)}
              <button type="button" className="danger" onClick={() => setAsking(true)}>삭제</button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
