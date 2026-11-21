"use client";
// An old address: 나의 도안집 is /my itself now (Kim).
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();
  useEffect(() => { router.replace("/my"); }, [router]);
  return null;
}
