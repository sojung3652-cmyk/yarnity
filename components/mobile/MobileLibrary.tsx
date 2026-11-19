"use client";
// 나의 도안집 on phones (/library): an e-book "my library" on plain paper. A header (MY LIBRARY · 나의 도안집,
// search and list / grid buttons), the status tabs with counts, the work being made as a 이어서 뜨기 card,
// the sort, then the works as book covers three to a row (the yarn colour as the cover, a small spiral,
// a gold-edged paper label with the name, a gold check stamp on finished ones) and a dashed "+ 새 도안".
// Each cover's ⋯ opens a sheet with the same actions as 내 작품 (app/mine): 이어 뜨기, 도안 고치기, 중단 /
// 다시 시작, 완성으로 표시, 사진 기록, 복제, 삭제 (asked first, undoable for 6 seconds).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, type Removed } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { PhotoLog } from "@/components/PhotoLog";
import { ITEM, itemIdOf } from "@/lib/items";
import { dropOrphans } from "@/lib/photos";
import { STATUS_KO, statusOf, type Status } from "@/lib/status";
import { store } from "@/lib/store";
import type { Project } from "@/lib/types";
import { progressOf } from "./MobileHome";
import { useNewDraft } from "./useNewDraft";

type Filter = "all" | Status;
type Sort = "recent" | "created" | "name";
const SORT_KO: Record<Sort, string> = { recent: "최근 뜬 순", created: "만든 순", name: "이름순" };
const VIEW_KEY = "m.libview";
const haystack = (p: Project) => [p.name, ITEM[itemIdOf(p)].name, p.yarn, ...(p.materials ?? []), p.blend, p.colorName, p.colorNo, p.lot].filter(Boolean).join(" ").toLowerCase();
const I = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Cover({ p, small }: { p: Project; small?: boolean }) {
  const done = statusOf(p) === "done";
  return (
    <span className={"lb-cover" + (small ? " is-small" : "")} style={{ background: p.color || "#F1EADF" }} aria-hidden="true">
      <span className="lb-cover-grain" />
      <span className="lb-mini-spiral">{Array.from({ length: small ? 4 : 6 }, (_, i) => <i key={i} />)}</span>
      {!small && <span className="lb-cover-label"><span>{p.name}</span></span>}
      {done && !small && (
        <span className="lb-stamp"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      )}
    </span>
  );
}

function Sheet({ p, onClose, act }: { p: Project; onClose: () => void; act: (a: string) => void }) {
  const st = statusOf(p), [asking, setAsking] = useState(false), ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("button")?.focus(); }, [asking]);
  const items: [string, string][] = [["resume", "이어 뜨기"], ["view", "도안 보기"], ["edit", "도안 고치기"], st === "paused" ? ["unpause", "다시 시작하기"] : ["pause", "중단하기"],
    ...(st !== "done" ? [["done", "완성으로 표시"] as [string, string]] : []), ["photos", "사진 기록"], ["copy", "복제"]];
  return (
    <div className="lb-sheet-bg" onClick={onClose}>
      <div ref={ref} className="lb-sheet" role="dialog" aria-modal="true" aria-label={`${p.name} 메뉴`} onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); onClose(); } }}>
        <p className="lb-sheet-title">{p.name}</p>
        {asking ? (
          <div className="lb-ask">
            <p>이 작품을 지울까요?</p>
            <button type="button" onClick={() => setAsking(false)}>취소</button>
            <button type="button" className="danger" onClick={() => act("delete-now")}>지우기</button>
          </div>
        ) : (
          <>
            {items.map(([k, t]) => <button key={k} type="button" onClick={() => act(k)}>{t}</button>)}
            <button type="button" className="danger" onClick={() => setAsking(true)}>삭제</button>
          </>
        )}
      </div>
    </div>
  );
}

