"use client";
// 뜨개 사전 · 용어집, one term in the panel (web). Phones: that term's own page.
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { GlossaryScreen } from "@/components/glossary/Glossary";
import { MyHead } from "@/components/my/MyLayout";
import { useMobile } from "@/components/mobile/useMobile";

export default function Page() {
  const { id } = useParams<{ id: string }>(), m = useMobile(), router = useRouter();
  useEffect(() => { if (m) router.replace(`/glossary/${id}`); }, [m, id, router]);
  return m === false ? <><MyHead title="용어집" /><GlossaryScreen id={id} inDict /></> : null;
}
