"use client";
// The phone's bottom bar, on every phone screen: 책장 (/) · 도안집 (/library) · 새 도안 (the lavender linen
// square in the middle) · 뜨는 중 (/track) · AI 상담 (gold; opens the AI sheet). The screen you are on is
// purple with a short gold underline (aria-current="page"). Icons are 1.5px line drawings.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/AppProvider";

const I = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONS = {
  shelf: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5h17" {...I} /><path d="M5 20.5V6.5h3.2v14M8.2 20.5V4.5h3.4v16" {...I} /><path d="m13.2 6.8 3.1-.8 3.4 13.7-3.1.8z" {...I} /></svg>,
  library: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5c-2-1.6-4.8-2-8-1.6v13.4c3.2-.4 6 0 8 1.6 2-1.6 4.8-2 8-1.6V4.9c-3.2-.4-6 0-8 1.6Z" {...I} /><path d="M12 6.5v13.4" {...I} /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13" {...I} strokeWidth={1.7} /></svg>,
  // a yarn ball with a hook through it
  knit: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="13.5" r="6.5" {...I} /><path d="M5.3 10.3c3.3.2 6.6 2.4 8.6 6.8M6.8 17.7c.6-3.6 3.6-7.3 8.4-8.6M8.2 7.6c2.7 1.4 4.6 4.6 4.8 8.8" {...I} /><path d="M14.5 9.5 20.3 3.7c.5-.5 1.2.2.7.7l-.9.9" {...I} /></svg>,
  ai: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3.5 12.6 9.4 18.5 11 12.6 12.6 11 18.5 9.4 12.6 3.5 11 9.4 9.4Z" {...I} /><path d="M18.5 15.5l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6z" {...I} strokeWidth={1.2} /></svg>,
};

/** `onNew`: the + (the menu book rises over this screen, MobileChrome); `bookUp` while it is up. */
export function MobileNavBar({ onNew, bookUp }: { onNew: () => void; bookUp: boolean }) {
  const path = usePathname(), { chat, setChat } = useApp();
  const ai = !!chat.open;
  const cur = (on: boolean) => (on && !ai ? "page" : undefined);
  return (
    <nav className="m-nav" aria-label="주 메뉴">
      <Link className="m-tab" href="/" aria-current={cur(path === "/")}>{ICONS.shelf}<span>책장</span></Link>
      <Link className="m-tab" href="/library" aria-current={cur(path === "/library" || path === "/mine" || path === "/pattern")}>{ICONS.library}<span>도안집</span></Link>
      <button type="button" className="m-tab m-tab-new" aria-label="새 도안" aria-haspopup="dialog" aria-expanded={bookUp} aria-current={cur(path === "/new" || bookUp)} onClick={onNew}>
        <span className="m-new"><span className="m-new-in">{ICONS.plus}</span></span>
      </button>
      <Link className="m-tab" href="/track" aria-current={cur(path === "/track")}>{ICONS.knit}<span>뜨는 중</span></Link>
      <button type="button" className="m-tab m-tab-ai" aria-expanded={ai} aria-current={ai ? "page" : undefined} onClick={() => setChat(c => ({ ...c, open: !c.open }))}>{ICONS.ai}<span>AI 상담</span></button>
    </nav>
  );
}
