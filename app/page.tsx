"use client";
import { MobileHome } from "@/components/mobile/MobileHome";
import { useMobile } from "@/components/mobile/useMobile";

// The hero (backdrop, logo, the 3D book) is in the root layout so the book survives / <-> /new;
// this page keeps the first screen free for it and adds what sits below. (The "뜨고 있는 작품 ·
// 이어서 뜨기" card that sat below it is gone, Kim's call: 내 작품 on the open book does that.)
export default function Home() {
  // phones: the notebook's cover and first page (components/mobile), no 3D book
  const m = useMobile();
  if (m) return <MobileHome />;
  return (
    <main id="view-home">
      <div className="book-stage-space" aria-hidden="true" />
      <div className="hero-foot"><span className="tagline">YARNITY · MAKE · TRACK · SHARE</span></div>
    </main>
  );
}
