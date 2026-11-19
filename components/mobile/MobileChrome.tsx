"use client";
// Phone-only parts of the root layout: the bottom bar, the one AI sheet (on desktop it lives on the book's
// stage, Hero's AiHost; phones have no stage), and the menu book the bar's + raises over the screen you are
// on - as the web's 새 도안 does: it rises from the bottom over a dimmed page, and its gold X sinks it back
// (0.7s each; instant with reduced motion). Going anywhere from it (도안 만들기, 나의 도안집) puts it away.
// On the home screen + just opens the book there.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useBook } from "@/components/Book/BookProvider";
import { AiPanel } from "@/components/newbook/AiPanel";
import { FirstPage } from "./MobileHome";
import { MobileNavBar } from "./MobileNavBar";
import { useMobile } from "./useMobile";
import "@/components/newbook/newbook.css";
import "./mobile.css";

export function MobileChrome() {
  const m = useMobile(), b = useBook(), { draft, setDraft } = useApp(), path = usePathname();
  const [up, setUp] = useState<null | "up" | "sinking">(null);
  useEffect(() => { setUp(null); }, [path]);
  if (!m) return null;
  const raise = () => {
    if (path === "/") { dispatchEvent(new Event("m:open-book")); return; }
    if (!up) setUp("up");
  };
  const sink = () => {
    if (up !== "up") return;
    setUp("sinking");
    setTimeout(() => setUp(null), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
  };
  return (
    <>
      {up && (
        <div className={"m-float" + (up === "sinking" ? " is-sinking" : "")} onClick={e => { if (e.target === e.currentTarget) sink(); }}>
          <FirstPage overlay onClose={sink} />
        </div>
      )}
      <MobileNavBar onNew={raise} bookUp={!!up} />
      <AiPanel draft={draft} step={b.view === "wizard" ? b.step : 0} onApply={p => setDraft({ ...draft, ...p })} />
    </>
  );
}
