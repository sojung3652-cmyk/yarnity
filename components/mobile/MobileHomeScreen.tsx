"use client";
// ② The phone's home (its medallion and glinting logo are the opening's scene, drawn over the slots - Kim: one home), "Girl's Diary" (Kim's spec): the gold logo and its caption; the bird picture in an
// ivory lace oval; then ivory cloth labels, one cream (Kim; flow-mobile.css): 도안 만들기 -> step 1;
// 이어서 뜨기 (a dusty-rose band) when a work is on the hook -> its 따라 뜨기; 나의 도안집 (n권); AI와 상의
// (a gold embroidered star) -> the existing AI sheet; 뜨개 용어집.
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useApp } from "@/components/AppProvider";
import { BookCover, GoldDefs, ProgressBar, whereOf } from "@/components/BookCover";
import { statusOf } from "@/lib/status";
import { useBook } from "@/components/Book/BookProvider";
import "./mine-mobile.css";

export function MobileHomeScreen() {
  const { ready, projects, setActive, setChat } = useApp(), router = useRouter(), book = useBook();
  // 도안 만들기 opens step 1 (Kim); a pattern half made keeps what it has (the draft is not cleared)
  const start = () => book.startWizard(1);
  // 이어서 뜨기 (Kim): the work on the hook - the most recently knitted one that is going - straight to 따라 뜨기;
  // with none going, 나의 도안집 where the works are
  const hook = useMemo(() => [...projects].filter(p => statusOf(p) === "knitting" && (p.current || 0) > 0)
    .sort((a, b) => (b.updatedAt ?? b.created) - (a.updatedAt ?? a.created))[0] ?? null, [projects]);
  const w = hook ? whereOf(hook) : null;
  const resume = () => { if (!hook) { router.push("/my"); return; } setActive(hook.id); router.push("/track"); };
  // the opening's card rise (body.m-intro-cards, PhoneOpening) stays on while this home is shown: taking it off
  // there would hand the cards back their own arrival animation, which then plays a second time (the flash)
  useEffect(() => () => document.body.classList.remove("m-intro-cards"), []);

  return (
    <main id="view-m-home" className="mf mfh">
      <GoldDefs />
      {/* the knitted bird in its lace oval on top, the gold-thread Yarnity under it (Kim swapped them): a picture
          only (no words, not a button) */}
      {/* slots only (Kim: one home): the opening's scene draws the medallion and the glinting logo over them
          (MobileSplash -> PhoneOpening mode "home"); they keep the room and the name */}
      <div className="mfh-lace" aria-hidden="true" />
      <header className="mfh-brand">
        <h1 className="mfh-logo"><span className="sr">Yarnity</span><span className="mfh-foil mfh-slot" aria-hidden="true" /></h1>
      </header>

      <div className="mfh-actions">
      {/* Kim (11/25): My Page | Handbook, then 이어서 뜨기 across, then New Pattern | Yarni */}
      <nav className="mfh-foot mfh-top" aria-label="둘러보기">
        <button type="button" className="mf-patch is-pink" onClick={() => router.push("/my")}>
          <span className="mfh-two mfh-en" lang="en"><b>My Page</b></span>
        </button>
        <button type="button" className="mf-patch is-green" onClick={() => router.push("/glossary")}>
          <span className="mfh-two mfh-en" lang="en"><b>Handbook</b></span>
        </button>
      </nav>
      {ready && hook && w ? (
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
      ) : (
        <button type="button" className="mf-patch is-cream mfh-go" onClick={resume}>
          <span className="mfh-two"><b>이어서 뜨기</b></span>
        </button>
      )}
      <nav className="mfh-foot" aria-label="만들기">
        <button type="button" className="mf-patch is-yellow mfh-make" onClick={start}>
          <span className="mfh-two mfh-en" lang="en"><b>New Pattern</b></span>
        </button>
        <button type="button" className="mf-patch is-cream mfh-ai" onClick={() => setChat(c => ({ ...c, open: true }))}>
          <img className="mfh-star" src="/mobile/diary/star.webp" alt="" />
          <span className="mfh-two mfh-en" lang="en"><b>Yarni</b></span>
        </button>
      </nav>
      </div>
    </main>
  );
}
