"use client";
// 도안 만들기. Wide screens with WebGL: the wizard is drawn inside the one 3D book of the root layout
// (components/Book/BookProvider.tsx), so this page only keeps the first screen free for it.
// Phones and no-WebGL: the one-page book with sliding steps (components/newbook/NewBook.tsx).
// The AI chat (components/Chat.tsx + /api/chat) is not shown for now; its code is kept for later.
import { useBook, wizardInBook } from "@/components/Book/BookProvider";
import { NewBook } from "@/components/newbook/NewBook";
import { MobileWizard } from "@/components/mobile/MobileWizard";
import { useMobile } from "@/components/mobile/useMobile";

export default function NewPage() {
  const b = useBook(), m = useMobile();
  if (m) return <MobileWizard />; // phones: the spring notebook (components/mobile)
  if (b.mode === "pending") return <main id="view-new" className="nb-main" />;
  if (wizardInBook(b)) return <main id="view-new"><div className="book-stage-space" aria-hidden="true" /></main>;
  return <NewBook />;
}
