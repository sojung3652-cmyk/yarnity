"use client";
// The phone's home (/): (A) the closed book - the knitted bird cover with a dark lavender linen band over
// its top (the spiral runs through it) and the gold foil logo pressed out of the knit near its foot, the
// ivory sheets and the back board under it, "Swipe up to open". A swipe up or a tap turns the cover up
// off the spiral (0.5s; a fade with reduced motion) and shows (B) the first page of the notebook: the gold
// ribbon, the logo, 도안 만들기, 이어서 뜨기 (the work being made; hidden when there is none), the three
// most recent works, the page number. Once opened, the book stays open for the rest of the visit.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { FoilLogo } from "@/components/FoilLogo";
import { RibbonGold } from "@/components/RibbonGold";
import { PART_KO, plan } from "@/lib/pattern";
import { STATUS_KO, statusOf } from "@/lib/status";
import type { Project } from "@/lib/types";
import { MobileNotebook, Spiral } from "./MobileNotebook";
import { useDraftState, useStartFresh } from "./useNewDraft";
import { useBook } from "@/components/Book/BookProvider";

const OPEN_KEY = "m.open";
const STEP_NAME = ["", "이름", "품목", "실과 크기", "확인"];

/** where a work is: "바닥 3단째", its position "3 / 42" */
export function progressOf(p: Project) {
  const pp = plan(p), total = pp.rows.length, cur = Math.min(p.current || 0, total);
  const r = pp.rows[Math.min(cur, total - 1)];
  const where = cur >= total ? "다 떴어요" : r.part === "start" ? "시작 사슬" : /단$/.test(r.label) ? `${PART_KO[r.part]} ${r.label}째` : r.label;
  return { total, cur, where, pos: `${Math.min(cur + 1, total)} / ${total}`, pct: total ? cur / total : 0 };
}
const shortDay = (t: number) => { const d = new Date(t); return `${d.getMonth() + 1}.${d.getDate()}`; };

function Cover({ onOpen }: { onOpen: () => void }) {
  const [opening, setOpening] = useState(false), y0 = useRef<number | null>(null);
  const go = () => {
    if (opening) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setOpening(true); setTimeout(onOpen, 300); return; }
    setOpening(true); setTimeout(onOpen, 500);
  };
  return (
    <main id="view-m-home" className="m-root m-cover-page"
      onTouchStart={e => { y0.current = e.touches[0].clientY; }}
      onTouchEnd={e => { const y = y0.current; y0.current = null; if (y != null && y - e.changedTouches[0].clientY > 40) go(); }}>
      <h1 className="sr">Yarnity</h1>
      <div className={"mc-book" + (opening ? " is-opening" : "")}>
        <div className="mc-stack" aria-hidden="true"><i /><i /><i /><i /></div>
        <button type="button" className="mc-cover" aria-label="책 펼치기" onClick={go}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mc-art" src="/mobile/cover_bird.webp" alt="" width={560} height={963} />
          <span className="mc-band" aria-hidden="true" />
          <span className="mc-logo" aria-hidden="true"><FoilLogo className="mc-foil" /></span>
        </button>
        <Spiral n={11} className="mc-spiral" />
      </div>
      <p className="mc-swipe" lang="en" aria-hidden="true">Swipe up to open</p>
    </main>
  );
}

function FirstPage() {
  const { ready, projects, active, setActive, draft } = useApp();
  const router = useRouter(), book = useBook();
  const { hasDraft, step } = useDraftState(), fresh = useStartFresh();
  const [choose, setChoose] = useState(false);
  // the work being made: the one last opened, else the most recently knitted one still going
  const going = useMemo(() => {
    if (!ready || !projects.length) return null;
    if (active && statusOf(active) !== "done") return active;
    return [...projects].filter(p => statusOf(p) === "knitting").sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created))[0] ?? null;
  }, [ready, projects, active]);
  const recent = useMemo(() => [...projects].sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created)).slice(0, 3), [projects]);
  const g = going ? progressOf(going) : null;
  const make = () => { if (hasDraft) setChoose(c => !c); else fresh(); };

  return (
    <main id="view-m-home" className="m-root">
      <MobileNotebook label="첫 장">
        <span className="m-ribbon" aria-hidden="true"><RibbonGold w={18} h={104} ball={11} ballY={84} lineInset={3} lineEnd={80} full notch={0.86} /></span>
        <header className="m1-brand">
          <h1 className="m1-logo"><span className="sr">Yarnity</span><FoilLogo className="m1-foil" /></h1>
          <p className="m1-sub" lang="en">a crochet pattern book</p>
        </header>
        <div className="m1-acts">
          <button type="button" className="m-label m1-act" aria-expanded={hasDraft ? choose : undefined} onClick={make}>
            <span className="m-label-in"><span className="m1-act-text"><b>도안 만들기</b><small>실과 크기만 정하면 코 수를 계산해요</small></span><span className="m1-act-end">{choose ? "닫기" : "시작"}</span></span>
          </button>
          {choose && (
            <div className="m1-choose" role="group" aria-label="도안 만들기">
              <button type="button" className="m-label m1-sub" onClick={fresh}><span className="m-label-in"><span className="m1-act-text"><b>새로 시작</b><small>처음부터 만들어요</small></span></span></button>
              <button type="button" className="m-label is-ivory m1-sub" onClick={() => book.startWizard(step)}><span className="m-label-in"><span className="m1-act-text"><b>이어서 만들기</b><small>{`${draft.name.trim() || "이름 없는 작품"} · ${STEP_NAME[step]}부터`}</small></span></span></button>
            </div>
          )}
          {going && g && (
            <button type="button" className="m-label is-ivory m1-act" onClick={() => { setActive(going.id); router.push("/track"); }}>
              <span className="m-label-in"><span className="m1-act-text"><b>이어서 뜨기</b><small>{`${going.name} · ${g.where}`}</small></span><span className="m1-act-end">{g.pos}</span></span>
            </button>
          )}
        </div>
        <section className="m1-works" aria-labelledby="m1Works">
          <div className="m1-works-head"><h2 id="m1Works" lang="en">MY WORKS</h2><Link href="/library">전체 보기</Link></div>
          {recent.length ? (
            <ul>
              {recent.map(p => {
                const st = statusOf(p);
                return (
                  <li key={p.id}>
                    <Link href="/pattern" onClick={() => setActive(p.id)}>
                      <i className="m1-dot" style={{ background: p.color || "#EFE7DA" }} aria-hidden="true" />
                      <span className="m1-name">{p.name}</span>
                      <span className="m1-day">{shortDay(p.updatedAt ?? p.created)}</span>
                      <span className={"m1-st is-" + st}>{STATUS_KO[st]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p className="m1-none">아직 작품이 없어요. 첫 도안을 만들어 보세요.</p>}
        </section>
        <p className="m-folio" aria-hidden="true">— 1 —</p>
      </MobileNotebook>
    </main>
  );
}

export function MobileHome() {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => { try { setOpen(sessionStorage.getItem(OPEN_KEY) === "1"); } catch { setOpen(false); } }, []);
  if (open === null) return <main id="view-m-home" className="m-root" />;
  if (!open) return <Cover onOpen={() => { try { sessionStorage.setItem(OPEN_KEY, "1"); } catch {} setOpen(true); }} />;
  return <FirstPage />;
}
