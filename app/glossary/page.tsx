"use client";
// 뜨개 사전's first screen. Wide screens: 뜨개 상식 (components/dictionary). Phones: the glossary list as before.
import { GlossaryScreen } from "@/components/glossary/Glossary";
import { KnowhowScreen } from "@/components/dictionary/Dictionary";
import { useMobile } from "@/components/mobile/useMobile";

export default function GlossaryPage() {
  const m = useMobile();
  if (m === null) return null;
  return m ? <GlossaryScreen /> : <KnowhowScreen />;
}
