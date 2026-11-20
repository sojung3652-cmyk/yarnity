"use client";
// ③-⑨ 도안 만들기 on phones, as plain app screens (no book; Kim's spec). The steps, fields, choices, words,
// checks and saving are the web's own (useNewBook); only the frame and the layout are the phone's:
//   a 44px bar (‹ back · "1 / 4 · 이름" · ✕ leave, which asks the web's "만들던 도안을 저장할까요?"), four
//   lavender progress bars, the question, the screen, and a full-width yellow label fixed at the foot.
//   The web's four steps are seven screens here:
//     1 이름 · 2 품목 (a tile opens the item's intro sheet from the bottom) · 3 실 · 3 바늘과 크기 ·
//     4 준비물 확인 · 4 미리 보기 (the dark ribbon: 완성 · 최종 도안 보기 -> 완성 도안, just made)
//   Moving on slides the new screen in from the right; going back, from the left (0.3s; a fade with reduced
//   motion). Which screen of a step is shown is kept per step (sheetStore), so coming back lands where it was.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { ItemArt } from "@/components/newbook/ItemArt";
import { useNewBook } from "@/components/newbook/NewBook";
import { yarnStepOk } from "@/components/newbook/YarnStep";
import { ITEM, itemIdOf } from "@/lib/items";
import { LaceButton } from "@/components/diary/Diary";
import { setSheet, useSheet } from "./sheetStore";

const NAMES = ["이름", "품목", "실과 크기", "확인"];
// per screen [step][sub]: the bar's name, the question, the foot button
const SCREEN: Record<string, { name: string; q?: ReactNode; next: string }> = {
  "1-0": { name: "이름", q: <>이 작품의 이름을<br />지어 주세요</>, next: "다음 · 품목 고르기" },
  "2-0": { name: "품목", q: "무엇을 뜰까요?", next: "" },
  "3-0": { name: "실", q: "어떤 실로 뜰까요?", next: "다음 · 바늘과 크기" },
  "3-1": { name: "바늘과 크기", q: "어떤 바늘로, 어떤 크기로 뜰까요?", next: "다음 · 준비물 확인" },
  "4-0": { name: "준비물 확인", q: "준비물을 확인해요", next: "다음 · 미리 보기" },
  "4-1": { name: "미리 보기", q: "이렇게 완성돼요", next: "" },
};
/** 코스터로 / 가방으로 / 숄로: 로 after a vowel or ㄹ, 으로 after other final consonants */
const ro = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; const jong = c >= 0 && c < 11172 ? c % 28 : 0; return w + (jong === 0 || jong === 8 ? "로" : "으로"); };
// the phone's own step 2 is one screen (the intro is a sheet over it)
const SUBS: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 2 };

