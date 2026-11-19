"use client";
// Phones, 도안 만들기 only: two cloth labels lying on the desk under the open book - 처음으로 (cream: back to the
// book's first page) and 나의 도안집 (rose: /mine). They sit 26px under the book's right page, as wide as it,
// clear of the bottom safe area, and step aside while the keyboard is up (a field has focus). A pattern half
// made asks first with the web's own question (BookProvider leaveTo / toHome).
import { useEffect, useState } from "react";
import { useBook } from "@/components/Book/BookProvider";

const I = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function DeskButtons() {
  const book = useBook();
  const [box, setBox] = useState<{ left: number; width: number; top: number } | null>(null), [typing, setTyping] = useState(false);
  // follow the right page's place on the screen (it settles once the book has opened)
  useEffect(() => {
    let raf = 0, last = "";
    const measure = () => {
      const r = document.getElementById("bookRight")?.getBoundingClientRect();
      if (r && r.width > 40) {
        const key = [r.left, r.width, r.bottom].map(Math.round).join();
        if (key !== last) { last = key; setBox({ left: Math.round(r.left), width: Math.round(r.width), top: Math.round(r.bottom + 26) }); }
      }
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, []);
  // the keyboard: hidden while a text field has focus
  useEffect(() => {
    const field = (e: Element | null) => !!e?.matches?.('input:not([type="checkbox"]):not([type="radio"]):not([type="color"]), textarea, select, [contenteditable="true"]');
    const on = () => setTyping(field(document.activeElement)), off = () => setTimeout(on, 0);
    document.addEventListener("focusin", on); document.addEventListener("focusout", off);
    return () => { document.removeEventListener("focusin", on); document.removeEventListener("focusout", off); };
  }, []);
  if (!box) return null;
  return (
    <nav className={"m-desk-btns" + (typing ? " is-away" : "")} aria-label="책 밖으로" style={{ left: box.left, width: box.width, top: `min(${box.top}px, calc(100svh - 52px - env(safe-area-inset-bottom, 0px)))` }}>
      <button type="button" className="m-desk-btn is-cream" onClick={book.toHome}>
        <span className="m-desk-face">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 7.5 8 3l5.5 4.5M4 6.6V13h3v-3.5h2V13h3V6.6" {...I} /></svg>처음으로
        </span>
      </button>
      <button type="button" className="m-desk-btn is-rose" onClick={() => book.leaveTo("/mine")}>
        <span className="m-desk-face">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4.2C6.6 3.1 4.6 2.8 2.3 3.1v9.4c2.3-.3 4.3 0 5.7 1.1 1.4-1.1 3.4-1.4 5.7-1.1V3.1c-2.3-.3-4.3 0-5.7 1.1Z" {...I} /><path d="M8 4.2v9.4" {...I} /></svg>나의 도안집
        </span>
      </button>
    </nav>
  );
}
