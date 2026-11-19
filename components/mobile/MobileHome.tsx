"use client";
// The phone's home (/): (A) the closed book - the knitted bird cover with a dark lavender linen band over
// its top (the spiral runs through it) and the gold foil logo pressed out of the knit near its foot, the
// ivory sheets and the back board under it, "Swipe up to open". A swipe up or a tap turns the cover up
// off the spiral (0.5s; a fade with reduced motion) and shows (B) the first page of the notebook: the gold
// the web book's menu page laid out as one page (logo, caption, tagline, the two lines of copy; 도안 만들기,
// 이어서 뜨기 when a work is being made, 나의 도안집; the yarn-ball ornament) and the gold X that closes the
// book again (the cover comes back down). Once opened, the book stays open for the rest of the visit.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { FoilLogo } from "@/components/FoilLogo";
import { GoldX } from "@/components/GoldX";
import { PART_KO, plan } from "@/lib/pattern";
import { statusOf } from "@/lib/status";
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

function Cover({ onOpen, closing }: { onOpen: () => void; closing?: boolean }) {
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
      <div className={"mc-book" + (opening ? " is-opening" : closing ? " is-closing" : "")}>
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

/** `overlay`: raised over another screen by the bottom bar's + (MobileChrome), as the web's 새 도안 does. */
export function FirstPage({ onClose, overlay }: { onClose: () => void; overlay?: boolean }) {
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
  const g = going ? progressOf(going) : null, count = ready ? projects.length : 0;
  const make = () => { if (hasDraft) setChoose(c => !c); else fresh(); };

  // the web book's menu page, as one page: the brand block, then the actions as woven labels, the ornament
  const Root = overlay ? "div" : "main";
  return (
    <Root id={overlay ? undefined : "view-m-home"} className="m-root" role={overlay ? "dialog" : undefined} aria-modal={overlay || undefined} aria-label={overlay ? "새 도안" : undefined}>
      <MobileNotebook label="첫 장" className="m1">
        <button type="button" className="m1-close" aria-label="책 덮기" onClick={onClose}><GoldX /></button>
        <header className="m1-brand">
          <h1 className="m1-logo"><span className="sr">Yarnity</span><FoilLogo className="m1-foil" /></h1>
          <p className="m1-cap" lang="en">Intelligent Crochet</p>
          <span className="m1-rule" aria-hidden="true" />
          <p className="m1-tag" lang="en">Your Personal Crochet Pattern Studio</p>
          <p className="m1-ko">아이디어만 있으면,<br />나만의 뜨개질 도안을 만들 수 있어요.</p>
        </header>
        <nav className="m1-acts" aria-label="시작하기">
          <button type="button" className="m-label is-yellow m1-act" aria-expanded={hasDraft ? choose : undefined} onClick={make}>
            <span className="m-label-in"><span className="m1-act-text"><b>도안 만들기</b><small>실과 크기만 정하면 코 수를 계산해요</small></span><span className="m1-act-end">{choose ? "닫기" : "시작"}</span></span>
          </button>
          {choose && (
            <div className="m1-choose" role="group" aria-label="도안 만들기">
              <button type="button" className="m-label is-apricot m1-sub" onClick={fresh}><span className="m-label-in"><span className="m1-act-text"><b>새 도안 만들기</b><small>처음부터 시작해요</small></span></span></button>
              <button type="button" className="m-label is-lilac m1-sub" onClick={() => book.startWizard(step)}><span className="m-label-in"><span className="m1-act-text"><b>이어서 만들기</b><small>{`${draft.name.trim() || "이름 없는 작품"} · ${STEP_NAME[step]}부터`}</small></span></span></button>
            </div>
          )}
          {going && g && (
            <button type="button" className="m-label is-ivory m1-act" onClick={() => { setActive(going.id); router.push("/track"); }}>
              <span className="m-label-in"><span className="m1-act-text"><b>이어서 뜨기</b><small>{`${going.name} · ${g.where}`}</small></span><span className="m1-act-end">{g.pos}</span></span>
            </button>
          )}
          <Link className="m-label is-rose m1-act" href="/library">
            <span className="m-label-in"><span className="m1-act-text"><b>나의 도안집</b><small>뜨던 곳부터 이어서</small></span><span className="m1-act-end">{count ? `${count}개` : "아직 없어요"}</span></span>
          </Link>
        </nav>
        <div className="m1-orn" aria-hidden="true"><i /><span /><i /></div>
      </MobileNotebook>
    </Root>
  );
}

export function MobileHome() {
  const [open, setOpen] = useState<boolean | null>(null), [closing, setClosing] = useState(false);
  useEffect(() => { try { setOpen(sessionStorage.getItem(OPEN_KEY) === "1"); } catch { setOpen(false); } }, []);
  // the bottom bar's + on this screen opens the book here (MobileNavBar)
  useEffect(() => {
    const on = () => { try { sessionStorage.setItem(OPEN_KEY, "1"); } catch {} setClosing(false); setOpen(true); };
    addEventListener("m:open-book", on); return () => removeEventListener("m:open-book", on);
  }, []);
  if (open === null) return <main id="view-m-home" className="m-root" />;
  // closing the book (the gold X) lays the cover back down over the first page
  if (!open) return <Cover closing={closing} onOpen={() => { try { sessionStorage.setItem(OPEN_KEY, "1"); } catch {} setClosing(false); setOpen(true); }} />;
  return <FirstPage onClose={() => { try { sessionStorage.removeItem(OPEN_KEY); } catch {} setClosing(true); setOpen(false); }} />;
}
