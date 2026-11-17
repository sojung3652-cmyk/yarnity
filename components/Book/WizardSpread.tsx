"use client";
// TEMPORARY (one-book step 1): the wizard's spread in the 3D book, only the step title and moving
// between steps, to check the address <-> book state. Step 2 replaces it with the real step pages
// from components/newbook (inputs, folds, labels), unchanged.
import { useBook, type WizStep } from "./BookProvider";

const TITLES: Record<WizStep, string> = { 1: "이 작품의 이름은 무엇인가요?", 2: "무엇을 뜰까요?", 3: "어떤 실과 바늘을 쓰나요?", 4: "어떤 모양, 어떤 크기로 뜰까요?" };

export function WizardLeft() {
  const { step } = useBook();
  return (
    <div className="pg-page wz-tmp">
      <p className="wz-tmp-step">{step} / 4</p>
      <h1 className="wz-tmp-title">{TITLES[step]}</h1>
    </div>
  );
}

export function WizardRight() {
  const { step, goStep, toHome } = useBook();
  return (
    <div className="pg-page wz-tmp">
      <div className="wz-tmp-nav">
        {step > 1 ? <button type="button" onClick={() => goStep((step - 1) as WizStep)}>← 이전</button> : <button type="button" onClick={toHome}>← 메뉴</button>}
        {step < 4 && <button type="button" onClick={() => goStep((step + 1) as WizStep)}>다음 →</button>}
      </div>
    </div>
  );
}
