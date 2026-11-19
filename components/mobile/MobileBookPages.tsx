"use client";
// Phones: 나의 도안집, 도안 and 따라 뜨기 as the right page of the open 3D book (Book3D renders this into the
// page box), laid out at screen pixels (zoom = --k, mobile.css .mbw). 도안집 scrolls as a whole; 도안 and
// 따라 뜨기 keep their head and their buttons in place and scroll only the rows / the row (book-pages.css).
// The gold × at the top right goes back to the menu page.
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { GoldX } from "@/components/GoldX";
import { TrackScreen } from "@/app/track/page";
import { MobileLibrary } from "./MobileLibrary";
import { MobilePatternPage } from "./MobilePatternPage";

export function MobileBookPages({ page }: { page: string }) {
  const router = useRouter(), ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { const box = ref.current?.parentElement; if (box?.style.height) ref.current!.style.setProperty("--page-h", box.style.height); });
  return (
    <div ref={ref} className={"mbw mbp mbp-" + page.slice(1)}>
      <button type="button" className="mbp-close" aria-label="메뉴로" onClick={() => router.push("/")}><GoldX /></button>
      {page === "/library" ? <div className="mbw-scroll"><MobileLibrary /></div> : page === "/pattern" ? <MobilePatternPage /> : <TrackScreen />}
    </div>
  );
}
