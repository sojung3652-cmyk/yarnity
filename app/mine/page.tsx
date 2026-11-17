"use client";
// 내 작품: search, filter by status, sort, and per-work actions (⋯ menu: 이어 뜨기, 중단/다시 시작, 완성으로
// 표시, 이름 바꾸기, 복제, 삭제). Deleting asks in place (no confirm()) and can be undone for 6 seconds;
// "고르기" deletes several at once. Paper and hairline styling (mine.css), no rounded boxes.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, type Removed } from "@/components/AppProvider";
import { CopyLot } from "@/components/YarnInfo";
import { ITEM, itemIdOf } from "@/lib/items";
import { plan } from "@/lib/pattern";
import { STATUS_KO, statusOf, type Status } from "@/lib/status";
import type { Project } from "@/lib/types";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";
import "./mine.css";

type Filter = "all" | Status;
type Sort = "recent" | "created" | "name";
const SORT_KO: Record<Sort, string> = { recent: "최근에 뜬 순", created: "만든 순", name: "이름순" };
const day = (t: number) => new Date(t).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });

/** everything a search can match: name, item, yarn, materials, colour (+ number), LOT */
const haystack = (p: Project) => [p.name, ITEM[itemIdOf(p)].name, p.yarn, ...(p.materials ?? []), p.blend, p.colorName, p.colorNo, p.lot].filter(Boolean).join(" ").toLowerCase();

function Menu({ p, onClose, act }: { p: Project; onClose: () => void; act: (a: string) => void }) {
  const ref = useRef<HTMLDivElement>(null), st = statusOf(p);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const out = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !(e.target as Element).closest?.(".mc-more")) onClose(); };
    document.addEventListener("mousedown", out); return () => document.removeEventListener("mousedown", out);
  }, [onClose]);
  const items: [string, string][] = [["resume", "이어 뜨기"], st === "paused" ? ["unpause", "다시 시작하기"] : ["pause", "중단하기"], ...(st !== "done" ? [["done", "완성으로 표시"] as [string, string]] : []), ["rename", "이름 바꾸기"], ["copy", "복제"], ["delete", "삭제"]];
  return (
    <div ref={ref} className="mc-menu" role="menu" aria-label={`${p.name} 메뉴`}
      onKeyDown={e => {
        const bs = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])], i = bs.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === "Escape") { e.preventDefault(); onClose(); }
        if (e.key === "ArrowDown") { e.preventDefault(); bs[(i + 1) % bs.length]?.focus(); }
        if (e.key === "ArrowUp") { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length]?.focus(); }
      }}>
      {items.map(([k, t]) => <button key={k} type="button" role="menuitem" className={k === "delete" ? "danger" : ""} onClick={() => act(k)}>{t}</button>)}
    </div>
  );
}

