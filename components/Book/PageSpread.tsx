"use client";
// Content of the open book's two pages (design comp: legacy/pic/book_refer.png), shared by the WebGL book
// (laid on its pages with CSS3DRenderer) and the CSS fallback book. All text is real text; positions and
// type are % / cqw of the page (each page box is a size container), so the layout scales with the page.
// Phones (< 900px) see only the right page: it then carries everything, stacked (see .pg-* in Book.css).
import Link from "next/link";
import { FoilLogo } from "../FoilLogo";
import { RibbonGold } from "../RibbonGold";
import { useApp } from "@/components/AppProvider";
import { useBook } from "./BookProvider";

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
        <FoilLogo />
      </H>
      <p className="pg-cap">Intelligent Crochet</p>
      <span className="pg-rule" aria-hidden="true" />
      <p className="pg-tag" lang="en">Your Personal Crochet Pattern Studio</p>
      <p className="pg-ko">아이디어만 있으면,<br />나만의 뜨개질 도안을 만들 수 있어요.</p>
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
  const { ready, projects } = useApp(), workCount = ready ? projects.length : 0;
  const book = useBook();
  return (
    <div className="pg-page pg-rp">
      <button type="button" className="pg-ribbon" aria-label="책 덮기" onClick={e => { e.stopPropagation(); onClose(); }}>
        <span className="pg-ribbon-tab"><RibbonGold full w={78} h={107} ball={34} ballY={42} lineInset={9} lineEnd={84} /></span>
        <span className="pg-ribbon-tip" aria-hidden="true">책 덮기</span>
      </button>
      <div className="pg-phone-brand"><Brand phone /></div>
      {/* two text links divided by hairlines (whole row = one link) */}
      <nav className="pg-actions" aria-label="시작하기">
        {/* straight to the saved step (BookProvider.startWizard): a bare /new would show step 1 first, then
            be replaced by the saved step, and the book would turn twice */}
        <Link className="pg-link pg-link-lav" href="/new" onClick={e => { e.preventDefault(); book.startWizard(); }}>
          <span className="pg-link-text"><span className="pg-link-title">도안 만들기</span><span className="pg-link-desc">실과 크기만 정하면 코 수를 계산해요</span></span>
          <span className="pg-link-end">시작하기</span>
        </Link>
        <Link className="pg-link pg-link-rose" href="/mine">
          <span className="pg-link-text"><span className="pg-link-title">내 작품</span><span className="pg-link-desc">뜨던 곳부터 이어서</span></span>
          <span className="pg-link-end">{workCount ? `${workCount}개` : "아직 없어요"}</span>
        </Link>
      </nav>
    </div>
  );
}
