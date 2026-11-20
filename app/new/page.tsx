"use client";
// 도안 만들기. Wide screens with WebGL: the wizard is drawn inside the one 3D book of the root layout
// (components/Book/BookProvider.tsx), so this page only keeps the first screen free for it.
// Phones: plain app screens, no book (components/mobile/MobileFlowWizard.tsx).
// No WebGL: the one-page book with sliding steps (components/newbook/NewBook.tsx).
import { useBook, wizardInBook } from "@/components/Book/BookProvider";
import { NewBook } from "@/components/newbook/NewBook";
import { MobileFlowWizard } from "@/components/mobile/MobileFlowWizard";
import { useMobile } from "@/components/mobile/useMobile";

export default function NewPage() {
  const b = useBook(), m = useMobile();
  if (m) return <MobileFlowWizard />;
  if (b.mode === "pending") return <main id="view-new" className="nb-main" />;
  if (wizardInBook(b)) return <main id="view-new"><div className="book-stage-space" aria-hidden="true" /></main>;
  return <NewBook />;
}
