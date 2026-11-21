"use client";
// An old address: 나의 기록 became 갤러리 (Kim).
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();
  useEffect(() => { router.replace("/my/gallery"); }, [router]);
  return null;
}
