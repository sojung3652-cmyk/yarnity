"use client";
// Step ① of 도안 만들기 as a book's opening spread.
// Left page (TitleCover): the gold-foil wordmark, its caption, a short gold rule, an italic line, the month.
// Right page (TitlePage): the progress, then the work's name on a big woven label, like the label sewn into
// a handmade piece: cream weave, both ends folded under, lavender stitches inside the ends, a small
// "handmade" line over the name and the maker's line under it. The name starts empty ("작품 이름"
// placeholder only), shrinks from 26px to 19px when long, then wraps to two lines; at most 30 characters;
// Enter goes on to the next step.
import { useLayoutEffect, useRef, useState } from "react";
import { FoilLogo } from "@/components/FoilLogo";
import { SparkleLogo } from "@/components/SparkleLogo";
import { useMobile } from "@/components/mobile/useMobile";

const MAX = 30, BIG = 26, SMALL = 19;

export function TitleCover({ month }: { month: string }) {
  const phone = !!useMobile();
  return (
    <div className="tp tp-cover">
      <div className="tp-head">
        {/* wide screens: the glinting wordmark, bigger, as the book's first page (Kim); phones keep theirs */}
        {phone ? <FoilLogo className="tp-logo" /> : <SparkleLogo className="tp-logo tp-logo-web" />}
        <p className="tp-cap">Intelligent Crochet</p>
        <span className="tp-rule" aria-hidden="true" />
        <p className="tp-sub" lang="en">a crochet pattern book</p>
      </div>
      <p className="tp-month" lang="en">{month}</p>
    </div>
  );
}

/** `before`: what comes ahead of the name (새 도안: start fresh or go on with something - StartChoice) */
export function TitlePage({ name, onName, onEnter, progress, before }: { name: string; onName: (v: string) => void; onEnter: () => void; progress: React.ReactNode; before?: React.ReactNode }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [fit, setFit] = useState({ size: BIG, rows: 1 });
  // fit the name: shrink first, then allow a second line
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const cs = getComputedStyle(el), ctx = document.createElement("canvas").getContext("2d")!;
    const avail = el.clientWidth - 8;
    ctx.font = `500 ${BIG}px ${cs.fontFamily}`;
    const w = ctx.measureText(name || "").width;
    const size = w <= avail ? BIG : Math.max(SMALL, Math.floor((BIG * avail) / w));
    ctx.font = `500 ${size}px ${cs.fontFamily}`;
    setFit({ size, rows: ctx.measureText(name || "").width > avail ? 2 : 1 });
  }, [name]);
  useLayoutEffect(() => { requestAnimationFrame(() => ref.current?.focus({ preventScroll: true })); }, []);

  return (
    <div className="tp">
      <div className="tp-progress">{progress}</div>
      {before}
      <div className="tp-name">
        <p className="tp-ask">이 작품의 이름을 지어 주십시오</p>
        <div className="tp-label">
          <span className="tp-label-top" lang="en" aria-hidden="true">handmade</span>
          <label htmlFor="nbName" className="sr">작품 이름</label>
          <textarea id="nbName" ref={ref} className="tp-input" rows={fit.rows} maxLength={MAX} placeholder="작품 이름" autoComplete="off" spellCheck={false}
            style={{ fontSize: fit.size }} value={name}
            onChange={e => onName(e.target.value.replace(/\n/g, ""))}
            onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); onEnter(); } }} />
          <span className="tp-label-bottom" lang="en" aria-hidden="true">with love · yarnity</span>
        </div>
        <p className="nb-help">비워 두면 &lsquo;이름 없는 작품&rsquo;으로 저장됩니다.</p>
      </div>
    </div>
  );
}
