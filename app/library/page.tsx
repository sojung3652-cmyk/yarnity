"use client";
// An old address: 나의 도안집 is /mine on every screen (phones: components/mobile/MobileMine.tsx), so this
// sends there.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMobile } from "@/components/mobile/useMobile";

export default function LibraryPage() {
  const m = useMobile(), router = useRouter();
  // 나의 도안집 lives at /mine on every screen (phones: components/mobile/MobileMine.tsx)
  useEffect(() => { if (m !== null) router.replace(m ? "/mine" : "/my/patterns"); }, [m, router]); // wide screens: My Page's 나의 도안집 (Kim)
  return <main id="view-library" />;
}
