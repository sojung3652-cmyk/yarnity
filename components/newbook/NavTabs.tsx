"use client";
// Beside the AI tab on the wizard's right page (wide screens, Kim): three cloth index tabs - 홈, 나의 도안집,
// 뜨개 용어집 - so you can leave 도안 만들기 for them at any time. Same size and place as the AI tab (the fore
// edge, 6px of them under the page), one under another; a half-made pattern asks first (book.leaveTo).
import { useBook } from "@/components/Book/BookProvider";

const TABS = [
  { to: "/", label: "홈", tip: "홈으로", patch: "/mobile/diary/patch_yellow.webp" },
  { to: "/mine", label: "도안집", tip: "나의 도안집", patch: "/mobile/diary/patch_cream.webp" },
  { to: "/glossary", label: "용어집", tip: "뜨개 용어집", patch: "/glossary/patch_babypink.webp" },
] as const;

export function NavTabs() {
  const book = useBook();
  return (
    <div className="nb-navtabs">
      {TABS.map(t => (
        <button key={t.to} type="button" className="nb-navtab" aria-label={t.tip} onClick={() => book.leaveTo(t.to)}>
          <span className="nb-navtab-plate" style={{ backgroundImage: `url(${t.patch})` }}><span>{t.label}</span></span>
          <span className="nb-navtab-tip" aria-hidden="true">{t.tip}</span>
        </button>
      ))}
    </div>
  );
}
