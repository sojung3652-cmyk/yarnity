"use client";
// The phone's top bar on its own screens (나의 도안집, 완성 도안, 따라 뜨기): ‹ goes one screen back (따라 뜨기 ->
// 완성 도안 -> 나의 도안집 -> the book), the gold wordmark always goes to the book's first page, and the right
// side is the screen's own (+ 새 도안, or ···). The wordmark explains itself once ("로고를 누르면 처음으로
// 가요") the first time a screen asks for it (tip), then never again.
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FoilLogo } from "@/components/FoilLogo";

const TIP_KEY = "m.logoTip";

export function MobileTopBar({ back, logo = 84, right, tip }: { back: () => void; logo?: number; right?: ReactNode; tip?: boolean }) {
  const router = useRouter(), [showTip, setShowTip] = useState(false);
  useEffect(() => {
    if (!tip) return;
    try { if (localStorage.getItem(TIP_KEY)) return; localStorage.setItem(TIP_KEY, "1"); } catch { return; }
    setShowTip(true); const t = setTimeout(() => setShowTip(false), 4200); return () => clearTimeout(t);
  }, [tip]);
  return (
    <header className="mt-bar-top">
      <button type="button" className="mtb-back" aria-label="뒤로" onClick={back}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <button type="button" className="mtb-logo" aria-label="처음으로" style={{ width: logo }} onClick={() => router.push("/")}>
        <FoilLogo className="mtb-foil" />
        {showTip && <span className="mtb-tip" role="status">로고를 누르면 처음으로 가요</span>}
      </button>
      <div className="mtb-right">{right}</div>
    </header>
  );
}

/** the ··· button for the bar */
export const MoreButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" className="mtb-more" aria-label="더 보기" aria-haspopup="dialog" onClick={onClick}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="18.5" cy="12" r="1.6" fill="currentColor" /></svg>
  </button>
);

/** the yellow + 새 도안 label */
export const NewButton = ({ onClick, children = "+ 새 도안" }: { onClick: () => void; children?: ReactNode }) => (
  <button type="button" className="mtb-new" onClick={onClick}><span>{children}</span></button>
);
