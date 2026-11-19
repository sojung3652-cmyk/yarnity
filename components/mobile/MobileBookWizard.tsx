"use client";
// 도안 만들기 on phones, inside the web's 3D book: each step is the book's right page (the only page on the
// screen), the step's two book pages (useNewBook: the same components and state as the web) laid one under
// the other to the right page's width, scrolling inside the page when long. 이전 / 다음 at its foot move
// between steps; the book turns its page as on the web (Book3D useSpreads). The page is laid out at screen
// pixels (zoom = --k, the page px per screen px Book3D keeps on the page box), so type keeps its size.
import { useLayoutEffect, useRef } from "react";
import { useNewBook } from "@/components/newbook/NewBook";

const NAMES = ["이름", "품목", "실과 크기", "확인"];

export function MobileBookWizard() {
  const v = useNewBook(), s = v.phone, ref = useRef<HTMLFormElement>(null);
  // the page box's height in page px (Book3D sets it on the box), for the zoomed layout (mobile.css .mbw)
  useLayoutEffect(() => { const box = ref.current?.parentElement; if (box?.style.height) ref.current!.style.setProperty("--page-h", box.style.height); });
  if (!v.ready || !s) return <div className="mbw" />;
  return (
    <form ref={ref} className="mbw" noValidate onSubmit={e => { e.preventDefault(); s.next(); }} onKeyDown={v.onKeyDown}>
      <div className="mbw-scroll">
        <p className="mbw-step" aria-live="polite"><b>{s.step} / 4</b> · {NAMES[s.step - 1]}</p>
        <div className="mbw-pages">
          {v.left}
          {s.step !== 2 && <div className="mbw-split" aria-hidden="true" />}
          {s.step === 1 ? s.body : s.step === 2 ? null : v.right}
          {s.step === 2 && v.right}
        </div>
        <div className="mbw-foot">
          <button type="button" className="mbw-back" onClick={s.back.onClick}>{s.back.label === "이전" ? "← 이전" : `← ${s.back.label}`}</button>
          {s.final
            ? <button type="submit" className="mw-final" aria-disabled={s.blocked || undefined}><span className="mw-final-face">{s.nextText}</span></button>
            : <button type="submit" className="cloth-label cloth-next mbw-next" aria-disabled={s.blocked || undefined}><span className="cloth-face">{s.nextText.replace(" ↑", " →")}</span></button>}
        </div>
      </div>
    </form>
  );
}
