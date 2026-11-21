"use client";
// A pattern line with the stitches the glossary knows (짧은뜨기, 사슬뜨기, …: lib/glossary termRegex) marked by a
// dotted underline on a pale pink ground. Tapping one opens a small card just under it: the name on its
// category's cloth label, the symbol and the one-line summary, the US / UK abbreviations, and 그림으로 보기 →
// (the term's page). A tap outside, Esc or another word closes it. The card hangs from <body>, so a table or a
// scrolling box around the line never cuts it.
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { colorOf, shortLine, termForWord, termRegex, type GlossTerm } from "@/lib/glossary";
import { GlossSymbol } from "./GlossSymbol";
import "./glossary.css";

const OPEN = "gl-word-open";

function Word({ word, term }: { word: string; term: GlossTerm }) {
  const btn = useRef<HTMLButtonElement>(null), card = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const me = useRef(Symbol());
  const close = () => setAt(null);
  const open = () => {
    const r = btn.current!.getBoundingClientRect(), w = Math.min(300, innerWidth - 24);
    setAt({ x: Math.max(12, Math.min(r.left + scrollX, scrollX + innerWidth - w - 12)), y: r.bottom + scrollY + 6 });
    dispatchEvent(new CustomEvent(OPEN, { detail: me.current }));
  };
  useEffect(() => {
    if (!at) return;
    const other = (e: Event) => { if ((e as CustomEvent).detail !== me.current) close(); };
    const out = (e: PointerEvent) => { const t = e.target as Node; if (!card.current?.contains(t) && !btn.current?.contains(t)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { close(); btn.current?.focus(); } };
    addEventListener(OPEN, other); addEventListener("pointerdown", out, true); addEventListener("keydown", key);
    return () => { removeEventListener(OPEN, other); removeEventListener("pointerdown", out, true); removeEventListener("keydown", key); };
  }, [at]);
  return (
    <>
      <button ref={btn} type="button" className="gl-word" aria-expanded={!!at} aria-haspopup="dialog" onClick={e => { e.stopPropagation(); if (at) close(); else open(); }}>{word}</button>
      {at && createPortal(
        <div ref={card} className="gl gl-pop" role="dialog" aria-label={term.name} style={{ left: at.x, top: at.y }}>
          <p className="gl-pop-name"><span className="gl-patch" style={{ ["--gp" as string]: `url(/glossary/patch_${colorOf(term)}.webp)` } as CSSProperties}>{term.name}</span></p>
          <div className="gl-pop-body">
            <span className="gl-patch gl-sympatch" style={{ width: 48, height: 48 }}><GlossSymbol term={term} size={48} /></span>
            <p>{shortLine(term)}</p>
          </div>
          <div className="gl-pop-foot">
            {term.en.us && <span className="gl-pop-ab" lang="en">US {term.en.us}</span>}
            {term.en.uk && <span className="gl-pop-ab" lang="en">UK {term.en.uk}</span>}
            <Link className="gl-pop-go" href={`/glossary/${term.id}`} onClick={close}>그림으로 보기 →</Link>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** a line of a pattern, with the glossary's words made into buttons */
export function GlossText({ text }: { text: string }) {
  const parts = text.split(termRegex);
  if (parts.length === 1) return <>{text}</>;
  return <>{parts.map((p, i) => {
    const t = i % 2 ? termForWord(p) : null;
    return t ? <Word key={i} word={p} term={t} /> : <Fragment key={i}>{p}</Fragment>;
  })}</>;
}
