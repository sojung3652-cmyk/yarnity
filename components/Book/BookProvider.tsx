"use client";
// The one book: lives in the root layout, so moving between / and /new never re-creates it (one WebGL
// canvas for the whole app). Its state is derived from the address:
//   /            -> "closed" (first load, refresh, coming from a page without the book) or "home" (the
//                   open menu spread: opened here, or came back from the wizard)
//   /new?step=n  -> "wizard", step n (1..4). /new without a step resumes the saved step (iyarn.newstep).
//   other pages  -> "hidden" (the stage is invisible; the canvas stays mounted and idle), or "home" while
//                   the book is opened over the page ("새 도안" in the nav, openHere): closing it leaves you
//                   on that page, and the wizard entered from it goes back there when closed
// `instant` is true when the new state must appear without motion: first load, refresh, typed address,
// or arriving from a page that has no book.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { freshDraft } from "@/lib/items";
import { store } from "@/lib/store";
import { bookPageOf, isPhone } from "@/components/mobile/bookPages";

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
  /** open the menu book over the page you are on (closing it keeps you there) */
  openHere: () => void;
  /** the book is open over another page */
  overlay: boolean;
  /** the book floats over the page it was opened from (새 도안, 도안 고치기): no home backdrop, it rises
   *  from the bottom and sinks back when closed, and closing returns to that page */
  floating: boolean;
  /** the book is sinking back down (closing a floating book) */
  sinking: boolean;
  /** open a saved work in 도안 만들기 over the page you are on (closing it brings you back here) */
  editHere: (id: string) => void;
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
  // the book opened over another page ("새 도안"), and the page to come back to from the wizard
  const [overlay, setOverlay] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  // address -> state, during render (not in an effect) so the book sees the new view and `instant`
  // in the same commit. Coming back to / from the wizard lands on the open menu; from anywhere else
  // (or on first load) the book is closed. Arriving from a page without the book snaps, no motion.
  if (seenPath !== path) {
    // phones (< 768px): 도안집, 도안 and 따라 뜨기 are pages of the open book too (components/mobile/bookPages.ts)
    const phone = isPhone();
    const bookPage = (p: string | null) => p === "/" || p === "/new" || (phone && !!bookPageOf(p));
    setSeenPath(path);
    if (path === "/") setHomeOpen((seenPath === "/new" || (phone && !!bookPageOf(seenPath))) && !closing);
    if (closing) setClosing(false);
    setInstant(!bookPage(seenPath) && !overlay);
    if (overlay) setOverlay(false); // going anywhere (the wizard, 내 작품) ends the overlay
    if (origin && path !== "/new") setOrigin(null); // back on a page (the origin or any other): forgotten
  }
  // a step change on the same page (next / previous / Back / Forward) always turns the page, also after
  // the wizard was opened by a typed address or a refresh (which only skips the motion of that first view)
  const [seenStep, setSeenStep] = useState<WizStep | null>(null);
  if (urlStep !== seenStep) {
    if (seenStep !== null && urlStep !== null && seenPath === path) setInstant(false);
    setSeenStep(urlStep);
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
    sp.set("step", String(sp.get("edit") ? 3 : savedStep()));
    router.replace(`/new?${sp}`, { scroll: false });
  }, [path, urlStep, router]);

  const view: BookView = path === "/" ? (homeOpen ? "home" : "closed") : path === "/new" ? "wizard" : overlay ? "home" : "hidden";
  const step: WizStep = urlStep ?? 1;

  const open = useCallback(() => { setInstant(false); setHomeOpen(true); }, []);
  // close: the same everywhere in the book. In the wizard it goes home with the book closed
  const floating = overlay || (path === "/new" && !!origin);
  const [sinking, setSinking] = useState(false);
  const finishClose = useCallback(() => {
    setInstant(false); setHomeOpen(false);
    if (overlay) { setOverlay(false); return; } // opened over a page: just put the book away
    // the wizard entered from a page (새 도안 -> 도안 만들기, 도안 고치기) goes back to that page
    if (path === "/new" && origin) { const o = origin; setOrigin(null); router.push(o, { scroll: false }); return; }
    if (path === "/new") { setClosing(true); router.push("/", { scroll: false }); }
    // phones: 도안집, 도안 and 따라 뜨기 are pages of the open book too; closing it goes to the desk, closed
    else if (isPhone() && bookPageOf(path)) { setClosing(true); router.push("/", { scroll: false }); }
  }, [path, router, overlay, origin]);
  // a floating book sinks back down first (0.7s, Hero .is-sinking), then it goes; otherwise it closes now
  const doClose = useCallback(() => {
    if (sinking) return;
    if (!floating) { finishClose(); return; }
    setSinking(true);
    setTimeout(() => { finishClose(); setSinking(false); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
  }, [floating, sinking, finishClose]);
  const editHere = useCallback((id: string) => {
    setInstant(false); setOrigin(path + location.search); router.push(`/new?edit=${encodeURIComponent(id)}`, { scroll: false });
  }, [path, router]);
  const openHere = useCallback(() => {
    if (path === "/" || path === "/new") { setInstant(false); setHomeOpen(true); if (path === "/new") router.push("/", { scroll: false }); return; }
    setInstant(false); setOrigin(path + location.search); setOverlay(true);
  }, [path, router]);
  const doHome = useCallback(() => { setInstant(false); router.push("/", { scroll: false }); }, [router]);

  // Leaving a new pattern half made (a name typed, or past step 1) asks first: keep it for
  // "이어서 만들기", or throw it away. The draft is saved on every change, so "저장" just leaves; "저장하지
  // 않고" resets it. Editing a saved work (?edit) never asks: nothing is overwritten until 도안 보기.
  const { draft, setDraft } = useApp();
  const [leaving, setLeaving] = useState<null | "close" | "home">(null);
  const asks = useCallback(() => path === "/new" && !new URLSearchParams(location.search).has("edit") && (draft.name.trim() !== "" || (urlStep ?? 1) > 1),
    [path, draft.name, urlStep]);
  const close = useCallback(() => { if (asks()) setLeaving("close"); else doClose(); }, [asks, doClose]);
  const leave = (keep: boolean) => {
    if (!keep) { setDraft(freshDraft()); store.set(STEP_KEY, 1); }
    const to = leaving; setLeaving(null);
    if (to === "close") doClose(); else doHome();
  };
  const startWizard = useCallback((step?: WizStep) => { setInstant(false); router.push(`/new?step=${step ?? savedStep()}`, { scroll: false }); }, [router]);
  const goStep = useCallback((s: WizStep) => {
    const sp = new URLSearchParams(location.search); sp.set("step", String(s));
    router.push(`/new?${sp}`, { scroll: false });
  }, [router]);
  const toHome = useCallback(() => { if (asks()) setLeaving("home"); else doHome(); }, [asks, doHome]);

  // Esc closes the book, from the menu or the wizard alike (one book; Kim's call), never while a Korean
  // syllable is being composed. An open hook list or the like handles its own Esc first (defaultPrevented).
  useEffect(() => {
    if (view !== "home" && view !== "wizard") return;
    // with the exit question open, Esc answers it with "계속 만들기"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.isComposing && !e.defaultPrevented) { if (leaving) setLeaving(null); else close(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, close, leaving]);

  const value = useMemo<BookCtx>(() => ({ view, step, instant, mode, setMode, desk, open, close, startWizard, goStep, toHome, openHere, overlay, floating, sinking, editHere }),
    [view, step, instant, mode, desk, open, close, startWizard, goStep, toHome, openHere, overlay, floating, sinking, editHere]);
  return (
    <Ctx.Provider value={value}>
      <Suspense fallback={null}><StepSync onStep={setUrlStep} /></Suspense>
      {children}
      {leaving && (
        <div className="leave-bg" onClick={() => setLeaving(null)}>
          <div className="leave" role="alertdialog" aria-modal="true" aria-labelledby="leaveT" aria-describedby="leaveD" onClick={e => e.stopPropagation()}>
            <h2 id="leaveT">만들던 도안을 저장할까요?</h2>
            <p id="leaveD">저장해 두면 메뉴의 &lsquo;이어서 만들기&rsquo;로 지금 단계부터 다시 이어 갈 수 있어요.</p>
            <div className="leave-btns">
              <button type="button" className="btn btn-primary" autoFocus onClick={() => leave(true)}>저장하고 나가기</button>
              <button type="button" className="btn btn-line" onClick={() => leave(false)}>저장하지 않고 나가기</button>
            </div>
            <button type="button" className="leave-stay" onClick={() => setLeaving(null)}>계속 만들기</button>
          </div>
        </div>
      )}
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
