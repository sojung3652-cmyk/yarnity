"use client";
// The /ai page: phones only now (Kim: no full-screen chat on the web - AiPanel sends the web back to the small window).
import { AiPanel } from "@/components/newbook/AiPanel";
import { useApp } from "@/components/AppProvider";

export default function AiPage() {
  const { draft, setDraft } = useApp();
  return <AiPanel page draft={draft} step={0} onApply={p => setDraft({ ...draft, ...p })} />;
}
