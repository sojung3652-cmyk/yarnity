"use client";
// 나의 도안집 for phones (components/mobile/MobileLibrary.tsx). Wider screens keep 내 작품 (/mine) and are sent
// there, so the desktop is unchanged.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMobile } from "@/components/mobile/useMobile";

export default function LibraryPage() {
  const m = useMobile(), router = useRouter();
  useEffect(() => { if (m === false) router.replace("/mine"); }, [m, router]);
  if (!m) return <main id="view-library" />;
  // phones: the library is the open book's right page (components/mobile/MobileBookPages.tsx)
  return <main id="view-library" className="m-root m-in-book"><h1 className="sr">나의 도안집</h1></main>;
}
