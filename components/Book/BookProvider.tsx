"use client";
// The one book: lives in the root layout, so moving between / and /new never re-creates it (one WebGL
// canvas for the whole app). Its state is derived from the address:
//   /            -> "closed" (first load, refresh, coming from a page without the book) or "home" (the
//                   open menu spread: opened here, or came back from the wizard)
//   /new?step=n  -> "wizard", step n (1..4). /new without a step resumes the saved step (iyarn.newstep).
//   other pages  -> "hidden" (the stage is invisible; the canvas stays mounted and idle)
// `instant` is true when the new state must appear without motion: first load, refresh, typed address,
// or arriving from a page that has no book.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { store } from "@/lib/store";

export type BookView = "closed" | "home" | "wizard" | "hidden";
export type BookMode = "pending" | "3d" | "css";
export type WizStep = 1 | 2 | 3 | 4;
const STEP_KEY = "iyarn.newstep"; // same key NewBook already writes

interface BookCtx {
  view: BookView;
  step: WizStep;
  instant: boolean;
  /** 3D or CSS book (decided once in the browser) */
  mode: BookMode;
  setMode: (m: BookMode) => void;
  /** wide screen (>= 900px): the wizard lives in the 3D book; narrower screens keep the one-page /new */
  desk: boolean;
  open: () => void;
  close: () => void;
  /** menu -> wizard, at `step` (default: the saved step) */
  startWizard: (step?: WizStep) => void;
  goStep: (s: WizStep) => void;
  /** wizard -> menu spread */
  toHome: () => void;
}

const Ctx = createContext<BookCtx | null>(null);

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}
const savedStep = (): WizStep => { const s = store.get<number>(STEP_KEY, 1); return (s >= 1 && s <= 4 ? s : 1) as WizStep; };
const parseStep = (v: string | null): WizStep | null => { const n = Number(v); return n >= 1 && n <= 4 && Number.isInteger(n) ? (n as WizStep) : null; };

/** Reads ?step (useSearchParams needs a Suspense boundary of its own) and reports it upwards. */
function StepSync({ onStep }: { onStep: (s: WizStep | null) => void }) {
  const sp = useSearchParams(), raw = sp.get("step");
  useEffect(() => { onStep(parseStep(raw)); }, [raw, onStep]);
  return null;
}

export function BookProvider({ children }: { children: ReactNode }) {
  const path = usePathname(), router = useRouter();
  const [urlStep, setUrlStep] = useState<WizStep | null>(null);
  const [homeOpen, setHomeOpen] = useState(false);
  const [mode, setMode] = useState<BookMode>("pending");
  const [desk, setDesk] = useState(true);
  const [instant, setInstant] = useState(true);
  const [seenPath, setSeenPath] = useState<string | null>(null);
  // a close asked for in the wizard (a click outside the book): / is then reached with the book closed
  const [closing, setClosing] = useState(false);

  // address -> state, during render (not in an effect) so the book sees the new view and `instant`
  // in the same commit. Coming back to / from the wizard lands on the open menu; from anywhere else
  // (or on first load) the book is closed. Arriving from a page without the book snaps, no motion.
  if (seenPath !== path) {
    const bookPage = (p: string | null) => p === "/" || p === "/new";
    setSeenPath(path);
    if (path === "/") setHomeOpen(seenPath === "/new" && !closing);
    if (closing) setClosing(false);
    setInstant(!bookPage(seenPath));
  }

  useEffect(() => {
    const forced = new URLSearchParams(location.search).get("book"); // ?book=css to compare
    setMode(forced === "css" || !hasWebGL() ? "css" : "3d");
    const mq = matchMedia("(min-width: 900px)"), on = () => setDesk(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // /new with no (or a bad) step: resume the saved step, replacing the entry so Back still works
  useEffect(() => {
    if (path !== "/new" || urlStep) return;
    const sp = new URLSearchParams(location.search);
    if (parseStep(sp.get("step"))) return; // StepSync has not reported yet
    sp.set("step", String(sp.get("edit") ? 4 : savedStep()));
    router.replace(`/new?${sp}`, { scroll: false });
  }, [path, urlStep, router]);

  const view: BookView = path === "/" ? (homeOpen ? "home" : "closed") : path === "/new" ? "wizard" : "hidden";
  const step: WizStep = urlStep ?? 1;

  const open = useCallback(() => { setInstant(false); setHomeOpen(true); }, []);
  // close: the same everywhere in the book. In the wizard it goes home with the book closed (the draft is
  // already saved on every change, so nothing is lost)
  const close = useCallback(() => {
    setInstant(false); setHomeOpen(false);
    if (path === "/new") { setClosing(true); router.push("/", { scroll: false }); }
  }, [path, router]);
  const startWizard = useCallback((step?: WizStep) => { setInstant(false); router.push(`/new?step=${step ?? savedStep()}`, { scroll: false }); }, [router]);
  const goStep = useCallback((s: WizStep) => {
    const sp = new URLSearchParams(location.search); sp.set("step", String(s));
    router.push(`/new?${sp}`, { scroll: false });
  }, [router]);
  const toHome = useCallback(() => { setInstant(false); router.push("/", { scroll: false }); }, [router]);

  // Esc: wizard -> menu, menu -> closed (never while a Korean syllable is being composed)
  useEffect(() => {
    if (view !== "home" && view !== "wizard") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing) return;
      if (view === "wizard") { if (mode === "3d" && desk) toHome(); } else close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, mode, desk, toHome, close]);

  const value = useMemo<BookCtx>(() => ({ view, step, instant, mode, setMode, desk, open, close, startWizard, goStep, toHome }),
    [view, step, instant, mode, desk, open, close, startWizard, goStep, toHome]);
  return (
    <Ctx.Provider value={value}>
      <Suspense fallback={null}><StepSync onStep={setUrlStep} /></Suspense>
      {children}
    </Ctx.Provider>
  );
}

export function useBook() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBook must be used inside <BookProvider>");
  return c;
}

/** The wizard is drawn inside the 3D book (wide screens with WebGL); otherwise /new keeps its own page. */
export const wizardInBook = (b: Pick<BookCtx, "mode" | "desk">) => b.mode === "3d" && b.desk;