export function MobileLibrary() {
  const { ready, projects, active, setActive, updateProject, addProject, removeProjects, restoreProjects } = useApp();
  const router = useRouter(), book = useBook(), newDraft = useNewDraft();
  const [q, setQ] = useState(""), [finding, setFinding] = useState(false), [filter, setFilter] = useState<Filter>("all"), [sort, setSort] = useState<Sort>("recent");
  const [grid, setGrid] = useState(true), [menu, setMenu] = useState<string | null>(null), [photoFor, setPhotoFor] = useState<string | null>(null);
  const [undo, setUndo] = useState<Removed | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setGrid(store.get<string>(VIEW_KEY, "grid") !== "list"); }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (ready && !undo) dropOrphans(projects.map(p => p.id)).catch(() => {}); }, [ready, undo, projects]);

  const counts = useMemo(() => { const c = { all: projects.length, knitting: 0, paused: 0, done: 0 }; projects.forEach(p => c[statusOf(p)]++); return c; }, [projects]);
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = projects.filter(p => (filter === "all" || statusOf(p) === filter) && words.every(w => haystack(p).includes(w)));
    return [...list].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ko") : sort === "created" ? b.created - a.created : (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created));
  }, [projects, q, filter, sort]);
  const going = useMemo(() => {
    if (active && statusOf(active) === "knitting") return active;
    return [...projects].filter(p => statusOf(p) === "knitting").sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created))[0] ?? null;
  }, [projects, active]);

  const act = (p: Project) => (a: string) => {
    setMenu(null);
    if (a === "resume") { setActive(p.id); if (statusOf(p) === "paused") updateProject(p.id, { status: "knitting", pausedAt: null }); router.push("/track"); }
    else if (a === "view") { setActive(p.id); router.push("/pattern"); }
    else if (a === "edit") book.editHere(p.id);
    else if (a === "pause") updateProject(p.id, { status: "paused", pausedAt: Date.now() });
    else if (a === "unpause") updateProject(p.id, { status: "knitting", pausedAt: null });
    else if (a === "done") updateProject(p.id, { status: "done", pausedAt: null });
    else if (a === "photos") setPhotoFor(p.id);
    else if (a === "copy") { const now = Date.now(); addProject({ ...p, id: "p" + now.toString(36), name: `${p.name} (복제)`.slice(0, 30), current: 0, measuredH: null, measuredW: null, status: "knitting", pausedAt: null, created: now, updatedAt: now }); }
    else if (a === "delete-now") {
      if (timer.current) clearTimeout(timer.current);
      setUndo(removeProjects([p.id])); timer.current = setTimeout(() => setUndo(null), 6000);
    }
  };
  const setView = (g: boolean) => { setGrid(g); store.set(VIEW_KEY, g ? "grid" : "list"); };
  const menuP = menu ? projects.find(x => x.id === menu) : null;
  const g = going ? progressOf(going) : null;

  return (
    <main id="view-library" className="m-root lb">
      <header className="lb-head">
        <div><p className="lb-kicker" lang="en">My library</p><h1>나의 도안집</h1></div>
        <div className="lb-tools">
          <button type="button" className="lb-icon" aria-label="찾기" aria-expanded={finding} onClick={() => { setFinding(f => !f); if (finding) setQ(""); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" {...I} /><path d="m15 15 5 5" {...I} /></svg>
          </button>
          <button type="button" className="lb-icon" aria-label={grid ? "목록으로 보기" : "표지로 보기"} onClick={() => setView(!grid)}>
            {grid
              ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11" {...I} /><circle cx="4.8" cy="6.5" r=".9" fill="currentColor" /><circle cx="4.8" cy="12" r=".9" fill="currentColor" /><circle cx="4.8" cy="17.5" r=".9" fill="currentColor" /></svg>
              : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="7" rx="1" {...I} /><rect x="13.5" y="4" width="6.5" height="7" rx="1" {...I} /><rect x="4" y="13.5" width="6.5" height="7" rx="1" {...I} /><rect x="13.5" y="13.5" width="6.5" height="7" rx="1" {...I} /></svg>}
          </button>
        </div>
      </header>
      {finding && (
        <label className="lb-find" htmlFor="lbSearch">
          <span className="sr">작품 찾기</span>
          <input id="lbSearch" type="search" autoFocus autoComplete="off" placeholder="이름, 품목, 실, LOT로 찾기" value={q} onChange={e => setQ(e.target.value)} />
        </label>
      )}
      <div className="lb-tabs" role="tablist" aria-label="상태로 거르기">
        {(["all", "knitting", "paused", "done"] as Filter[]).map(f => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "전체" : STATUS_KO[f]} <span>{counts[f]}</span></button>
        ))}
      </div>

      {ready && going && g && filter !== "done" && filter !== "paused" && !q && (
        <button type="button" className="lb-going" onClick={() => { setActive(going.id); router.push("/track"); }}>
          <Cover p={going} small />
          <span className="lb-going-text">
            <small>이어서 뜨기</small>
            <b>{going.name}</b>
            <span>{`${g.where} · ${g.pos}`}</span>
            <span className="lb-going-bar" aria-hidden="true"><i style={{ width: g.pct * 100 + "%" }} /></span>
          </span>
        </button>
      )}

      <div className="lb-sortrow">
        <label className="sr" htmlFor="lbSort">정렬</label>
        <select id="lbSort" value={sort} onChange={e => setSort(e.target.value as Sort)}>{(Object.keys(SORT_KO) as Sort[]).map(s => <option key={s} value={s}>{SORT_KO[s]}</option>)}</select>
      </div>

      {ready && (shown.length || !q) ? (
        <ul className={grid ? "lb-grid" : "lb-list"}>
          {shown.map(p => {
            const st = statusOf(p), pr = progressOf(p);
            return (
              <li key={p.id}>
                <Link href="/pattern" className="lb-book" onClick={() => setActive(p.id)}>
                  <Cover p={p} small={!grid} />
                  <span className="lb-meta"><span className="lb-name">{p.name}</span><span className={"lb-st is-" + st}>{`${STATUS_KO[st]} · ${Math.round(pr.pct * 100)}%`}</span></span>
                </Link>
                <button type="button" className="lb-more" aria-label={`${p.name} 메뉴`} aria-haspopup="dialog" onClick={() => setMenu(p.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18" cy="12" r="1.3" fill="currentColor" /></svg>
                </button>
              </li>
            );
          })}
          {!q && (
            <li>
              <button type="button" className="lb-new" onClick={newDraft}>
                <span className="lb-new-cover" aria-hidden="true">+</span>
                <span className="lb-meta"><span className="lb-name">새 도안</span></span>
              </button>
            </li>
          )}
        </ul>
      ) : ready ? <p className="lb-none">찾는 작품이 없어요</p> : null}
      <p className="lb-note">작품과 사진은 이 브라우저에만 저장돼요.</p>

      {menuP && <Sheet p={menuP} onClose={() => setMenu(null)} act={act(menuP)} />}
      {photoFor && <PhotoLog projectId={photoFor} name={projects.find(x => x.id === photoFor)?.name ?? ""} onClose={() => setPhotoFor(null)} onChange={() => {}} />}
      {undo && (
        <div className="lb-undo" role="status">
          <span>지웠어요</span>
          <button type="button" onClick={() => { restoreProjects(undo); setUndo(null); if (timer.current) clearTimeout(timer.current); }}>되돌리기</button>
        </div>
      )}
    </main>
  );
}
