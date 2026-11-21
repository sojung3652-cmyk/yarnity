"use client";
// The web's first screen and home in one (Kim's web-flow reference.html): the embroidered opening plays (the stage
// canvas over the starry linen, openingHomeScene.ts); once done, its sentence is the Start button. Start moves the whole
// stage left and smaller in about a second while the paper menu comes in from the right and an ivory veil settles -
// that is the home; nothing navigates. The glints, light bands and the sentence's glow go on there; the sentence is no
// longer a button. Top right: 건너뛰기 during the opening (Kim: no 오프닝 다시 보기 at home).
// A load or reload of the site at / always plays the opening from the start; coming back to / inside the site (홈,
// the logo, the book sinking) shows the home at once, finished and with no transition. Reduced motion: the home at once.
// The menu: today, 이어서 뜨기 (the latest work on the hook), 새 도안 만들기 (the book rises onto step 1), 나의 도안집,
// 뜨개 용어집, AI와 상의하기. Hidden and not clickable during the opening; usable as soon as it shows.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { BookCover, GoldDefs, whereOf } from "@/components/BookCover";
import { statusOf } from "@/lib/status";
import { TERMS } from "@/lib/glossary";
import { plan, PART_KO } from "@/lib/pattern";
import type { Project } from "@/lib/types";
import { makeOpeningHomeScene, OH_END, OH_SRC, type OHImages } from "./openingHomeScene";
import "./openingHome.css";

// the opening plays once per page load: the first showing of this screen; later ones (inside the site) are the home
let playedThisLoad = false;

