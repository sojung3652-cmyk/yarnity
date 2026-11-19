"use client";
// 도안 만들기 on phones, inside the web's 3D book: the book's right page is the only page on the screen, so a
// step the web lays over two pages is two sheets here, and each sheet change turns the book's page (the sheet
// is part of the spread Book3D turns between; components/mobile/sheetStore.ts).
//   1 이름: the HANDMADE name label            3-1 실: thickness, colours, name / material / label
//   2-1 품목 고르기: groups and item tiles      3-2 바늘과 크기: the hook, shape and size
//   2-2 품목 소개: the web's hang tag          4-1 준비물 확인   4-2 미리 보기 (the dark ribbon: 완성)
// The pages are the web's own (useNewBook: the same components, state, checks and choices). The step bar at
// the top and 이전 / 다음 at the foot stay put; the sheet scrolls between them. Laid out in screen px (the
// box is zoomed by --k, mobile.css .mbw), type and spacing per Kim's spec (mobile.css "wizard sheets").
// `sheet`: the sheet the book shows (Book3D passes the spread it shows, which lags the store during a turn).
import { useLayoutEffect, useRef } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { GoldX } from "@/components/GoldX";
import { useNewBook } from "@/components/newbook/NewBook";
import { yarnStepOk } from "@/components/newbook/YarnStep";
import { setSheet, SHEETS } from "./sheetStore";

const NAMES = ["이름", "품목", "실과 크기", "확인"];

export function MobileBookWizard({ sheet = 0 }: { sheet?: number }) {
  const v = useNewBook(), s = v.phone, { draft } = useApp(), book = useBook(), ref = useRef<HTMLFormElement>(null);
  // the page box's height in page px (Book3D sets it on the box), for the zoomed layout (mobile.css .mbw)
  useLayoutEffect(() => { const box = ref.current?.parentElement; if (box?.style.height) ref.current!.style.setProperty("--page-h", box.style.height); });
  if (!v.ready || !s) return <div className="mbw" />;
  const n = SHEETS[s.step] ?? 1, p = Math.min(sheet, n - 1), last = p === n - 1;

  // the sheet's content: the web's two pages (book-only parts hidden in mobile.css), split as listed above
  const body = s.step === 1 ? s.body
    : s.step === 3 && p === 1 ? <>{v.left}{v.right}</> // 바늘 (from the left page) + 모양과 크기
    : p === 0 ? v.left : v.right;

  const back = () => {
    if (p > 0) return setSheet(s.step, p - 1);
    if (s.step > 1) setSheet(s.step - 1, (SHEETS[s.step - 1] ?? 1) - 1); // back onto the previous step's last sheet
    s.back.onClick();
  };
  const next = () => {
    if (!last) return setSheet(s.step, p + 1);
    // step 3 checks the yarn too: when that is what is missing, turn back to its sheet to show it
    if (s.step === 3 && !yarnStepOk(draft)) { setSheet(3, 0); setTimeout(s.next, 900); return; }
    setSheet(s.step + 1, 0);
    s.next();
  };

  return (
    <form ref={ref} className={`mbw mbz mbz-s${s.step}-${p}`} noValidate onSubmit={e => { e.preventDefault(); next(); }} onKeyDown={v.onKeyDown}>
      {/* the book's close, as on its first page (a pattern half made asks first, as on the web) */}
      <button type="button" className="mbook-x" aria-label="책 덮기" onClick={book.close}><GoldX /></button>
      <ol className="mbz-steps" aria-label="진행 단계">
        {NAMES.map((t, i) => (
          <li key={t} className={i + 1 < s.step ? "done" : i + 1 === s.step ? "on" : ""} aria-current={i + 1 === s.step ? "step" : undefined}>
            <span className="mbz-dot" aria-hidden="true">{i + 1 < s.step ? "✓" : i + 1}</span>{t}
          </li>
        ))}
      </ol>
      <div className="mbz-scroll">{body}</div>
      <div className="mbz-foot">
        {/* on the last sheet 이전 is just the arrow, so the ribbon's words keep to one line on small phones */}
        <button type="submit" className={"mbz-btn mbz-back" + (last && s.final ? " is-short" : "")} formNoValidate aria-label={last && s.final ? "이전" : undefined}
          onClick={e => { e.preventDefault(); back(); }}><span className="mbz-face">{last && s.final ? "←" : `← ${p > 0 || s.step > 1 ? "이전" : s.back.label}`}</span></button>
        {last && s.final
          ? <button type="submit" className="mw-final mbz-final" aria-disabled={s.blocked || undefined}><span className="mw-final-face"><small>마지막 단계</small>완성 · 최종 도안 보기</span></button>
          : <button type="submit" className="mbz-btn mbz-next" aria-disabled={(last && s.blocked) || undefined}><span className="mbz-face">{last ? s.nextText.replace(/ [↑→]$/, "") + " →" : "다음 →"}</span></button>}
      </div>
    </form>
  );
}
