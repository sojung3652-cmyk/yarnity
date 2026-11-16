// Page turn between the steps of 도안 만들기 (desktop open book), CSS 3D + Web Animations, no library.
// Before the step changes, the current pages are cloned (inputs keep their typed values). After React has
// rendered the new step underneath, one leaf turns on the gutter:
//   forward  leaf front = old right page, back = new left page;  origin left,  0 -> -180deg
//   backward leaf front = old left page,  back = new right page; origin right, 0 -> 180deg
// The page the leaf lands on keeps showing its old clone until covered. Only transform and opacity are
// animated. finish() jumps to the end; the cleanup always removes every temporary element and inert, so
// nothing stays rotated or mirrored afterwards. The real pages own all input state; clones are inert.
export interface Snapshot { dir: 1 | -1; oldLeft: HTMLElement; oldRight: HTMLElement; L: Box; R: Box }
export interface Turn { finish(): void }
type Box = { x: number; y: number; w: number; h: number };

export const TURN_MS = 700;
const EASE = "cubic-bezier(.45,.05,.25,1)";
const INK = "60,40,30";

/** The leaf only on the desktop book, and not with reduced motion (phones slide, reduced motion fades). */
export const canTurn = () => typeof window !== "undefined" && matchMedia("(min-width: 900px)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;

const box = (el: HTMLElement): Box => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
const pages = (book: HTMLElement) => [book.querySelector(".nb-left") as HTMLElement, book.querySelector(".nb-right") as HTMLElement] as const;

/** An inert copy of a page as it looks now (typed values included, no ids). */
function clonePage(sec: HTMLElement): HTMLElement {
  const c = sec.cloneNode(true) as HTMLElement;
  const src = sec.querySelectorAll<HTMLInputElement>("input,textarea"), dst = c.querySelectorAll<HTMLInputElement>("input,textarea");
  src.forEach((s, i) => { dst[i].setAttribute("value", s.value); dst[i].value = s.value; });
  [c, ...c.querySelectorAll("[id]")].forEach(e => e.removeAttribute("id"));
  c.querySelectorAll(".nb-dir-fwd,.nb-dir-back").forEach(e => e.classList.remove("nb-dir-fwd", "nb-dir-back"));
  return c;
}

export function snapshot(book: HTMLElement, dir: 1 | -1): Snapshot {
  const [l, r] = pages(book);
  return { dir, oldLeft: clonePage(l), oldRight: clonePage(r), L: box(l), R: box(r) };
}

function div(cls: string, b?: Box, style: Partial<CSSStyleDeclaration> = {}) {
  const d = document.createElement("div"); d.className = cls;
  if (b) Object.assign(d.style, { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" });
  Object.assign(d.style, style); return d;
}
/** Shade across a page, darkest at its gutter side (left for a right page, right for a left page). */
const gutterShade = (page: HTMLElement, a: number) => `linear-gradient(to ${page.classList.contains("nb-left") ? "left" : "right"}, rgba(${INK},${a}), rgba(${INK},${a * 0.25}) 55%, rgba(255,255,255,${a * 0.2}))`;

export function startTurn(book: HTMLElement, s: Snapshot, onDone: () => void): Turn {
  const fwd = s.dir > 0, [newL, newR] = pages(book);
  const turnBox = fwd ? s.R : s.L, stayBox = fwd ? s.L : s.R;
  const live = [...book.querySelectorAll<HTMLElement>(".nb-page .nb-turn")];
  live.forEach(e => (e.inert = true)); // the inputs under the turn can't be used until it lands

  const layer = div("nb-turn-layer"); layer.setAttribute("aria-hidden", "true"); layer.inert = true;
  // the page the leaf lands on: its old look until covered, and a shadow growing as the leaf comes down
  const stay = div("nb-turn-stay", stayBox); stay.append(fwd ? s.oldLeft : s.oldRight);
  const land = div("nb-turn-shade", stayBox, { background: gutterShade(fwd ? s.oldLeft : s.oldRight, 0.3), opacity: "0" });
  // the page being revealed: a soft shadow band travelling with the leaf's edge towards the gutter
  const cast = div("nb-turn-cast", turnBox), band = div("nb-turn-band", undefined, { width: turnBox.w * 0.42 + "px", opacity: "0" });
  cast.append(band);
  // the leaf: two faces, the back one pre-turned so its text reads the right way round once it lands
  const leaf = div("nb-leaf", turnBox, { transformOrigin: fwd ? "left center" : "right center" });
  const backPage = clonePage(fwd ? newL : newR), frontPage = fwd ? s.oldRight : s.oldLeft;
  const front = div("nb-leaf-face", { x: 0, y: 0, w: turnBox.w, h: turnBox.h }), back = div("nb-leaf-face nb-leaf-back", { x: 0, y: 0, w: turnBox.w, h: (fwd ? newL : newR).offsetHeight });
  const fShade = div("nb-leaf-shade", undefined, { background: gutterShade(frontPage, 0.42) }), bShade = div("nb-leaf-shade", undefined, { background: gutterShade(backPage, 0.42) });
  front.append(frontPage, fShade); back.append(backPage, bShade); leaf.append(front, back);
  layer.append(stay, land, cast, leaf);
  book.append(layer);

  const end = fwd ? -180 : 180, k = fwd ? -1 : 1;
  const opts: KeyframeAnimationOptions = { duration: TURN_MS, easing: EASE, fill: "forwards" };
  const anims = [
    // a little lift in the middle (translateZ + a 1.5deg skew), same function list in every frame
    leaf.animate([
      { transform: "translateZ(0px) rotateY(0deg) skewY(0deg)" },
      { transform: `translateZ(22px) rotateY(${end / 2}deg) skewY(${k * 1.5}deg)`, offset: 0.5 },
      { transform: `translateZ(0px) rotateY(${end}deg) skewY(0deg)` },
    ], opts),
    // the curl: darkest near 90deg
    fShade.animate([{ opacity: 0 }, { opacity: 1, offset: 0.48 }, { opacity: 0.6 }], opts),
    bShade.animate([{ opacity: 0.6 }, { opacity: 1, offset: 0.52 }, { opacity: 0 }], opts),
    band.animate([
      { transform: `translateX(${fwd ? turnBox.w : -turnBox.w * 0.42}px)`, opacity: 0 },
      { opacity: 0.75, offset: 0.4 },
      { transform: `translateX(${fwd ? -turnBox.w * 0.42 : turnBox.w}px)`, opacity: 0 },
    ], opts),
    land.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 0.85, offset: 0.82 }, { opacity: 0 }], opts),
  ];

  let done = false;
  const cleanup = () => {
    if (done) return; done = true;
    anims.forEach(a => a.cancel()); layer.remove();
    book.querySelectorAll<HTMLElement>(".nb-page .nb-turn").forEach(e => (e.inert = false));
    onDone();
  };
  anims[0].onfinish = cleanup;
  return { finish: cleanup };
}
