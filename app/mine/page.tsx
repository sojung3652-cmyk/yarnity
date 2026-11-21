"use client";
// 내 작품 (나의 도안집): search, filter by status, sort, "고르기" (delete several at once), and the works as books
// on shelves - five to a shelf, four or three when the page is narrower (the same covers as the phone's
// 도안집, components/BookCover.tsx). A book opens its details in a popup: its cover, where it is, what it is
// made with (LOT with copy), 도안 보기 / 사진 기록 / 이어서 뜨기, and the old ⋯ menu as small links
// (도안 고치기, 중단 / 다시 시작, 완성으로 표시, 이름 바꾸기, 복제, 지우기). Deleting asks first and can be undone
// for 6 seconds. Light from the upper right: every shadow falls to the lower left (mine.css).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp, type Removed } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { BookCover, GoldDefs, ProgressBar, tagOf, whereOf } from "@/components/BookCover";
import { CopyLot } from "@/components/YarnInfo";
import { ClothPatch, LaceButton } from "@/components/diary/Diary";
import { CoverPicker } from "@/components/diary/CoverPicker";
import { PhotoLog } from "@/components/PhotoLog";
import { dropOrphans, photoSummary } from "@/lib/photos";
import { ITEM, itemIdOf } from "@/lib/items";
import { STATUS_KO, statusOf, type Status } from "@/lib/status";
import type { Project } from "@/lib/types";
import { hookLabel, hookMmOf, yarnWeightText } from "@/lib/yarn";
import "./mine.css";
import { useMobile } from "@/components/mobile/useMobile";
import { MobileMine } from "@/components/mobile/MobileMine";

type Filter = "all" | Status;
type Sort = "recent" | "created" | "name";
const SORT_KO: Record<Sort, string> = { recent: "최근에 뜬 순", created: "만든 순", name: "이름순" };

/** everything a search can match: name, item, yarn, materials, colour (+ number), LOT */
const haystack = (p: Project) => [p.name, ITEM[itemIdOf(p)].name, p.yarn, ...(p.materials ?? []), p.blend, p.colorName, p.colorNo, p.lot].filter(Boolean).join(" ").toLowerCase();

/** books per shelf from the shelves' width: 5, then 4, then 3 */
function useColumns() {
  const ref = useRef<HTMLDivElement>(null), [cols, setCols] = useState(5);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    // smaller books (Kim): seven to a shelf on a wide page, six, five, four as it narrows
  const fit = () => { const w = el.clientWidth; setCols(w >= 1080 ? 7 : w >= 900 ? 6 : w >= 720 ? 5 : 4); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  });
  return [ref, cols] as const;
}

/** A work's details in a popup over the page: Esc, ✕ or the dim close it; focus stays inside while it is
 *  open and goes back to the book after; the page behind does not scroll. */
