"use client";
// 뜨개 사전 (web, Kim): My Page's frame around every screen (components/dictionary). Phones keep their glossary as it
// was (no frame).
import type { ReactNode } from "react";
import { DictLayout } from "@/components/dictionary/Dictionary";
import { useMobile } from "@/components/mobile/useMobile";

export default function DictionaryLayout({ children }: { children: ReactNode }) {
  const m = useMobile();
  return m === false ? <DictLayout>{children}</DictLayout> : <>{children}</>;
}
