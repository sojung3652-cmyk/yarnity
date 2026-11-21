"use client";
// The web home (Kim's reference.html, web-home pack): the brand on the left - one canvas with the medallion and the
// gold logo stitched pixel by pixel (homeScene.ts), then INTELLIGENT CROCHET and MAKE · TRACK · SHARE revealed left to
// right - and the menu on a paper panel on the right: today, 이어서 뜨기 (the work most recently knitted), 새 도안
// 만들기 (the book rises onto step 1), 나의 도안집, 뜨개 용어집, AI와 상의하기. The menu works at once, whatever the
// animation is doing. Seen already this session (or reduced motion): the finished logo, its glints going on.
// Below 1000px the brand stacks over the menu.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { BookCover, GoldDefs, whereOf } from "@/components/BookCover";
import { statusOf } from "@/lib/status";
import { TERMS } from "@/lib/glossary";
import { plan, PART_KO } from "@/lib/pattern";
import type { Project } from "@/lib/types";
import { HOME_END, HOME_SRC, makeHomeScene, type HomeImages } from "./homeScene";
import { openingUp } from "./Hero";
import "./homeWeb.css";

const SEEN_KEY = "yarnity-home-seen";

/** "어제 저녁 9:40에 멈춤" */
function stoppedAt(ms: number) {
  const d = new Date(ms), now = new Date(), day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  const part = h < 6 ? "새벽" : h < 12 ? "오전" : h < 18 ? "오후" : "저녁", h12 = h % 12 || 12;
  const when = diff === 0 ? "오늘" : diff === 1 ? "어제" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${when} ${part} ${h12}:${m}에 멈춤`;
}

export function HomeWeb() {
  const { ready, projects, setActive, setChat } = useApp(), book = useBook(), router = useRouter();
  const cv = useRef<HTMLCanvasElement>(null), [seen, setSeen] = useState(false), [waiting, setWaiting] = useState(true);

  // the work on the hook: the most recently knitted one that is going
  const knitting = useMemo(() => projects.filter(p => statusOf(p) === "knitting" && (p.current || 0) > 0), [projects]);
  const hook: Project | null = useMemo(() => [...knitting].sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created))[0] ?? null, [knitting]);
  const card = useMemo(() => {
    if (!hook) return null;
    const w = whereOf(hook), pp = plan(hook), nx = pp.rows[w.cur], prev = pp.rows[w.cur - 1];
    const line = `${prev ? PART_KO[prev.part] + " · " : ""}${w.cur} / ${w.total}단${nx ? ` · 다음은 ${nx.label} (${nx.n}코)` : ""}`;
    return { line, pct: w.pct, at: stoppedAt(hook.updatedAt ?? hook.created) };
  }, [hook]);
  const today = useMemo(() => { try { return new Date().toLocaleDateString("ko-KR").replace(/\s/g, " ").replace(/\.$/, ""); } catch { return ""; } }, []);

  // under the opening: wait for its Start, then stitch (the session's first visit)
  useEffect(() => {
    if (!openingUp()) { setWaiting(false); return; }
    const go = () => setWaiting(false); addEventListener("yarnity:opening-done", go); return () => removeEventListener("yarnity:opening-done", go);
  }, []);
  useEffect(() => {
    const c = cv.current; if (!c || waiting) return;
    let s = false; try { s = sessionStorage.getItem(SEEN_KEY) === "1"; sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
    if (s || matchMedia("(prefers-reduced-motion: reduce)").matches) { s = true; setSeen(true); }
    let alive = true, raf = 0, t0 = 0, manual = false, manualT = 0, scene: ReturnType<typeof makeHomeScene> | null = null;
    const img = {} as HomeImages;
    const load = (k: keyof typeof HOME_SRC) => new Promise<void>(r => { const i = new Image(); i.onload = i.onerror = () => r(); i.src = HOME_SRC[k]; img[k] = i; });
    // stops while the tab is hidden (as the reference: the time runs on, the drawing waits)
    const tick = (now: number) => { if (!alive || manual || !scene) return; scene.frame((now - t0) / 1000); if (document.visibilityState === "visible") raf = requestAnimationFrame(tick); };
    const vis = () => { if (document.visibilityState === "visible" && !manual && scene) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } };
    document.addEventListener("visibilitychange", vis);
    let ro: ResizeObserver | null = null;
    Promise.all((Object.keys(HOME_SRC) as (keyof typeof HOME_SRC)[]).map(load)).then(() => {
      if (!alive) return;
      scene = makeHomeScene(c, img); scene.size();
      // a resize clears the canvas: a held frame (screenshots) is drawn again, as the reference
      ro = new ResizeObserver(() => { scene?.size(); if (manual) scene?.frame(manualT); }); ro.observe(c);
      if (process.env.NODE_ENV !== "production") {
        // development only: draw a given second (screenshots), as the reference's __seek
        (window as unknown as { __homeSeek?: (t: number) => void }).__homeSeek = (t: number) => { manual = true; manualT = t; cancelAnimationFrame(raf); scene!.frame(t); };
      }
      t0 = performance.now() - (s ? HOME_END * 1000 : 0); raf = requestAnimationFrame(tick);
    });
    return () => { alive = false; cancelAnimationFrame(raf); ro?.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, [waiting]);

  const resume = () => { if (!hook) return; setActive(hook.id); router.push("/track"); };

  return (
    <div className="hw">
      <GoldDefs />
      <div className="hw-bgf" aria-hidden="true" /><div className="hw-veil" aria-hidden="true" />
      <main className={"hw-home" + (seen ? " seen" : "") + (waiting ? " is-waiting" : "")} id="view-home">
        <section className="hw-brand" aria-label="Yarnity">
          <canvas ref={cv} className="hw-cv" role="img" aria-label="파랑새 메달리온과 금실 Yarnity 로고" />
          <p className="hw-tag1" lang="en">INTELLIGENT CROCHET</p>
          <p className="hw-tag2" lang="en">MAKE · TRACK · SHARE</p>
        </section>
        <section className="hw-menu">
          <p className="hw-eyebrow">WELCOME BACK · <span>{today}</span></p>
          <h1 className="hw-h1">오늘은 무엇을 떠볼까요?</h1>
          {ready && hook && card ? (
            <button type="button" className="hw-paper hw-cont" onClick={resume}>
              <span className="hw-cover"><BookCover p={hook} w={88} /></span>
              <span className="hw-cont-text">
                <span className="hw-chip">뜨는 중</span>
                <b>{hook.name}</b>
                <small>{card.line}</small>
                <span className="hw-bar"><i style={{ width: `${Math.round(card.pct * 100)}%` }} /></span>
                <span className="hw-foot"><span>{card.at}</span><em>이어서 뜨기 →</em></span>
              </span>
            </button>
          ) : ready ? <p className="hw-first">첫 도안을 만들어 보세요</p> : null}
          <button type="button" className="hw-lace" onClick={book.newPattern}><span>새 도안 만들기 →</span></button>
          <nav className="hw-list" aria-label="더 보기">
            <button type="button" className="hw-mi" onClick={() => router.push("/mine")}>
              <span className="hw-n">01</span>
              <svg viewBox="0 0 40 40" width="34" aria-hidden="true"><g fill="none" stroke="#B08D57" strokeWidth="1.6" strokeLinejoin="round"><rect x="7" y="8" width="8" height="25" rx="1.2" /><rect x="16" y="6" width="8" height="27" rx="1.2" /><path d="M23 10.5l7.5-2 5 23-7.6 2z" /><path d="M9.5 13h3M18.5 11h3" /></g></svg>
              <span><b>나의 도안집</b><small>{ready ? `${projects.length}권 · 뜨는 중 ${knitting.length}` : " "}</small></span><span className="hw-ar" aria-hidden="true">›</span>
            </button>
            <button type="button" className="hw-mi" onClick={() => router.push("/glossary")}>
              <span className="hw-n">02</span>
              <svg viewBox="0 0 40 40" width="34" aria-hidden="true"><g fill="none" stroke="#B08D57" strokeWidth="1.6" strokeLinejoin="round"><path d="M20 11c-4-2.6-9-3-14-2v21c5-1 10-.6 14 2 4-2.6 9-3 14-2V9c-5-1-10-.6-14 2z" /><path d="M20 11v21" /><path d="M10 15h6M10 19.5h6M24 15h6M24 19.5h6" /></g></svg>
              <span><b>뜨개 용어집</b><small>{TERMS.length}개 · 기호와 뜨는 방법</small></span><span className="hw-ar" aria-hidden="true">›</span>
            </button>
            <button type="button" className="hw-mi" onClick={() => setChat(c => ({ ...c, open: true }))}>
              <span className="hw-n">03</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="hw-badge"><img src="/home/ai_star.webp" alt="" /></span>
              <span><b>AI와 상의하기</b><small>막히는 단, 실 고르기, 뭐든 물어봐요</small></span><span className="hw-ar" aria-hidden="true">›</span>
            </button>
          </nav>
        </section>
      </main>
    </div>
  );
}