function Card({ p, picking, picked, onPick, menuOpen, setMenu, confirm, setConfirm, act }: {
  p: Project; picking: boolean; picked: boolean; onPick: () => void; menuOpen: boolean; setMenu: (o: boolean) => void;
  confirm: boolean; setConfirm: (o: boolean) => void; act: (a: string, v?: string) => void;
}) {
  const pp = plan(p), total = pp.rows.length, cur = Math.min(p.current || 0, total), st = statusOf(p);
  const [renaming, setRenaming] = useState(false), [name, setName] = useState(p.name);
  const yarn = [p.yarn, p.materials?.join("·"), p.colorName ? p.colorName + (p.colorNo ? ` ${p.colorNo}` : "") : "", yarnWeightText(p), hookLabel(hookMmOf(p))].filter(Boolean).join(" · ");
  const where = st === "done" ? "완성" : st === "paused" ? `${cur ? `${pp.rows[cur - 1].label}에서 멈춤` : "시작 전에 멈춤"}${p.pausedAt ? ` · ${day(p.pausedAt)}` : ""}` : cur ? `${cur} / ${total} · 다음 ${pp.rows[cur].label}` : `${total}단 · 아직 시작 전`;
  const commitName = () => { const n = name.trim().slice(0, 30); if (n && n !== p.name) act("rename-save", n); setRenaming(false); };

  if (confirm) return (
    <article className="mc mc-confirm" aria-live="polite">
      <p>이 작품을 지울까요? <span>되돌릴 수 없어요.</span></p>
      <div className="mc-actions">
        <button type="button" className="mc-text" autoFocus onClick={() => setConfirm(false)}>취소</button>
        <button type="button" className="mc-text danger" onClick={() => act("delete-now")}>지우기</button>
      </div>
    </article>
  );
  return (
    <article className={`mc mc-${st}` + (picked ? " picked" : "")}>
      {picking && <label className="mc-check"><input type="checkbox" checked={picked} onChange={onPick} /><span className="sr">{p.name} 고르기</span></label>}
      <div className="mc-top">
        <span className="mc-item">{ITEM[itemIdOf(p)].name}{st !== "knitting" && <em className={`mc-badge ${st}`}>{STATUS_KO[st]}</em>}</span>
        {!picking && <button type="button" className="mc-more" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`${p.name} 메뉴`} onClick={() => setMenu(!menuOpen)}>⋯</button>}
      </div>
      {renaming ? (
        <input className="mc-rename" autoFocus maxLength={30} aria-label="새 이름" value={name} onChange={e => setName(e.target.value)} onBlur={commitName}
          onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setName(p.name); setRenaming(false); } }} />
      ) : picking ? <h3 className="mc-name">{p.name}</h3> : <h3 className="mc-name"><Link href="/track" onClick={() => act("open")}>{p.name}</Link></h3>}
      <div className="mc-bar" aria-hidden="true"><i style={{ width: `${st === "done" ? 100 : Math.round((cur / total) * 100)}%` }} /></div>
      <p className="mc-where">{where}</p>
      <p className="mc-yarn">{yarn}{p.lot && <span className="mc-lot">LOT <b>{p.lot}</b><CopyLot lot={p.lot} /></span>}</p>
      {!picking && <p className="mc-links"><Link href="/pattern" onClick={() => act("view")}>도안 보기</Link><Link href="/track" onClick={() => act("open")}>{st === "done" ? "뜨기 기록" : "이어서 뜨기"}</Link></p>}
      {menuOpen && <Menu p={p} onClose={() => setMenu(false)} act={k => { setMenu(false); if (k === "rename") { setName(p.name); setRenaming(true); } else act(k); }} />}
    </article>
  );
}

