"use client";
// 나의 도안집. Phones: their own screen (components/mobile/MobileMine.tsx). Wide screens: the shelves live on My Page
// now (/my, Kim), so this address goes there.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMobile } from "@/components/mobile/useMobile";
import { MobileMine } from "@/components/mobile/MobileMine";

export default function MinePage() {
  const m = useMobile(), router = useRouter();
  useEffect(() => { if (m === false) router.replace("/my"); }, [m, router]); // My Page's 나의 도안집 (Kim)
  if (m) return <MobileMine />;
  return <main id="view-mine" />;
}
