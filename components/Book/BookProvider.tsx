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
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  /** leave 도안 만들기 for another address (the phone's buttons on the desk); a pattern half made asks first,
   *  as closing does */
  leaveTo: (path: string) => void;
  /** phones: to / with the book closed on the desk (the top bar's logo; Kim) */
  toDesk: () => void;
  /** wide screens: the book rises from the bottom straight onto 도안 만들기 step 1 (the home's 새 도안 만들기) */
  newPattern: () => void;
  /** wide screens: put the book away without asking (a pattern just finished): it sinks to where it rose */
  sinkAway: () => void;
  /** wide screens: 도안 만들기 rose over the opening (/), which stays under the book, faded back */
  fromOpening: boolean;
}

const Ctx = createContext<BookCtx | null>(null);

function hasWebGL() {
  // the test context is handed back at once: phones allow few live contexts and little GPU memory
  try { const c = document.createElement("canvas"), g = c.getContext("webgl2") || c.getContext("webgl"); g?.getExtension("WEBGL_lose_context")?.loseContext(); return !!g; } catch { return false; }
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
  const menuNext = useRef(false), menuTo = useRef("/");
  const [sinking, setSinking] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);

  // address -> state, during render (not in an effect) so the book sees the new view and `instant`
  // in the same commit. Coming back to / from the wizard lands on the open menu; from anywhere else
  // (or on first load) the book is closed. Arriving from a page without the book snaps, no motion.
  if (seenPath !== path) {
    // phones (< 768px): 도안집, 도안 and 따라 뜨기 are pages of the open book too (components/mobile/bookPages.ts)
    const phone = isPhone();
    const bookPage = (p: string | null) => p === "/" || p === "/new" || (phone && !!bookPageOf(p));
    setSeenPath(path);
    // wide screens (Kim): / is the opening; the book with its menu spread floats over it (overlay), so the menu is
    // never the old desk. Phones keep their own menu on /.
    if (path === "/") setHomeOpen(phone && (seenPath === "/new" || !!bookPageOf(seenPath) || seenPath === "/mine" || seenPath === "/pattern" || seenPath === "/track") && !closing);
    if (closing) setClosing(false);
    // a book raised over a page (새 도안 / New Pattern, 고치기: origin) opens with its motion; only an address typed or a
    // reload of /new shows it open at once
    setInstant(!bookPage(seenPath) && !overlay && !(path === "/new" && origin));
    // wide screens: "← 메뉴" in a wizard raised over the opening turns back to the floating menu spread
    const toMenu = menuNext.current && path !== "/new"; menuNext.current = false;
    if (overlay !== toMenu) setOverlay(toMenu); // going anywhere (the wizard, 내 작품) ends the overlay
    if (origin && path !== "/new" && !toMenu) setOrigin(null); // back on a page (the origin or any other): forgotten
    if (sinking) setSinking(false); // the sunk book stays down until the screen it goes back to is there
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

  const view: BookView = path === "/" ? (homeOpen || overlay ? "home" : "closed") : path === "/new" ? "wizard" : overlay ? "home" : "hidden";
  const step: WizStep = urlStep ?? 1;

  // Wide screens (Kim): the book is called from two places only - the opening's Start and the nav's 새 도안 -
  // and both raise it from the bottom straight onto 도안 만들기 step 1 over the screen you were on (that screen is
  // remembered: closing or finishing sinks the book and brings you back). Phones keep their own ways below.
  const raise = useCallback(() => {
    setInstant(false);
    if (path === "/new") { const sp = new URLSearchParams(location.search); sp.delete("edit"); sp.set("step", "1"); router.push(`/new?${sp}`, { scroll: false }); return; }
    setOrigin(path + location.search); router.push("/new?step=1", { scroll: false });
  }, [path, router]);
  // wide screens, on the opening: the book rises from the bottom onto its first spread (the menu: 도안 만들기,
  // 이어서 뜨기 ...), floating over the opening, which draws back under it (Kim)
  const rise = useCallback(() => {
    if (path !== "/") { raise(); return; }
    setInstant(false); setOrigin("/"); setOverlay(true);
  }, [path, raise]);
  const open = useCallback(() => { if (!isPhone()) { rise(); return; } setInstant(false); setHomeOpen(true); }, [rise]);
  // close: the same everywhere in the book. In the wizard it goes home with the book closed
  const floating = overlay || (path === "/new" && !!origin);
  const finishClose = useCallback(() => {
    setInstant(false); setHomeOpen(false);
    if (overlay) { setOverlay(false); if (!isPhone()) setOrigin(null); return; } // opened over a page: just put the book away
    // the wizard entered from a page (새 도안 -> 도안 만들기, 도안 고치기) goes back to that page
    if (path === "/new" && origin) { const o = origin; if (isPhone()) setOrigin(null); router.push(o, { scroll: false }); return; } // wide screens: the path change forgets it, so the book stays floating (sunk) until that page is there
    if (path === "/new") { setClosing(true); router.push("/", { scroll: false }); }
    // phones: 도안집, 도안 and 따라 뜨기 are pages of the open book too; closing it goes to the desk, closed
    else if (isPhone() && bookPageOf(path)) { setClosing(true); router.push("/", { scroll: false }); }
  }, [path, router, overlay, origin]);
  // a floating book sinks back down first (0.7s, Hero .is-sinking), then it goes; otherwise it closes now
  const doClose = useCallback(() => {
    if (sinking) return;
    if (!floating) { finishClose(); return; }
    setSinking(true);
    // going back to another address: .is-sinking stays until that screen is there (the path change ends it);
    // ending it earlier showed the book once more, open, for a frame before it vanished
    const stays = overlay || isPhone(); // phones: as before
    setTimeout(() => { finishClose(); if (stays) setSinking(false); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
  }, [floating, sinking, finishClose, overlay]);
  const editHere = useCallback((id: string) => {
    setInstant(false); setOrigin(path + location.search); router.push(`/new?edit=${encodeURIComponent(id)}`, { scroll: false });
  }, [path, router]);
  const openHere = useCallback(() => {
    if (!isPhone()) { rise(); return; }
    if (path === "/" || path === "/new") { setInstant(false); setHomeOpen(true); if (path === "/new") router.push("/", { scroll: false }); return; }
    setInstant(false); setOrigin(path + location.search); setOverlay(true);
  }, [path, router, rise]);
  // wide screens: "← 메뉴" goes back to where the wizard was raised (the opening or a page) with the book open
  // on its menu spread over it (Kim); phones go to their home
  const doHome = useCallback(() => {
    setInstant(false);
    if (isPhone()) { router.push("/", { scroll: false }); return; }
    menuNext.current = true; router.push(menuTo.current, { scroll: false });
  }, [router]);

  // Leaving a new pattern half made (a name typed, or past step 1) asks first: keep it for
  // "이어서 만들기", or throw it away. The draft is saved on every change, so "저장" just leaves; "저장하지
  // 않고" resets it. Editing a saved work (?edit) never asks: nothing is overwritten until 도안 보기.
  const { draft, setDraft } = useApp();
  // where a leave that asks goes: close the book, home, or (phones) another address
  const [leaving, setLeaving] = useState<null | "close" | "home" | { path: string }>(null);
  const asks = useCallback(() => path === "/new" && !new URLSearchParams(location.search).has("edit") && (draft.name.trim() !== "" || (urlStep ?? 1) > 1),
    [path, draft.name, urlStep]);
  const close = useCallback(() => { if (asks()) setLeaving("close"); else doClose(); }, [asks, doClose]);
  const leave = (keep: boolean) => {
    if (!keep) { setDraft(freshDraft()); store.set(STEP_KEY, 1); }
    const to = leaving; setLeaving(null);
    if (to === "close") doClose(); else if (to && typeof to === "object") { setInstant(false); router.push(to.path, { scroll: false }); } else doHome();
  };
  // started from a screen outside the book (the phone's 새 도안 on 나의 도안집, 완성 도안, 따라 뜨기): closing the
  // book goes back there, not to the first screen (Kim). From the book's own menu (/) nothing is remembered.
  const startWizard = useCallback((step?: WizStep) => {
    setInstant(false);
    if (path !== "/" && path !== "/new") setOrigin(path + location.search);
    router.push(`/new?step=${step ?? savedStep()}`, { scroll: false });
  }, [router, path]);
  const goStep = useCallback((s: WizStep) => {
    const sp = new URLSearchParams(location.search); sp.set("step", String(s));
    router.push(`/new?${sp}`, { scroll: false });
  }, [router]);
  // wide screens: "← 메뉴" turns back to the menu spread when the wizard was raised from the opening; raised over
  // another page (새 도안), there is no menu there - the book is put away (it sinks to that page)
  // "← 메뉴": the book turns back to its menu spread, wherever the wizard was raised from (Kim: from 새 도안 too)
  const toHome = useCallback(() => {
    if (!isPhone()) { menuTo.current = origin ?? "/"; if (!origin) setOrigin("/"); }
    if (asks()) setLeaving("home"); else doHome();
  }, [asks, doHome, origin]);
  const toDesk = useCallback(() => { setClosing(true); router.push("/", { scroll: false }); }, [router]);
  const leaveTo = useCallback((to: string) => { if (asks()) setLeaving({ path: to }); else { setInstant(false); router.push(to, { scroll: false }); } }, [asks, router]);

  // Esc closes the book, from the menu or the wizard alike (one book; Kim's call), never while a Korean
  // syllable is being composed. An open hook list or the like handles its own Esc first (defaultPrevented).
  useEffect(() => {
    if (view !== "home" && view !== "wizard") return;
    // with the exit question open, Esc answers it with "계속 만들기"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.isComposing && !e.defaultPrevented) { if (leaving) setLeaving(null); else close(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, close, leaving]);

  // the book floats over the opening: its menu on /, or the wizard raised from there (origin: the path only)
  const fromOpening = (path === "/" && overlay) || (path === "/new" && origin?.split("?")[0] === "/");
  const value = useMemo<BookCtx>(() => ({ view, step, instant, mode, setMode, desk, open, close, startWizard, goStep, toHome, openHere, overlay, floating, sinking, editHere, leaveTo, toDesk, sinkAway: doClose, fromOpening, newPattern: raise }),
    [view, step, instant, mode, desk, open, close, startWizard, goStep, toHome, openHere, overlay, floating, sinking, editHere, leaveTo, toDesk, doClose, fromOpening, raise]);
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