function List() {
  const { ready, projects, setActive, updateProject, addProject, removeProjects, restoreProjects } = useApp();
  const router = useRouter();
  const [q, setQ] = useState(""), [filter, setFilter] = useState<Filter>("all"), [sort, setSort] = useState<Sort>("recent");
  const [menu, setMenu] = useState<string | null>(null), [confirm, setConfirm] = useState<string | null>(null);
  const [picking, setPicking] = useState(false), [picked, setPicked] = useState<string[]>([]), [askMany, setAskMany] = useState(false);
  const [undo, setUndo] = useState<{ r: Removed; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const counts = useMemo(() => { const c = { all: projects.length, knitting: 0, paused: 0, done: 0 }; projects.forEach(p => c[statusOf(p)]++); return c; }, [projects]);
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = projects.filter(p => (filter === "all" || statusOf(p) === filter) && words.every(w => haystack(p).includes(w)));
    return [...list].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ko") : sort === "created" ? b.created - a.created : (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created));
  }, [projects, q, filter, sort]);

  const removed = (r: Removed) => {
    if (timer.current) clearTimeout(timer.current);
    setUndo({ r, n: r.items.length }); timer.current = setTimeout(() => setUndo(null), 6000);
  };
  const act = (p: Project) => (a: string, v?: string) => {
    if (a === "open" || a === "resume") { setActive(p.id); if (statusOf(p) === "paused") updateProject(p.id, { status: "knitting", pausedAt: null }); if (a === "resume") router.push("/track"); }
    else if (a === "view") setActive(p.id);
    else if (a === "pause") updateProject(p.id, { status: "paused", pausedAt: Date.now() });
    else if (a === "unpause") updateProject(p.id, { status: "knitting", pausedAt: null });
    else if (a === "done") updateProject(p.id, { status: "done", pausedAt: null });
    else if (a === "rename-save" && v) updateProject(p.id, { name: v });
    else if (a === "copy") { const now = Date.now(); addProject({ ...p, id: "p" + now.toString(36), name: `${p.name} (복제)`.slice(0, 30), current: 0, measuredH: null, measuredW: null, status: "knitting", pausedAt: null, created: now, updatedAt: now }); }
    else if (a === "delete") setConfirm(p.id);
    else if (a === "delete-now") { setConfirm(null); removed(removeProjects([p.id])); }
  };

  if (!ready) return null;
  if (!projects.length && !undo) return <div className="mine-empty"><p>아직 작품이 없어요.</p><Link className="mine-link" href="/new">첫 도안 만들기 →</Link></div>;
  return (
    <>
      <div className="mine-tools">
        <label htmlFor="mineSearch" className="sr">작품 찾기</label>
        <input id="mineSearch" className="mine-search" type="search" autoComplete="off" placeholder="작품 찾기" value={q} onChange={e => setQ(e.target.value)} />
        <div className="mine-row">
          <div className="mine-tabs" role="tablist" aria-label="상태로 거르기">
            {(["all", "knitting", "paused", "done"] as Filter[]).map(f => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} className="mine-tab" onClick={() => setFilter(f)}>{f === "all" ? "전체" : STATUS_KO[f]} <span>{counts[f]}</span></button>
            ))}
          </div>
          <div className="mine-right">
            <label className="sr" htmlFor="mineSort">정렬</label>
            <select id="mineSort" className="mine-sort" value={sort} onChange={e => setSort(e.target.value as Sort)}>{(Object.keys(SORT_KO) as Sort[]).map(s => <option key={s} value={s}>{SORT_KO[s]}</option>)}</select>
            {picking
              ? <>
                  <button type="button" className="mine-link" disabled={!picked.length} onClick={() => setAskMany(true)}>{picked.length}개 지우기</button>
                  <button type="button" className="mine-link muted" onClick={() => { setPicking(false); setPicked([]); setAskMany(false); }}>그만 고르기</button>
                </>
              : <button type="button" className="mine-link" onClick={() => { setPicking(true); setMenu(null); }}>고르기</button>}
          </div>
        </div>
        {askMany && (
          <div className="mine-ask" role="alertdialog" aria-label="여러 작품 지우기">
            <p>고른 작품 {picked.length}개를 지울까요? <span>되돌릴 수 없어요.</span></p>
            <button type="button" className="mc-text" autoFocus onClick={() => setAskMany(false)}>취소</button>
            <button type="button" className="mc-text danger" onClick={() => { removed(removeProjects(picked)); setPicked([]); setPicking(false); setAskMany(false); }}>지우기</button>
          </div>
        )}
      </div>
      {shown.length ? (
        <div className="mine-cards">
          {shown.map(p => (
            <Card key={p.id} p={p} picking={picking} picked={picked.includes(p.id)} onPick={() => setPicked(x => (x.includes(p.id) ? x.filter(i => i !== p.id) : [...x, p.id]))}
              menuOpen={menu === p.id} setMenu={o => setMenu(o ? p.id : null)} confirm={confirm === p.id} setConfirm={o => setConfirm(o ? p.id : null)} act={act(p)} />
          ))}
        </div>
      ) : <p className="mine-none">찾는 작품이 없어요</p>}
      {undo && (
        <div className="mine-undo" role="status">
          <span>{undo.n > 1 ? `${undo.n}개를 지웠어요` : "지웠어요"}</span>
          <button type="button" onClick={() => { restoreProjects(undo.r); setUndo(null); if (timer.current) clearTimeout(timer.current); }}>되돌리기</button>
        </div>
      )}
    </>
  );
}

export default function MinePage() {
  return (
    <main id="view-mine" className="mine">
      <div className="mine-head"><h1 lang="en">My Patterns</h1><Link className="mine-link" href="/new">새 도안 →</Link></div>
      <List />
      <p className="mine-note">작품은 이 브라우저에만 저장돼요.</p>
    </main>
  );
}