function Detail({ p, onClose, act, photos }: { p: Project; onClose: () => void; act: (a: string, v?: string) => void; photos?: number }) {
  const it = ITEM[itemIdOf(p)], st = statusOf(p), w = whereOf(p), box = useRef<HTMLDivElement>(null);
  const [asking, setAsking] = useState(false), [renaming, setRenaming] = useState(false), [name, setName] = useState(p.name);
  // the small actions live behind ··· at the top (Kim), a list that opens and closes
  const [more, setMore] = useState(false), moreOpen = useRef(false);
  moreOpen.current = more;
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null, body = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.querySelector<HTMLElement>(".bk-x")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); if (moreOpen.current) setMore(false); else onClose(); return; }
      if (e.key !== "Tab" || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>("button, a[href], input, [tabindex]:not([tabindex='-1'])")].filter(x => !x.hasAttribute("disabled"));
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = body; back?.focus?.({ preventScroll: true }); };
  }, [onClose]);
  const yarn = [p.yarn, p.colorName ? p.colorName + (p.colorNo ? ` ${p.colorNo}` : "") : "", yarnWeightText(p) !== "—" ? yarnWeightText(p) : ""].filter(Boolean).join(" · ");
  const hook = hookLabel(hookMmOf(p));
  const menu: [string, string][] = [["edit", "도안 고치기"], st === "paused" ? ["unpause", "다시 시작하기"] : ["pause", "중단으로 옮기기"], ...(st !== "done" ? [["done", "완성으로 표시"] as [string, string]] : []), ["rename", "이름 바꾸기"], ["cover", "표지 바꾸기"], ["copy", "복제"]];
  const commit = () => { const n = name.trim().slice(0, 30); if (n && n !== p.name) act("rename-save", n); setRenaming(false); };
  const [picking, setPicking] = useState(false);
  return (
    <div className="bk-dim" onClick={onClose}>
      <div ref={box} className="bk-pop" role="dialog" aria-modal="true" aria-labelledby="bkName" onClick={e => { e.stopPropagation(); setMore(false); }}>
        <div className="bk-more">
          <button type="button" className="bk-more-btn" aria-label="더 보기" aria-haspopup="menu" aria-expanded={more} onClick={e => { e.stopPropagation(); setMore(v => !v); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7" fill="currentColor" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /><circle cx="19" cy="12" r="1.7" fill="currentColor" /></svg>
          </button>
          {more && (
            <div className="bk-more-menu" role="menu" onClick={e => e.stopPropagation()}>
              {menu.map(([k, t]) => <button key={k} type="button" role="menuitem" onClick={() => { setMore(false); if (k === "rename") { setName(p.name); setRenaming(true); } else if (k === "cover") setPicking(true); else act(k); }}>{t}</button>)}
              <button type="button" role="menuitem" className="danger" onClick={() => { setMore(false); setAsking(true); }}>지우기</button>
            </div>
          )}
        </div>
        <button type="button" className="bk-x" aria-label="닫기" onClick={onClose}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
        <div className="bk-pop-top">
          <BookCover p={p} w={170} />
          <div className="bk-pop-text">
            <p className="bk-pop-kind">{it.name} · <span className={"bk-pop-tag" + (tagOf(p) === "뜨는 중" ? " is-going" : "")}>{tagOf(p)}</span></p>
            {renaming ? (
              <input id="bkName" className="bk-rename" autoFocus maxLength={30} aria-label="새 이름" value={name} onChange={e => setName(e.target.value)} onBlur={commit}
                onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { e.stopPropagation(); setName(p.name); setRenaming(false); } }} />
            ) : <h2 id="bkName">{p.name}</h2>}
            <p className="bk-pop-where">{w.long}</p>
            <ProgressBar pct={w.pct} />
            <dl className="bk-info">
              {yarn && <div><dt>실</dt><dd>{yarn}</dd></div>}
              {hook && hook !== "—" && <div><dt>바늘</dt><dd>{hook}</dd></div>}
              {p.lot && <div><dt>LOT</dt><dd><b>{p.lot}</b> <CopyLot lot={p.lot} /></dd></div>}
            </dl>
          </div>
        </div>
        <div className="bk-pop-btns">
          {/* Girl's Diary (components/diary): two cloth patches and the lavender lace tag */}
          <ClothPatch color="cream" href="/pattern" onClick={() => act("view")}>도안 보기</ClothPatch>
          <ClothPatch color="pink" onClick={() => act("photos")}>사진 기록{photos ? ` ${photos}` : ""}</ClothPatch>
          {w.done
            ? <LaceButton variant="lavender" width={300} className="bk-lace" onClick={() => act("again")}>다시 뜨기</LaceButton>
            : <LaceButton variant="lavender" width={300} className="bk-lace" onClick={() => act("resume")}>{w.started ? `이어서 뜨기 · ${w.next}부터 →` : "뜨기 시작 →"}</LaceButton>}
        </div>
        {asking && (
          <p className="bk-ask" role="alert">이 작품을 지울까요? <span>6초 안에는 되돌릴 수 있어요.</span>
            <button type="button" autoFocus onClick={() => setAsking(false)}>취소</button><button type="button" className="danger" onClick={() => act("delete-now")}>지우기</button></p>
        )}
        {picking && <CoverPicker p={p} onPick={id => { act("cover", id); setPicking(false); }} onClose={() => setPicking(false)} />}
      </div>
    </div>
  );
}

