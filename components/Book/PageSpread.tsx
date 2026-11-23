"use client";
// Content of the open book's two pages (design comp: legacy/pic/book_refer.png), shared by the WebGL book
// (laid on its pages with CSS3DRenderer) and the CSS fallback book. All text is real text; positions and
// type are % / cqw of the page (each page box is a size container), so the layout scales with the page.
// Phones (< 900px) see only the right page: it then carries everything, stacked (see .pg-* in Book.css).
import Link from "next/link";
import { useEffect, useState } from "react";
import { FoilLogo } from "../FoilLogo";
import { SparkleLogo } from "../SparkleLogo";
import { GoldX } from "../GoldX";
import { useApp } from "@/components/AppProvider";
import { freshDraft } from "@/lib/items";
import { store } from "@/lib/store";
import { TERMS } from "@/lib/glossary";
import { useBook, type WizStep } from "./BookProvider";

const STEP_NAME: Record<WizStep, string> = { 1: "이름", 2: "품목", 3: "실과 크기", 4: "확인" };

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Printer's ornament under the left page's copy: the yarn ball from the logo (cut out of logo-mark.svg
 *  with a circular mask, not redrawn) between two hairlines. */
const Ornament = () => (
  <div className="pg-orn" aria-hidden="true"><span className="pg-orn-line" /><span className="pg-orn-ball" /><span className="pg-orn-line" /></div>
);


function Brand({ phone }: { phone?: boolean }) {
  const H = phone ? "p" : "h1"; // one <h1> per page: the desktop left page carries it; the phone page has its own
  return (
    <>
      <H className="pg-logo">
        <span className="sr">Yarnity</span>
        {/* wide screens: the glinting wordmark, as the top bars (Kim); the phone page keeps the still one */}
        {phone ? <FoilLogo /> : <SparkleLogo className="pg-foil" />}
      </H>
      <p className="pg-cap">Intelligent Crochet</p>
      <span className="pg-rule" aria-hidden="true" />
      <p className="pg-tag" lang="en">Your Personal Crochet Pattern Studio</p>
      <p className="pg-ko">아이디어만 있으면,<br />나만의 뜨개질 도안을 만들 수 있습니다.</p>
    </>
  );
}

/** Left page (wide screens). */
export function LeftPage() {
  return (
    <div className="pg-page pg-lp">
      <Brand />
      <Ornament />
    </div>
  );
}

/** Right page: the two actions, the ribbon tab that closes the book, the crochet motif. On phones it
 *  also carries the brand block above the actions. */
export function RightPage({ onClose }: { onClose: () => void }) {
  // number of saved works (iyarn.projects, read by AppProvider after mount)
  const { ready, projects, draft, setDraft } = useApp(), workCount = ready ? projects.length : 0;
  const book = useBook();
  // 도안 만들기 always asks: a new pattern (from the start, the draft cleared) or carry on with the draft
  const [choose, setChoose] = useState(false);
  // folded again when the book closes or comes back from the wizard; not on the way into the wizard, so the
  // picture of this page on the turning leaf still shows the choice that was made
  useEffect(() => { if (book.view !== "wizard") setChoose(false); }, [book.view]);
  const saved = (() => { const s = store.get<number>("iyarn.newstep", 1); return (s >= 1 && s <= 4 ? s : 1) as WizStep; })();
  const hasDraft = ready && (saved > 1 || draft.name.trim() !== "");
  const startNew = () => {
    setDraft(freshDraft()); store.set("iyarn.newstep", 1);
    book.startWizard(1);
  };
  return (
    <div className="pg-page pg-rp">
      <button type="button" className="pg-ribbon" aria-label="책 덮기" onClick={e => { e.stopPropagation(); onClose(); }}>
        <span className="pg-ribbon-tab"><GoldX /></span>
        <span className="pg-ribbon-tip" aria-hidden="true">책 덮기</span>
      </button>
      <div className="pg-phone-brand"><Brand phone /></div>
      {/* two text links divided by hairlines (whole row = one link) */}
      <nav className="pg-actions" aria-label="시작하기">
        <button type="button" className="pg-link pg-link-lav" aria-expanded={choose} aria-controls="pgChoose" onClick={e => { e.stopPropagation(); setChoose(c => !c); }}>
          <span className="pg-link-text"><span className="pg-link-title">도안 만들기</span><span className="pg-link-desc">실과 크기만 정하면 코 수를 계산합니다</span></span>
          <span className="pg-link-end">{choose ? "닫기" : "시작하기"}</span>
        </button>
        {/* the choice, as two smaller labels under it. Each goes straight to its step (startWizard): a bare
            /new would show step 1 first and then the saved step, and the book would turn twice */}
        {choose && (
          <div className="pg-choose" id="pgChoose" role="group" aria-label="도안 만들기">
            <button type="button" className="pg-link pg-link-sub pg-link-apricot" onClick={e => { e.stopPropagation(); startNew(); }}>
              <span className="pg-link-text"><span className="pg-link-title">새 도안 만들기</span><span className="pg-link-desc">처음부터 시작합니다</span></span>
            </button>
            {/* 3D로 만들어보기 (Kim): a new pattern, straight into the 3D work screen (wide screens; elsewhere the first page) */}
            <button type="button" className="pg-link pg-link-sub pg-link-lav" onClick={e => { e.stopPropagation(); store.set("iyarn.go3d", 1); startNew(); }}>
              <span className="pg-link-text"><span className="pg-link-title">3D로 만들어보기</span><span className="pg-link-desc">그리면서 바로 실로 떠 봅니다</span></span>
            </button>
            <button type="button" className="pg-link pg-link-sub pg-link-lilac" disabled={!hasDraft} onClick={e => { e.stopPropagation(); book.startWizard(saved); }}>
              <span className="pg-link-text"><span className="pg-link-title">이어서 만들기</span>
                <span className="pg-link-desc">{hasDraft ? `${draft.name.trim() || "이름 없는 작품"} · ${STEP_NAME[saved]}부터` : "이어서 만들 도안이 없습니다"}</span></span>
            </button>
          </div>
        )}
        <Link className="pg-link pg-link-rose" href="/mine">
          <span className="pg-link-text"><span className="pg-link-title">나의 도안집</span><span className="pg-link-desc">뜨던 곳부터 이어서</span></span>
          <span className="pg-link-end">{workCount ? `${workCount}개` : "아직 없습니다"}</span>
        </Link>
        {/* 뜨개 용어집 in pastel green (Kim) */}
        <Link className="pg-link pg-link-sage" href="/glossary">
          <span className="pg-link-text"><span className="pg-link-title">뜨개 사전</span><span className="pg-link-desc">모르는 말이 나오면 여기서</span></span>
          <span className="pg-link-end">{TERMS.length}개</span>
        </Link>
      </nav>
    </div>
  );
}
