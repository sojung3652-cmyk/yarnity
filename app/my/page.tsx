"use client";
// My Page (wide screens; components/my/MyPage.tsx). Phones keep their 나의 도안집 (/mine).
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMobile } from "@/components/mobile/useMobile";
import { MyPage } from "@/components/my/MyPage";

export default function MyRoute() {
  const m = useMobile(), router = useRouter();
  useEffect(() => { if (m) router.replace("/mine"); }, [m, router]);
  if (m !== false) return <main id="view-my" />;
  return <MyPage />;
}
