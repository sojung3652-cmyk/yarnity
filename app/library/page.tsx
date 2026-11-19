"use client";
// 나의 도안집 for phones (components/mobile/MobileLibrary.tsx). Wider screens keep 내 작품 (/mine) and are sent
// there, so the desktop is unchanged.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MobileLibrary } from "@/components/mobile/MobileLibrary";
import { useMobile } from "@/components/mobile/useMobile";

export default function LibraryPage() {
  const m = useMobile(), router = useRouter();
  useEffect(() => { if (m === false) router.replace("/mine"); }, [m, router]);
  if (!m) return <main id="view-library" />;
  return <MobileLibrary />;
}
