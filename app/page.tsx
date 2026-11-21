"use client";
import { MobileHomeScreen } from "@/components/mobile/MobileHomeScreen";
import { useMobile } from "@/components/mobile/useMobile";
import { HomeWeb } from "@/components/home/HomeWeb";

// The hero (backdrop, logo, the 3D book) is in the root layout so the book survives / <-> /new;
// this page keeps the first screen free for it and adds what sits below. (The "뜨고 있는 작품 ·
// 이어서 뜨기" card that sat below it is gone, Kim's call: 내 작품 on the open book does that.)
export default function Home() {
  // phones: the app's own home, no book (the splash is in the root layout: Hero -> MobileSplash)
  const m = useMobile();
  if (m) return <MobileHomeScreen />;
  // wide screens: the web home (Kim's web-home pack); the opening plays over it on the first visit of a session
  if (m === false) return <HomeWeb />;
  return null;
}
