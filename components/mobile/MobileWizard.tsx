"use client";
// 도안 만들기 on phones (/new?step=1..4): the same four steps, state and checks as the book (useNewBook in
// components/newbook/NewBook.tsx), laid out top to bottom on one notebook page: a four-part progress bar
// (done parts gold) with "2 / 4 · 품목", the step's title and the AI line, the step itself, then 이전 (text)
// and the lavender 다음 label with a folded corner. A new step turns the page up off the spiral; a long
// step scrolls inside the page only.
import { useEffect, useRef } from "react";
import { AskAiLine } from "@/components/AskAiLine";
import { useNewBook } from "@/components/newbook/NewBook";
import { MobileNotebook } from "./MobileNotebook";

const NAMES = ["이름", "품목", "실과 크기", "확인"];

export function MobileWizard() {
  const v = useNewBook(), s = v.phone, scroll = useRef<HTMLDivElement>(null);
  // each step starts at the top of the page
  useEffect(() => { scroll.current?.scrollTo(0, 0); }, [s?.step]);
  if (!v.ready || !s) return <main id="view-new" className="m-root" />;
  return (
    <main id="view-new" className="m-root">
      <MobileNotebook turn={s.step} label="도안 만들기" className="mw" scrollRef={scroll}>
        <form ref={v.formRef} className="mw-form" noValidate onSubmit={v.onSubmit} onKeyDown={v.onKeyDown}>
          <div className="mw-progress">
            <ol aria-hidden="true">{[1, 2, 3, 4].map(i => <li key={i} className={i < s.step ? "done" : i === s.step ? "on" : ""} />)}</ol>
            <p aria-live="polite"><b>{s.step} / 4</b> · {NAMES[s.step - 1]}</p>
          </div>
          <h1 className="mw-title" id="nbTitle" tabIndex={-1}>{s.title}</h1>
          {s.ask && <AskAiLine which={s.ask} />}
          <div className="mw-body">{s.body}</div>
          <div className="mw-foot">
            <button type="button" className="mw-back" onClick={s.back.onClick}>{s.back.label}</button>
            {/* as in the book: a cream cloth label for the steps, the dark ribbon with gold for the last one */}
            <button type="submit" className={s.final ? "mw-final" : "m-label mw-next"} aria-disabled={s.blocked || undefined}>
              <span className={s.final ? "mw-final-face" : "m-label-in"}>{s.nextText}</span>
            </button>
          </div>
        </form>
      </MobileNotebook>
    </main>
  );
}
