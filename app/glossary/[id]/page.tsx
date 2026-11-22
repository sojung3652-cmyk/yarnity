"use client";
// 뜨개 용어집, one term. Phones: its own page. Wide screens: the old address goes to the 뜨개 사전's 용어집
// (/glossary/terms/[id]).
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { GlossaryScreen } from "@/components/glossary/Glossary";
import { useMobile } from "@/components/mobile/useMobile";

export default function GlossaryTermPage() {
  const { id } = useParams<{ id: string }>(), m = useMobile(), router = useRouter();
  useEffect(() => { if (m === false) router.replace(`/glossary/terms/${id}`); }, [m, id, router]);
  return m ? <GlossaryScreen id={id} /> : null;
}
