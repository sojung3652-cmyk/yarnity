"use client";
// 뜨개 사전 (web): components/dictionary/Dictionary.tsx TablesScreen. Phones have no such screen: their glossary.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TablesScreen } from "@/components/dictionary/Dictionary";
import { useMobile } from "@/components/mobile/useMobile";

export default function Page() {
  const m = useMobile(), router = useRouter();
  useEffect(() => { if (m) router.replace("/glossary"); }, [m, router]);
  return m === false ? <TablesScreen /> : null;
}