export function MobileFlowWizard() {
  const v = useNewBook(), s = v.phone, book = useBook(), { draft } = useApp();
  const stepNow = s?.step ?? 1, sub = Math.min(useSheet(stepNow), (SUBS[stepNow] ?? 1) - 1);
  const [dir, setDir] = useState<1 | -1>(1), [intro, setIntro] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  // a new screen starts at its top
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [stepNow, sub]);
  useEffect(() => { if (stepNow !== 2) setIntro(false); }, [stepNow]);
  // the keyboard: the screen shrinks to what is visible above it (the button stays on top of the keyboard)
  // and the field being typed in is brought into view inside the screen
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const fit = () => {
      const el = main.current; if (!el) return;
      const kb = innerHeight - vv.height > 120; // a keyboard, not just the address bar
      el.style.height = kb ? `${Math.round(vv.height)}px` : "";
      if (kb) { scrollTo(0, 0); const f = document.activeElement as HTMLElement | null; if (f && el.contains(f)) f.scrollIntoView({ block: "center" }); }
    };
    vv.addEventListener("resize", fit); fit();
    return () => vv.removeEventListener("resize", fit);
  }, []);
  if (!v.ready || !s) return <main ref={main} id="view-m-new" className="mf mfw" />;

  const step = s.step, n = SUBS[step] ?? 1, last = sub === n - 1, key = `${step}-${sub}`, sc = SCREEN[key];
  const item = ITEM[itemIdOf(draft)], picked = step === 2 && !s.blocked;

  const back = () => {
    setDir(-1);
    if (sub > 0) return setSheet(step, sub - 1);
    if (step > 1) setSheet(step - 1, (SUBS[step - 1] ?? 1) - 1); // back onto the previous step's last screen
    s.back.onClick(); // step 1: home (it asks first when a pattern is half made)
  };
  const next = () => {
    if (!last) { setDir(1); return setSheet(step, sub + 1); }
    // step 3 checks the yarn too: when that is what is missing, go back to its screen to show it
    if (step === 3 && !yarnStepOk(draft)) { setDir(-1); setSheet(3, 0); setTimeout(s.next, 350); return; }
    if (step === 4 && !s.blocked) try { sessionStorage.setItem("m.justMade", "1"); } catch {} // 완성 도안 offers + 새 도안 · 나의 도안집 once
    setDir(1); setSheet(step + 1, 0); s.next();
  };

  // the screen's content: the web's pages (their own headings and bars hidden in flow-mobile.css)
  const content = step === 1 ? s.body
    : step === 2 ? v.left
    : step === 3 ? (sub === 0 ? v.left : <>{v.left}{v.right}</>)
    : sub === 0 ? v.left : v.right;
  const nextText = step === 2 ? (picked ? `${ro(item.name)} 할게요 · 다음` : "품목을 골라 주세요") : sc.next;
  const blocked = step === 2 ? !picked : last && s.blocked && step === 4;

  return (
    <main ref={main} id="view-m-new" className="mf mfw">
      <header className="mfw-bar">
        <button type="button" className="mfw-icon" aria-label={step === 1 && sub === 0 ? "홈으로" : "이전 단계"} onClick={back}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
        </button>
        <p className="mfw-where"><b>{step}</b> / 4 · {sc.name}</p>
        <button type="button" className="mfw-icon" aria-label="나가기" onClick={book.close}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
        </button>
      </header>
      <ol className="mfw-prog" aria-label={`진행 단계: ${step} / 4 · ${NAMES[step - 1]}`}>
        {NAMES.map((t, i) => <li key={t} className={i + 1 <= step ? "on" : ""} aria-current={i + 1 === step ? "step" : undefined}><span className="sr">{t}</span></li>)}
      </ol>

      <form className={`mfw-form mfw-s${key}`} noValidate onSubmit={e => { e.preventDefault(); if (!blocked) next(); }} onKeyDown={v.onKeyDown}
        onClickCapture={e => { if (step === 2 && (e.target as Element).closest(".nb-item")) setTimeout(() => setIntro(true), 0); }}>
        <div ref={body} className="mfw-body">
          <div key={key} className={"mfw-screen " + (dir > 0 ? "is-fwd" : "is-back")}>
            <h1 className="mfw-q">{sc.q}</h1>
            {content}
          </div>
        </div>
        <div className="mfw-foot">
          {step === 4 && last
            // ⑨ the slim mocha lace (Girl's Diary), the screen's width
            ? <LaceButton variant="mocha" width="fill" type="submit" className="mfw-final-lace" aria-disabled={s.blocked || undefined}>
                <small>마지막 단계</small><span>완성 · 최종 도안 보기 →</span>
              </LaceButton>
            : <button type="submit" className="mf-label is-yellow mfw-next" aria-disabled={blocked || undefined}><span className="mf-label-in">{nextText}</span></button>}
        </div>
      </form>

      {/* ⑤ the item's intro: a sheet from the bottom */}
      {intro && picked && (
        <div className="mfw-dim" onClick={() => setIntro(false)}>
          <section className="mfw-sheet" role="dialog" aria-modal="true" aria-labelledby="mfwItem" onClick={e => e.stopPropagation()}>
            <span className="mfw-grip" aria-hidden="true" />
            <div className="mfw-intro">
              <span className="mfw-tag"><span className="mfw-tag-hole" aria-hidden="true" /><ItemArt id={item.id} big fill={draft.color} /></span>
              <div className="mfw-intro-text">
                <p className="mfw-group">{item.group}</p>
                <h2 id="mfwItem">{item.name}{item.beta && <em className="nb-beta">베타</em>}</h2>
                <p>{item.desc}</p>
              </div>
            </div>
            <dl className="mfw-facts">
              <div><dt>난이도</dt><dd><span className="mfw-dots" aria-hidden="true">{[1, 2, 3].map(i => <i key={i} className={i <= (item.level === "쉬움" ? 1 : 2) ? "on" : ""} />)}</span>{item.level}</dd></div>
              <div><dt>예상 시간</dt><dd>{item.time}</dd></div>
              <div><dt>뜨는 순서</dt><dd>{item.method.split("→").map(x => x.trim()).filter(Boolean).join(" → ")}</dd></div>
            </dl>
            {item.note && <p className="mfw-note">{item.note}</p>}
            <button type="button" className="mf-label is-yellow mfw-next" onClick={() => { setIntro(false); next(); }}><span className="mf-label-in">이걸로 할게요 · 다음</span></button>
            <button type="button" className="mfw-other" onClick={() => setIntro(false)}>다른 것 볼게요</button>
          </section>
        </div>
      )}
    </main>
  );
}
