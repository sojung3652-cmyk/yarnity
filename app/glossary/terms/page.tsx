"use client";
// 뜨개 사전 · 용어집 (web): the glossary as it was, inside the dictionary's frame. Phones: their glossary.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GlossaryScreen } from "@/components/glossary/Glossary";
import { MyHead } from "@/components/my/MyLayout";
import { useMobile } from "@/components/mobile/useMobile";

export default function Page() {
  const m = useMobile(), router = useRouter();
  useEffect(() => { if (m) router.replace("/glossary"); }, [m, router]);
  return m === false ? <><MyHead title="용어집" /><GlossaryScreen inDict /></> : null;
}
