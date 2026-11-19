"use client";
import { useMobile } from "@/components/mobile/useMobile";

// The hero (backdrop, logo, the 3D book) is in the root layout so the book survives / <-> /new;
// this page keeps the first screen free for it and adds what sits below. (The "뜨고 있는 작품 ·
// 이어서 뜨기" card that sat below it is gone, Kim's call: 내 작품 on the open book does that.)
export default function Home() {
  // phones: the splash, the desk and the 3D book are the stage itself (Hero -> MobileStage)
  const m = useMobile();
  if (m) return <main id="view-m-home" className="m-root"><h1 className="sr">Yarnity</h1></main>;
  return (
    <main id="view-home">
      <div className="book-stage-space" aria-hidden="true" />
      <div className="hero-foot"><span className="tagline">YARNITY · MAKE · TRACK · SHARE</span></div>
    </main>
  );
}
