"use client";
// 도안 만들기 on phones (/new?step=1..4): the same four steps, state and checks as the book (useNewBook in
// components/newbook/NewBook.tsx, used as it is), one notebook sheet per page of the book:
//   step 1: the title page, then the name          step 3: the yarn and hook, then the shape and size
//   step 2: the item (chips and the item's note)   step 4: the supplies, then the preview
// Each sheet has 이전 and 다음 at its foot; the last sheet of a step goes on to the next step (with the
// book's checks), the first sheet of a step goes back to the previous step's last sheet. A sheet turns
// over the spring like the cover: up when going on, back down when going back. The four-part bar shows
// the step; a long sheet scrolls inside itself.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { AskAiLine } from "@/components/AskAiLine";
import { useNewBook } from "@/components/newbook/NewBook";
import { yarnStepOk } from "@/components/newbook/YarnStep";
import { MobileNotebook, takeSnapshot, type Snapshot } from "./MobileNotebook";

const NAMES = ["이름", "품목", "실과 크기", "확인"];
const SHEETS = [2, 1, 2, 2]; // sheets per step

export function MobileWizard() {
  const v = useNewBook(), s = v.phone, { draft } = useApp();
  const scroll = useRef<HTMLDivElement>(null), snap = useRef<Snapshot | null>(null);
  // which sheet, and which way the last turn went. A step change (다음 on a step's last sheet, 이전 on its
  // first, Back / Forward) lands on the new step's first sheet, or on its last one when we came back to it;
  // decided while rendering so the sheet turns once
  const [view, setView] = useState<{ step: number | null; page: number; dir: 1 | -1 }>({ step: null, page: 0, dir: 1 });
  const landLast = useRef(false);
  if (s && view.step !== s.step) {
    const back = view.step != null && s.step < view.step;
    setView({ step: s.step, page: back && landLast.current ? SHEETS[s.step - 1] - 1 : 0, dir: back ? -1 : 1 });
    landLast.current = false;
  }
  const page = view.page, dir = view.dir;
  useLayoutEffect(() => { scroll.current?.scrollTo(0, 0); }, [view.step, view.page]);
  if (!v.ready || !s) return <main id="view-new" className="m-root" />;

  const n = SHEETS[s.step - 1], p = Math.min(page, n - 1), last = p === n - 1;
  const folio = SHEETS.slice(0, s.step - 1).reduce((a, b) => a + b, 0) + p + 1;
  // the sheet's content: the book's own pages (their book-only parts are hidden on phones, mobile.css)
  let sheet: ReactNode, title = false;
  if (s.step === 1) sheet = p === 0 ? v.left : s.body;
  else if (s.step === 2) { sheet = s.body; title = true; }
  else sheet = p === 0 ? v.left : v.right;

  const keep = () => { snap.current = takeSnapshot(scroll.current); };
  const turnTo = (np: number, d: 1 | -1) => { keep(); setView(x => ({ ...x, page: np, dir: d })); };
  const back = () => {
    if (p > 0) return turnTo(p - 1, -1);
    if (s.step > 1) { landLast.current = true; keep(); }
    s.back.onClick();
  };
  const next = () => {
    if (!last) return turnTo(p + 1, 1);
    // step 3 checks the yarn too: when that is what is missing, show it on its own sheet
    if (s.step === 3 && !yarnStepOk(draft) && p > 0) { turnTo(0, -1); setTimeout(s.next, 80); return; }
    if (!s.blocked) keep();
    s.next();
  };

  return (
    <main id="view-new" className="m-root">
      <MobileNotebook turn={`${s.step}-${p}`} dir={dir} snapshot={snap} label="도안 만들기" className="mw" scrollRef={scroll}>
        <form ref={v.formRef} className="mw-form" noValidate onSubmit={e => { e.preventDefault(); next(); }} onKeyDown={v.onKeyDown}>
          <div className="mw-progress">
            <ol aria-hidden="true">{[1, 2, 3, 4].map(i => <li key={i} className={i < s.step ? "done" : i === s.step ? "on" : ""} />)}</ol>
            <p aria-live="polite"><b>{s.step} / 4</b> · {NAMES[s.step - 1]}</p>
          </div>
          {title && <><h1 className="mw-title" tabIndex={-1}>{s.title}</h1>{s.ask && <AskAiLine which={s.ask} />}</>}
          <div className="mw-body">{sheet}</div>
          <div className="mw-foot">
            <button type="button" className="mw-back" onClick={back}>이전</button>
            <span className="mw-folio" aria-hidden="true">{folio}</span>
            {/* as in the book: a cream cloth label for the pages, the dark ribbon with gold for the last one */}
            {last && s.final
              ? <button type="submit" className="mw-final" aria-disabled={s.blocked || undefined}><span className="mw-final-face">{s.nextText}</span></button>
              : <button type="submit" className="m-label mw-next" aria-disabled={(last && s.blocked) || undefined}><span className="m-label-in">{last ? s.nextText : "다음 쪽 ↑"}</span></button>}
          </div>
        </form>
      </MobileNotebook>
    </main>
  );
}
