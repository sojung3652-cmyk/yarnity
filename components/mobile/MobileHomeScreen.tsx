"use client";
// ② The phone's home, "Girl's Diary" (Kim's spec): the gold logo and its caption; the bird picture in an
// ivory lace oval; then cloth patches (frayed edges, running stitches; public/mobile/diary): 도안 만들기
// (yellow) -> step 1; 이어서 뜨기 (cream) when a work is on the hook -> its 따라 뜨기; 나의 도안집 (pink, n권)
// and AI와 상의 (cream, a gold embroidered star) -> the existing AI sheet.
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/components/AppProvider";
import { BookCover, GoldDefs, ProgressBar, whereOf } from "@/components/BookCover";
import { FoilLogo } from "@/components/FoilLogo";
import { statusOf } from "@/lib/status";
import { useBook } from "@/components/Book/BookProvider";
import "./mine-mobile.css";

export function MobileHomeScreen() {
  const { ready, projects, setActive, setChat } = useApp(), router = useRouter(), book = useBook();
  // 도안 만들기 opens step 1 (Kim); a pattern half made keeps what it has (the draft is not cleared)
  const start = () => book.startWizard(1);
  // the work on the hook: the most recently knitted one that is going (as 나의 도안집)
  const hook = useMemo(() => [...projects].filter(p => statusOf(p) === "knitting" && (p.current || 0) > 0)
    .sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created))[0] ?? null, [projects]);
  const w = hook ? whereOf(hook) : null;
  const resume = () => { if (!hook) return; setActive(hook.id); router.push("/track"); };

  return (
    <main id="view-m-home" className={"mf mfh" + (ready && hook ? " has-resume" : "")}>
      <GoldDefs />
      <header className="mfh-brand">
        <h1 className="mfh-logo"><span className="sr">Yarnity</span><FoilLogo className="mfh-foil" /></h1>
        <p className="mfh-cap" lang="en">Intelligent Crochet</p>
      </header>

      {/* the bird picture in an ivory lace oval: a picture only (no words, not a button) */}
      <div className="mfh-lace" aria-hidden="true">
        <img className="mfh-lace-pic" src="/mobile/cover_bird.webp" alt="" />
        <img className="mfh-lace-frame" src="/mobile/diary/lace_ivory.webp" alt="" />
      </div>

      <div className="mfh-actions">
      <button type="button" className="mf-patch is-yellow mfh-make" onClick={start}>
        <span className="mfh-make-text"><b>도안 만들기</b><small>실과 크기만 정하면 코 수를 계산해요</small></span>
        <span className="mfh-go" lang="en">시작 →</span>
      </button>

      {ready && hook && w && (
        <button type="button" className="mf-patch is-cream mfh-resume" onClick={resume}>
          <BookCover p={hook} w={38} />
          <span className="mfh-resume-text">
            <small>이어서 뜨기</small>
            <b>{hook.name}</b>
            <span className="mfh-where">{w.long}</span>
            <ProgressBar pct={w.pct} />
          </span>
          <span className="mfh-chev" aria-hidden="true">›</span>
        </button>
      )}

      <nav className="mfh-foot" aria-label="더 보기">
        <button type="button" className="mf-patch is-pink" onClick={() => router.push("/mine")}>
          <span className="mfh-two"><b>나의 도안집</b><small>{ready ? `${projects.length}권` : " "}</small></span>
        </button>
        <button type="button" className="mf-patch is-cream mfh-ai" onClick={() => setChat(c => ({ ...c, open: true }))}>
          <img className="mfh-star" src="/mobile/diary/star.webp" alt="" />
          <span className="mfh-two"><b>AI와 상의</b><small>막힐 땐 물어봐요</small></span>
        </button>
      </nav>
      </div>
    </main>
  );
}