/** "어제 저녁 9:40에 멈춤" */
function stoppedAt(ms: number) {
  const d = new Date(ms), now = new Date(), day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  const part = h < 6 ? "새벽" : h < 12 ? "오전" : h < 18 ? "오후" : "저녁", h12 = h % 12 || 12;
  const when = diff === 0 ? "오늘" : diff === 1 ? "어제" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${when} ${part} ${h12}:${m}에 멈춤`;
}

export function OpeningHome() {
  const { ready, projects, setActive, setChat } = useApp(), book = useBook(), router = useRouter();
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), sv = useRef<HTMLCanvasElement>(null);
  const startBtn = useRef<HTMLButtonElement>(null), menu = useRef<HTMLElement>(null);
  const [home, setHome] = useState(false), [instant, setInstant] = useState(false), [shown, setShown] = useState(false), [loaded, setLoaded] = useState(false), [narrow, setNarrow] = useState(false);
  const firstRef = useRef<boolean | null>(null);
  const ctl = useRef<{ skip: () => void; again: () => void; home: (instant: boolean) => void }>({ skip: () => {}, again: () => {}, home: () => {} });

  useEffect(() => {
    // the opening only when this page load itself was at / (a reload of the home); a reload elsewhere stays there,
    // and coming to / inside the site is the home at once (Kim)
    const loadUrl = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.name ?? location.href;
    // decided once per showing: React's second effect run in development must not read the mark the first run wrote
    if (firstRef.current === null) { firstRef.current = !playedThisLoad && new URL(loadUrl).pathname === "/"; playedThisLoad = true; }
    const first = firstRef.current;
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = root.current!, st = stage.current!, b = startBtn.current!;
    let alive = true, raf = 0, t0 = 0, manual = false, manualT = 0, isHome = false, done = false;
    let scene: ReturnType<typeof makeOpeningHomeScene> | null = null;
    const img = {} as OHImages;
    const load = (k: keyof typeof OH_SRC) => new Promise<void>(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = OH_SRC[k]; img[k] = i; });
    const size = () => {
      if (!scene) return;
      const rc = r.getBoundingClientRect(), z = scene.size(rc.width, rc.height, window.devicePixelRatio || 1);
      b.style.left = z.start.left + "px"; b.style.top = z.start.top + "px"; b.style.width = z.start.width + "px"; b.style.height = z.start.height + "px";
      st.style.transformOrigin = z.origin; r.style.setProperty("--home-t", z.homeT); setNarrow(z.narrow); // a class React keeps
    };
    const tick = (now: number) => {
      if (!alive || manual || !scene) return;
      const t = (now - t0) / 1000; scene.frame(t);
      if (t >= OH_END && !done && !isHome) { done = true; setShown(true); }
      if (document.visibilityState === "visible") raf = requestAnimationFrame(tick);
    };
    // the canvas waits while the tab is hidden
    const vis = () => { if (document.visibilityState === "visible" && !manual && scene) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } };
    document.addEventListener("visibilitychange", vis);
    const goHome = (inst: boolean) => {
      isHome = true; done = true; setShown(false); setInstant(inst); setHome(true);
      if (inst) t0 = Math.min(t0, performance.now() - OH_END * 1000);
      setTimeout(() => menu.current?.querySelector<HTMLElement>("a,button")?.focus({ preventScroll: true }), inst ? 0 : 900);
    };
    ctl.current = {
      skip: () => { t0 = performance.now() - OH_END * 1000; },
      again: () => { isHome = false; done = false; setHome(false); setInstant(false); setShown(false); t0 = performance.now(); },
      home: goHome,
    };
    const ro = new ResizeObserver(() => { size(); if (manual) scene?.frame(manualT); }); ro.observe(r);
    Promise.all((Object.keys(OH_SRC) as (keyof typeof OH_SRC)[]).map(load)).then(() => {
      if (!alive || !cv.current || !sv.current) return;
      scene = makeOpeningHomeScene(cv.current, sv.current, img); size(); setLoaded(true);
      if (process.env.NODE_ENV !== "production") {
        // development only: draw a given second (screenshots), as the reference's __seek
        (window as unknown as { __ohSeek?: (t: number) => void }).__ohSeek = (t: number) => { manual = true; manualT = t; cancelAnimationFrame(raf); scene!.frame(t); };
      }
      const straightHome = !first || rm;
      t0 = performance.now() - (straightHome ? OH_END * 1000 : 0);
      if (straightHome) goHome(true);
      raf = requestAnimationFrame(tick);
    });
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  // ---- the menu (real data) ----
  const knitting = useMemo(() => projects.filter(p => statusOf(p) === "knitting" && (p.current || 0) > 0), [projects]);
  const hook: Project | null = useMemo(() => [...knitting].sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created))[0] ?? null, [knitting]);
  const card = useMemo(() => {
    if (!hook) return null;
    const w = whereOf(hook), pp = plan(hook), nx = pp.rows[w.cur], prev = pp.rows[w.cur - 1];
    const line = `${prev ? PART_KO[prev.part] + " · " : ""}${w.cur} / ${w.total}단${nx ? ` · 다음은 ${nx.label} (${nx.n}코)` : ""}`;
    return { line, pct: w.pct, at: stoppedAt(hook.updatedAt ?? hook.created) };
  }, [hook]);
  const today = useMemo(() => { try { return new Date().toLocaleDateString("ko-KR").replace(/\s/g, " ").replace(/\.$/, ""); } catch { return ""; } }, []);
  const resume = () => { if (!hook) return; setActive(hook.id); router.push("/track"); };

  return (
    <div ref={root} className={"oh" + (home ? " home" : "") + (instant ? " instant" : "") + (narrow ? " narrow" : "")} id="view-home">
      <GoldDefs />
      <div className="oh-bgf" aria-hidden="true" />
      <canvas ref={sv} className="oh-sv" aria-hidden="true" />
      <div className="oh-veil" aria-hidden="true" />
      <div ref={stage} className="oh-stage">
        <canvas ref={cv} className="oh-cv" role="img" aria-label="Yarnity 오프닝: 파랑새 메달리온 아래로 금실 로고와 문구가 수놓아집니다." />
        <button ref={startBtn} type="button" className="oh-start" hidden={!shown || home} onClick={() => ctl.current.home(false)}>Start making my own pattern book</button>
      </div>
      <section ref={menu} className="oh-menu" aria-label="메뉴" inert={!home}>
        <p className="oh-eyebrow">WELCOME BACK · <span>{today}</span></p>
        <h1 className="oh-h1">오늘은 무엇을 떠볼까요?</h1>
        {ready && hook && card ? (
          <button type="button" className="oh-paper oh-cont" onClick={resume}>
            <span className="oh-cover"><BookCover p={hook} w={88} /></span>
            <span className="oh-cont-text">
              <span className="oh-chip">뜨는 중</span>
              <b>{hook.name}</b>
              <small>{card.line}</small>
              <span className="oh-bar"><i style={{ width: `${Math.round(card.pct * 100)}%` }} /></span>
              <span className="oh-foot"><span>{card.at}</span><em>이어서 뜨기 →</em></span>
            </span>
          </button>
        ) : ready ? <p className="oh-first">첫 도안을 만들어 보세요</p> : null}
        <button type="button" className="oh-lace" onClick={book.newPattern}><span>새 도안 만들기 →</span></button>
        <nav className="oh-list" aria-label="더 보기">
          <button type="button" className="oh-mi" onClick={() => router.push("/mine")}>
            <span className="oh-n">01</span>
            <svg viewBox="0 0 40 40" width="34" aria-hidden="true"><g fill="none" stroke="#B08D57" strokeWidth="1.6" strokeLinejoin="round"><rect x="7" y="8" width="8" height="25" rx="1.2" /><rect x="16" y="6" width="8" height="27" rx="1.2" /><path d="M23 10.5l7.5-2 5 23-7.6 2z" /><path d="M9.5 13h3M18.5 11h3" /></g></svg>
            <span><b>나의 도안집</b><small>{ready ? `${projects.length}권 · 뜨는 중 ${knitting.length}` : " "}</small></span><span className="oh-ar" aria-hidden="true">›</span>
          </button>
          <button type="button" className="oh-mi" onClick={() => router.push("/glossary")}>
            <span className="oh-n">02</span>
            <svg viewBox="0 0 40 40" width="34" aria-hidden="true"><g fill="none" stroke="#B08D57" strokeWidth="1.6" strokeLinejoin="round"><path d="M20 11c-4-2.6-9-3-14-2v21c5-1 10-.6 14 2 4-2.6 9-3 14-2V9c-5-1-10-.6-14 2z" /><path d="M20 11v21" /><path d="M10 15h6M10 19.5h6M24 15h6M24 19.5h6" /></g></svg>
            <span><b>뜨개 용어집</b><small>{TERMS.length}개 · 기호와 뜨는 방법</small></span><span className="oh-ar" aria-hidden="true">›</span>
          </button>
          <button type="button" className="oh-mi" onClick={() => setChat(c => ({ ...c, open: true }))}>
            <span className="oh-n">03</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="oh-badge"><img src="/home/ai_star.webp" alt="" /></span>
            <span><b>AI와 상의하기</b><small>막히는 단, 실 고르기, 뭐든 물어봐요</small></span><span className="oh-ar" aria-hidden="true">›</span>
          </button>
        </nav>
      </section>
      {loaded && !home && <button type="button" className="oh-skip" onClick={() => ctl.current.skip()} hidden={shown}>건너뛰기</button>}
    </div>
  );
}
