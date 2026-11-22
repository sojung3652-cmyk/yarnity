"use client";
// 나의 도안집. Phones: their own screen (components/mobile/MobileMine.tsx). Wide screens: the shelves live on My Page
// now (/my, Kim), so this address goes there.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMobile } from "@/components/mobile/useMobile";

export default function MinePage() {
  const m = useMobile(), router = useRouter();
  // 나의 도안집 is My Page's first screen on both (Kim: the app's 마이페이지 too)
  useEffect(() => { if (m !== null && m !== undefined) router.replace("/my"); }, [m, router]);
  return <main id="view-mine" />;
}
