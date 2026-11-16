"use client";
// Content of the open book's two pages (design comp: legacy/pic/book_refer.png), shared by the WebGL book
// (laid on its pages with CSS3DRenderer) and the CSS fallback book. All text is real text; positions and
// type are % / cqw of the page (each page box is a size container), so the layout scales with the page.
// Phones (< 900px) see only the right page: it then carries everything, stacked (see .pg-* in Book.css).
import Link from "next/link";
import { useId } from "react";

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


/** The wordmark as debossed gold foil (hot-foil stamping): a gold gradient with fine grain, masked by the
 *  logo; the logo's alpha, blurred, is a height map with negative scale (pressed into the paper) lit from
 *  the upper left (the backdrop photo's light), so the upper-left inner walls fall into shade and the
 *  foil catches a highlight where it slopes towards the light; the paper's lower-right lip of each
 *  impression catches a thin light edge. Values are in the logo's 1170 x 579 units (~0.2 screen px). */
function FoilLogo() {
  const id = useId().replace(/:/g, "");
  const W = 1170, H = 579, g = `g${id}`, m = `m${id}`, f = `f${id}`, w = `w${id}`;
  return (
    <svg className="pg-foil" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="0.6">
          {/* soft antique gold, not brassy: the foil should read as a quiet accent on cream paper */}
          <stop offset="0" stopColor="#8A6E3A" /><stop offset=".18" stopColor="#C0A266" /><stop offset=".34" stopColor="#E6D3A4" />
          <stop offset=".5" stopColor="#B0904F" /><stop offset=".68" stopColor="#D9C18A" /><stop offset=".84" stopColor="#A08045" /><stop offset="1" stopColor="#CDB37C" />
        </linearGradient>
        <filter id={w}><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter>
        <mask id={m} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <image href="/pic/logo-mark.svg" width={W} height={H} filter={`url(#${w})`} />
        </mask>
        <filter id={f} x="-3%" y="-6%" width="106%" height="112%" colorInterpolationFilters="sRGB">
          {/* metallic grain */}
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  .5 .5 0 0 -.38" result="grain" />
          <feComposite in="grain" in2="SourceAlpha" operator="in" result="grainIn" />
          <feBlend in="SourceGraphic" in2="grainIn" mode="overlay" result="gold" />
          {/* height map: pressed in (negative surface scale) */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="-6" diffuseConstant="1.05" lightingColor="#ffffff" result="diff">
            <feDistantLight azimuth="225" elevation="48" />
          </feDiffuseLighting>
          <feSpecularLighting in="bump" surfaceScale="-6" specularConstant="0.9" specularExponent="22" lightingColor="#FFF4D2" result="spec">
            <feDistantLight azimuth="225" elevation="48" />
          </feSpecularLighting>
          <feComposite in="gold" in2="diff" operator="arithmetic" k1="1.15" k2="0" k3="0" k4="0" result="shaded" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" result="foil" />
          <feComposite in="foil" in2="SourceAlpha" operator="in" result="foilIn" />
          {/* inner shadow along the upper-left walls of the impression */}
          <feOffset in="SourceAlpha" dx="5" dy="5" result="shifted" />
          <feComposite in="SourceAlpha" in2="shifted" operator="out" result="rimTL" />
          <feGaussianBlur in="rimTL" stdDeviation="2.2" result="rimTLb" />
          <feFlood floodColor="#4A3214" floodOpacity="0.55" />
          <feComposite in2="rimTLb" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="innerShade" />
          {/* the paper's lower-right lip, lit */}
          <feOffset in="SourceAlpha" dx="4" dy="4" result="lipShift" />
          <feComposite in="lipShift" in2="SourceAlpha" operator="out" result="lip" />
          <feGaussianBlur in="lip" stdDeviation="1.6" result="lipB" />
          <feFlood floodColor="#FFFFFF" floodOpacity="0.85" />
          <feComposite in2="lipB" operator="in" result="lipLight" />
          {/* and its upper-left paper edge, a hair darker */}
          <feOffset in="SourceAlpha" dx="-3" dy="-3" result="edgeShift" />
          <feComposite in="edgeShift" in2="SourceAlpha" operator="out" result="edge" />
          <feGaussianBlur in="edge" stdDeviation="1.4" result="edgeB" />
          <feFlood floodColor="#6B5136" floodOpacity="0.28" />
          <feComposite in2="edgeB" operator="in" result="edgeShade" />
          <feMerge><feMergeNode in="lipLight" /><feMergeNode in="edgeShade" /><feMergeNode in="foilIn" /><feMergeNode in="innerShade" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${f})`}><rect width={W} height={H} fill={`url(#${g})`} mask={`url(#${m})`} /></g>
    </svg>
  );
}

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
