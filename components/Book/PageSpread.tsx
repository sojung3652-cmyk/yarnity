"use client";
// Content of the open book's two pages (design comp: legacy/pic/book_refer.png), shared by the WebGL book
// (laid on its pages with CSS3DRenderer) and the CSS fallback book. All text is real text; positions and
// type are % / cqw of the page (each page box is a size container), so the layout scales with the page.
// Phones (< 900px) see only the right page: it then carries everything, stacked (see .pg-* in Book.css).
import Link from "next/link";
import { FoilLogo } from "../FoilLogo";

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Document with a pencil (도안 만들기). */
const DocPencilIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
    <path d="M13.5 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h5" />
    <path d="M13.5 3 18 7.5V11M13.5 3v4.5H18" />
    <path d="M8 10.5h6M8 13.5h5M8 16.5h2.5" />
    <path d="M20.6 13.4a1.2 1.2 0 0 1 0 1.7l-5.4 5.4-2.4.7.7-2.4 5.4-5.4a1.2 1.2 0 0 1 1.7 0z" />
  </svg>
);
/** Folder with a heart (내 작품). */
const FolderHeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
    <path d="M3 9.5h18" />
    <path d="M12 17.6s-3.1-1.8-3.1-3.8a1.6 1.6 0 0 1 3.1-.6 1.6 1.6 0 0 1 3.1.6c0 2-3.1 3.8-3.1 3.8z" />
  </svg>
);
/** Ball of yarn (ribbon tab). */
const YarnBallIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
    <circle cx="12" cy="12" r="8" />
    <path d="M6.2 6.6c4 1.6 7.6 5.6 8.8 12.8M4.6 10.4c4.4.6 8.6 3.6 11.4 8.4M9.6 4.4c3.6 2.4 7 6.8 8.2 11.6M14.4 4.3c-2.6 3.6-6.4 6.6-10.2 8.8" />
  </svg>
);
const Arrow = () => <span className="pg-arrow" aria-hidden="true">→</span>;

/** One-line drawing: yarn unwinding from a ball, a heart loop, then flowing off to the right. */
const YarnLine = () => (
  <svg className="pg-yarn" viewBox="0 0 400 120" aria-hidden="true" fill="none" stroke="#B9A79C" strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke">
    <path vectorEffect="non-scaling-stroke" d="M2 104C30 110 60 106 92 100C130 93 150 98 178 92C214 84 236 96 262 84C280 76 290 70 296 62C284 48 272 30 280 18C288 7 302 12 306 26C310 12 324 7 332 18C340 32 324 52 300 66C292 72 296 80 312 82C340 86 368 74 398 80" />
    <circle cx="78" cy="68" r="38" fill="#FBF3EA" vectorEffect="non-scaling-stroke" />
    <g vectorEffect="non-scaling-stroke">
      <path vectorEffect="non-scaling-stroke" d="M50 42c14 6 32 24 38 62M42 58c18 2 40 18 52 44M62 32c16 10 34 30 40 52M88 31c-12 14-30 30-50 40M104 50c-14 14-32 34-40 52" />
    </g>
  </svg>
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
      <YarnLine />
    </div>
  );
}

/** Right page: the two actions, the ribbon tab that closes the book, the crochet motif. On phones it
 *  also carries the brand block above the actions. */
export function RightPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="pg-page pg-rp">
      <button type="button" className="pg-ribbon" aria-label="책 덮기" onClick={e => { e.stopPropagation(); onClose(); }}>
        <span className="pg-ribbon-tab"><YarnBallIcon /></span>
        <span className="pg-ribbon-tip" aria-hidden="true">책 덮기</span>
      </button>
      <div className="pg-phone-brand"><Brand phone /></div>
      <nav className="pg-actions" aria-label="시작하기">
        <Link className="pg-act pg-act-primary" href="/new"><DocPencilIcon /><span className="pg-sep" /><span className="pg-label">도안 만들기</span><Arrow /></Link>
        <Link className="pg-act" href="/mine"><FolderHeartIcon /><span className="pg-sep" /><span className="pg-label">내 작품</span><Arrow /></Link>
      </nav>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pg-motif" src="/pic/cro-motif.webp" alt="" width={1000} height={633} />
    </div>
  );
}
