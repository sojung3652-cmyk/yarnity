"use client";
// Phones: 도안 and 따라 뜨기 as the right page of the open 3D book (Book3D renders this into the
// page box), laid out at screen pixels (zoom = --k, mobile.css .mbw). Both keep their head and their
// buttons in place and scroll only the rows / the row (book-pages.css).
// The gold × at the top right closes the book, as on its first page.
import { useBook } from "@/components/Book/BookProvider";
import { useLayoutEffect, useRef } from "react";
import { GoldX } from "@/components/GoldX";
import { TrackScreen } from "@/app/track/page";
import { MobilePatternPage } from "./MobilePatternPage";

export function MobileBookPages({ page }: { page: string }) {
  const book = useBook(), ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { const box = ref.current?.parentElement; if (box?.style.height) ref.current!.style.setProperty("--page-h", box.style.height); });
  return (
    <div ref={ref} className={"mbw mbp mbp-" + page.slice(1)}>
      {/* the book's close, as on its first page: the book closes and lies on the desk again */}
      <button type="button" className="mbook-x" aria-label="책 덮기" onClick={book.close}><GoldX /></button>
      {page === "/pattern" ? <MobilePatternPage /> : <TrackScreen />}
    </div>
  );
}