function List() {
  const { ready, projects, setActive, updateProject, addProject, removeProjects, restoreProjects } = useApp();
  const router = useRouter(), book = useBook();
  const [q, setQ] = useState(""), [filter, setFilter] = useState<Filter>("all"), [sort, setSort] = useState<Sort>("recent");
  const [open, setOpen] = useState<string | null>(null);
  const [picking, setPicking] = useState(false), [picked, setPicked] = useState<string[]>([]), [askMany, setAskMany] = useState(false);
  const [undo, setUndo] = useState<{ r: Removed; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const [shelvesRef, cols] = useColumns();

  // photos: how many each work has (shown on 사진 기록); the dialog's work
  const [photoN, setPhotoN] = useState<Record<string, number>>({});
  const [photoFor, setPhotoFor] = useState<string | null>(null);
  const loadPhotos = async () => {
    try { const s = await photoSummary(), c: Record<string, number> = {}; for (const [id, v] of Object.entries(s)) c[id] = v.n; setPhotoN(c); }
    catch { /* no IndexedDB (private mode) */ }
  };
  useEffect(() => { loadPhotos(); }, []);
  // photos of works deleted for good (no undo pending) are dropped
  useEffect(() => { if (ready && !undo) dropOrphans(projects.map(p => p.id)).catch(() => {}); }, [ready, undo, projects]);

  const counts = useMemo(() => { const c = { all: projects.length, knitting: 0, paused: 0, done: 0 }; projects.forEach(p => c[statusOf(p)]++); return c; }, [projects]);
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = projects.filter(p => (filter === "all" || statusOf(p) === filter) && words.every(w => haystack(p).includes(w)));
    return [...list].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ko") : sort === "created" ? b.created - a.created : (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created));
  }, [projects, q, filter, sort]);
  const shelves = useMemo(() => { const out: Project[][] = []; for (let i = 0; i < shown.length; i += cols) out.push(shown.slice(i, i + cols)); return out; }, [shown, cols]);

  const removed = (r: Removed) => {
    if (timer.current) clearTimeout(timer.current);
    setUndo({ r, n: r.items.length }); timer.current = setTimeout(() => setUndo(null), 6000);
  };
  const act = (p: Project) => (a: string, v?: string) => {
    if (a === "resume") { setActive(p.id); if (statusOf(p) === "paused") updateProject(p.id, { status: "knitting", pausedAt: null }); router.push("/track"); }
    else if (a === "again") { // 다시 뜨기: a fresh copy to knit; the finished one keeps its record
      const now = Date.now(), id = "p" + now.toString(36);
      addProject({ ...p, id, current: 0, measuredH: null, measuredW: null, status: "knitting", pausedAt: null, created: now, updatedAt: now });
      setActive(id); router.push("/track");
    }
    else if (a === "view") setActive(p.id);
    else if (a === "cover" && v) updateProject(p.id, { cover: v });
    else if (a === "photos") setPhotoFor(p.id);
    else if (a === "edit") { setOpen(null); book.editHere(p.id); } // the book rises over this list; closing it comes back here
    else if (a === "pause") updateProject(p.id, { status: "paused", pausedAt: Date.now() });
    else if (a === "unpause") updateProject(p.id, { status: "knitting", pausedAt: null });
    else if (a === "done") updateProject(p.id, { status: "done", pausedAt: null });
    else if (a === "rename-save" && v) updateProject(p.id, { name: v });
    else if (a === "copy") { const now = Date.now(); addProject({ ...p, id: "p" + now.toString(36), name: `${p.name} (복제)`.slice(0, 30), current: 0, measuredH: null, measuredW: null, status: "knitting", pausedAt: null, created: now, updatedAt: now }); }
    else if (a === "delete-now") { setOpen(null); removed(removeProjects([p.id])); }
  };
  const openP = open ? projects.find(x => x.id === open) ?? null : null;

  if (!ready) return null;
  if (!projects.length && !undo) return (
    <section className="bk-empty">
      <div className="bk-shelf" aria-hidden="true" />
      <p>아직 도안이 없어요</p>
      <button type="button" className="bk-new" onClick={book.openHere}><span>새 도안 만들기</span></button>
    </section>
  );
  return (
    <>
      <GoldDefs />
      {/* the title as on the glossary (Kim): My Patterns in script, the count on the right */}
      <header className="mine-head">
        {/* the My Patterns wordmark again (Kim), small: the glossary's title size */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <h1 className="mine-title"><img className="mine-logo" src="/pic/my-patterns.png" alt="My Patterns · 나의 도안집" width={900} height={366} /></h1>
        <p className="mine-count">나의 도안집 · {counts.all}권</p>
      </header>
      <div className="mine-tools">
        {/* a small search box with a magnifier (Kim: the long underlined field was too big) */}
        <label className="mine-find" htmlFor="mineSearch">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10.4 10.4 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span className="sr">작품 찾기</span>
          <input id="mineSearch" className="mine-search" type="search" autoComplete="off" placeholder="찾기" value={q} onChange={e => setQ(e.target.value)} />
        </label>
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
              : <button type="button" className="mine-link" onClick={() => setPicking(true)}>고르기</button>}
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
      <div ref={shelvesRef} className="bk-shelves" style={{ "--cols": cols } as React.CSSProperties}>
        {shown.length ? shelves.map((row, i) => (
          <div key={i} className="bk-row">
            <ul className="bk-books">
              {row.map(p => {
                const w = whereOf(p), on = picked.includes(p.id);
                return (
                  <li key={p.id}>
                    {/* the whole book is one button: it opens the details, or picks it while 고르기 is on */}
                    <button type="button" className={"bk-book" + (open === p.id ? " is-open" : "") + (on ? " is-picked" : "")}
                      aria-pressed={picking ? on : undefined} aria-haspopup={picking ? undefined : "dialog"}
                      onClick={() => (picking ? setPicked(x => (x.includes(p.id) ? x.filter(i => i !== p.id) : [...x, p.id])) : setOpen(p.id))}>
                      <span className="bk-cover-wrap"><BookCover p={p} />{picking && <span className="bk-check" aria-hidden="true">{on ? "✓" : ""}</span>}</span>
                      <span className="bk-name">{p.name}</span>
                      <span className="bk-where">{w.short}</span>
                      <ProgressBar pct={w.pct} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="bk-shelf" aria-hidden="true" />
          </div>
        )) : <p className="mine-none">찾는 작품이 없어요</p>}
      </div>
      {openP && <Detail p={openP} onClose={() => setOpen(null)} act={act(openP)} photos={photoN[openP.id]} />}
      {photoFor && <PhotoLog projectId={photoFor} name={projects.find(x => x.id === photoFor)?.name ?? ""} onClose={() => setPhotoFor(null)} onChange={loadPhotos} />}
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
  // phones: its own screen (components/mobile/MobileMine.tsx), not a page of the book
  const m = useMobile();
  if (m) return <MobileMine />;
  return (
    <main id="view-mine" className="mine">
      <List />
      <p className="mine-note">작품과 사진은 이 브라우저에만 저장돼요.</p>
    </main>
  );
}
