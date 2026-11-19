"use client";
// Phone-only parts of the root layout: the bottom bar and the one AI sheet (on desktop the sheet lives on
// the book's stage, Hero's AiHost; phones have no stage, and the bar's AI 상담 opens it from any screen).
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { AiPanel } from "@/components/newbook/AiPanel";
import { MobileNavBar } from "./MobileNavBar";
import { useMobile } from "./useMobile";
import "@/components/newbook/newbook.css";
import "./mobile.css";

export function MobileChrome() {
  const m = useMobile(), b = useBook(), { draft, setDraft } = useApp();
  if (!m) return null;
  return (
    <>
      <MobileNavBar />
      <AiPanel draft={draft} step={b.view === "wizard" ? b.step : 0} onApply={p => setDraft({ ...draft, ...p })} />
    </>
  );
}
