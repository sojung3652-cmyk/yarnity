"use client";
// "AI와 상의" on the whole window (⤢ 전체 화면 in the panel): the same conversations and chat as the panel
// (components/newbook/AiPanel.tsx), the list on the left and the chat in a 680px column.
import { AiPanel } from "@/components/newbook/AiPanel";
import { useApp } from "@/components/AppProvider";

export default function AiPage() {
  const { draft, setDraft } = useApp();
  return <AiPanel page draft={draft} step={0} onApply={p => setDraft({ ...draft, ...p })} />;
}
