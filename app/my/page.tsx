"use client";
// My Page · 나의 도안집 (web; components/my/MyPatterns.tsx): the first screen (Kim: no separate 진행 중). Phones: the
// app's own shelf (MobileMine) inside the app's 마이페이지 frame (MyLayout).
import { MyPatterns } from "@/components/my/MyPatterns";
import { MobileMine } from "@/components/mobile/MobileMine";
import { useMobile } from "@/components/mobile/useMobile";

export default function Page() {
  const m = useMobile();
  return m ? <MobileMine embedded /> : <MyPatterns />;
}
