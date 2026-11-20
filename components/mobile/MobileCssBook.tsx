"use client";
// The phone's book, in CSS 3D (no three.js on phones: a Pixel 10 Pro's GPU lost the WebGL context on load, and
// Chrome then blocks WebGL for the site). Built from Kim's demo, public/mobile-css3d-book/index.html: the same
// layers, classes, numbers and timings. Desktop keeps the three.js book (components/Book/three/Book3D.tsx,
// a dynamic import that phones never render, so three.js is not loaded on them).
//   .mcb-book > .mcb-persp (perspective 1600px, origin 60% 135%) > .mcb-tilt (preserve-3d):
//     shadow (-0.5px, falls to the lower left: light from the upper right) · linen board · thickness (rotateX 90°,
//     from the bottom edge) · right page (+23px; the real page: the menu or 도안 만들기) · the turning sheet ·
//     the cover (from the left edge; front = the bird picture, back = linen + endpaper)
//   states: closed (small, on the desk) -> zoomed (1.2s) -> open (tilt 26° -> 5°, the cover turns -180°, 1.5s)
//   page turns (1.15s): forward, the page as it was is copied onto the sheet's front and the sheet turns left;
//   back, the sheet comes back from the left carrying the new page, over a copy of the old one.
// One tap on the closed book brings it closer and opens it (the zoom, then the cover).
// Sizes: the open right page keeps the place the 3D book had (36px of the left page showing, 14px right, 40px
// top, 90px for the desk buttons); the closed book is 62% of the width at 46% of the height. Recomputed on a
// width change at once, on a height change after 250ms (the address bar), never while the keyboard is up.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { AiTab } from "@/components/AiTab";
import { useBook } from "@/components/Book/BookProvider";
import { RightPage } from "@/components/Book/PageSpread";
import { MobileBookWizard } from "./MobileBookWizard";
import { useSheet } from "./sheetStore";
import "./mobile-css-book.css";

const P = { leftShow: 36, rightGap: 14, topGap: 40, bottomKeep: 90 }; // the open right page's margins
const INSET = { l: 3, t: 3, r: 4, b: 3 }; // the right page inside the board (demo .rpage)
const ASPECT = 300 / 505; // the closed book (demo .book)
const TURN_MS = 1150, ZOOM_MS = 1200, OPEN_MS = 1600;

interface Geo { vw: number; vh: number }
function layout({ vw, vh }: Geo) {
  const pw = vw - P.leftShow - P.rightGap, ph = vh - P.topGap - P.bottomKeep;
  const bw = pw + INSET.l + INSET.r, bhOpen = ph + INSET.t + INSET.b, bh0 = Math.min(bhOpen, bw / ASPECT);
  const left = P.leftShow - INSET.l, top = P.topGap - INSET.t;
  // closed: 62% of the width, centred at 46% of the height; zoomed: 80% (and at most 74% of the height), at 50%
  const s0 = (vw * 0.62) / bw, s1 = Math.min((vw * 0.8) / bw, (vh * 0.74) / bh0);
  // open: the 5° tilt and the perspective move the right page a little; project its corners as the browser
  // does and fit the book's open transform so the page lands exactly on its place (36 / 40 / 14 / 90)
  const D = 1600, th = (5 * Math.PI) / 180, cx = bw / 2, cy = bhOpen / 2, ox = 0.6 * bw, oy = 1.35 * bhOpen;
  const proj = (x: number, y: number, z: number) => {
    const Y = y - cy, y2 = Y * Math.cos(th) - z * Math.sin(th), z2 = Y * Math.sin(th) + z * Math.cos(th), s = D / (D - z2);
    return [ox + (x - ox) * s, oy + (cy + y2 - oy) * s];
  };
  const cs = [proj(INSET.l, INSET.t, 23), proj(bw - INSET.r, INSET.t, 23), proj(INSET.l, bhOpen - INSET.b, 23), proj(bw - INSET.r, bhOpen - INSET.b, 23)];
  const x0 = Math.min(...cs.map(c => c[0])), x1 = Math.max(...cs.map(c => c[0])), y0 = Math.min(...cs.map(c => c[1])), y1 = Math.max(...cs.map(c => c[1]));
  const sx = pw / (x1 - x0), sy = ph / (y1 - y0);
  const openTf = `translate(${(P.leftShow - left - sx * x0).toFixed(2)}px,${(P.topGap - top - sy * y0).toFixed(2)}px) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
  const at = (s: number, cy: number) => `translate(${(vw / 2 - (s * bw) / 2 - left).toFixed(1)}px,${(cy - (s * bh0) / 2 - top).toFixed(1)}px) scale(${s.toFixed(4)})`;
  return {
    "--mcb-l": left + "px", "--mcb-t": top + "px", "--mcb-w": bw + "px", "--mcb-h0": bh0 + "px", "--mcb-h": bhOpen + "px",
    "--mcb-pw": pw + "px", "--mcb-ph": ph + "px",
    "--mcb-closed": at(s0, vh * 0.46), "--mcb-zoomed": at(s1, vh * 0.5), "--mcb-open": openTf,
    // the "tap the book" hint, just under the closed book and its page edges (its height foreshortened by the 26° tilt)
    "--mcb-tapy": Math.round(vh * 0.46 + (s0 * bh0 * Math.cos((26 * Math.PI) / 180)) / 2 + 26) + "px",
    "--mcb-dz": (s1 / s0).toFixed(3), "--mcb-do": ((s1 / s0) * 1.09).toFixed(3), // the desk photo zooms with the book
  } as CSSProperties;
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const typing = () => { const a = document.activeElement; return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || (a as HTMLElement).isContentEditable); };

/** a still copy of the page for the turning sheet: no ids, no focus, no clicks */
function still(el: HTMLElement) {
  const c = el.cloneNode(true) as HTMLElement;
  c.removeAttribute("id"); c.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
  c.querySelectorAll("[name]").forEach(n => n.removeAttribute("name"));
  c.setAttribute("aria-hidden", "true"); c.inert = true;
  // the copy keeps what was typed (cloneNode copies input values) and where the page was scrolled
  const from = el.querySelectorAll<HTMLElement>("*"), to = c.querySelectorAll<HTMLElement>("*");
  from.forEach((n, i) => { if (n.scrollTop) requestAnimationFrame(() => { if (to[i]) to[i].scrollTop = n.scrollTop; }); });
  return c;
}

export function MobileCssBook() {
  const b = useBook(), sheet = useSheet(b.step);
  const open = b.view === "home" || b.view === "wizard";
  const [geo, setGeo] = useState<Geo>(() => ({ vw: innerWidth, vh: innerHeight }));
  const [zooming, setZooming] = useState(false);
  const [anim, setAnim] = useState(false); // will-change only while something moves
  const root = useRef<HTMLDivElement>(null), tilt = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null), under = useRef<HTMLDivElement>(null);

  // the screen's size: width at once, height after the address bar settles, not while the keyboard is up
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = () => {
      clearTimeout(t);
      const next = () => setGeo(g => (g.vw === innerWidth && g.vh === innerHeight ? g : { vw: innerWidth, vh: innerHeight }));
      if (innerWidth !== geo.vw) { next(); return; }
      t = setTimeout(() => { if (!typing()) next(); }, 250);
    };
    addEventListener("resize", on);
    return () => { removeEventListener("resize", on); clearTimeout(t); };
  }, [geo.vw]);

  // the stage around the book (MobileStage): its desk photo zooms with the book, the hint hides
  const phase = open ? "open" : zooming ? "zoomed" : "closed";
  const zoomBy = layout(geo) as Record<string, string>;
  useEffect(() => {
    const st = root.current?.closest<HTMLElement>(".m-stage"); if (!st) return;
    st.dataset.book = phase;
    for (const k of ["--mcb-dz", "--mcb-do", "--mcb-tapy"]) st.style.setProperty(k, zoomBy[k]);
  }, [phase, zoomBy["--mcb-dz"], zoomBy["--mcb-do"], zoomBy["--mcb-tapy"]]); // eslint-disable-line react-hooks/exhaustive-deps

  // while something moves: will-change on (the zoom and the cover; the turns set it on the sheet themselves)
  const [seenPhase, setSeenPhase] = useState(phase);
  if (seenPhase !== phase) { setSeenPhase(phase); if (!b.instant) setAnim(true); }
  useEffect(() => { if (!anim) return; const t = setTimeout(() => setAnim(false), OPEN_MS + 100); return () => clearTimeout(t); }, [anim, phase]);

  // one tap: closer (1.2s), then the cover opens
  const tap = () => {
    if (open || zooming) return;
    if (reduced()) { b.open(); return; }
    setZooming(true);
  };
  useEffect(() => { if (!zooming) return; const t = setTimeout(() => { b.open(); setZooming(false); }, ZOOM_MS); return () => clearTimeout(t); }, [zooming, b]);
  useEffect(() => { if (!open) setZooming(false); }, [open]);

  // ---- page turns: menu (0) and the wizard's sheets (step * 2 + sheet), as the 3D book's order ----
  const key = b.view === "wizard" ? `w${b.step}-${sheet}` : b.view;
  const order = b.view === "wizard" ? b.step * 2 + sheet : 0;
  const last = useRef({ key, order, open }), pending = useRef<null | { dir: 1 | -1; old: HTMLElement }>(null);
  // decided while rendering: the page on the screen is still the old one here, so it can be copied
  if (key !== last.current.key && open && last.current.open && content.current && !pending.current) {
    pending.current = { dir: order >= last.current.order ? 1 : -1, old: still(content.current) };
  }
  useLayoutEffect(() => {
    last.current = { key, order, open };
    const p = pending.current; pending.current = null;
    const t = tilt.current, f = front.current, u = under.current;
    if (!p || !t || !f || !u || !content.current) return;
    if (reduced()) { // a short fade instead of the turn
      content.current.classList.remove("is-fade"); void content.current.offsetWidth; content.current.classList.add("is-fade");
      return;
    }
    t.classList.remove("wizard", "turning", "turned", "back");
    if (p.dir > 0) {
      // forward: the old page on the sheet's front, turning to the left over the new page
      f.replaceChildren(p.old); u.replaceChildren();
      t.classList.add("wizard", "turning");
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("turned")));
    } else {
      // back: the sheet comes back from the left with the new page, over a copy of the old one
      f.replaceChildren(still(content.current)); u.replaceChildren(p.old);
      t.classList.add("wizard", "turning", "turned", "back");
      void t.offsetWidth; // start from the turned side
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.remove("turned")));
    }
    const done = setTimeout(() => { t.classList.remove("wizard", "turning", "turned", "back"); f.replaceChildren(); u.replaceChildren(); }, TURN_MS + 60);
    return () => clearTimeout(done);
  }, [key, order, open]);

  // the keyboard: keep the field in view inside its own page (the book itself never moves)
  useEffect(() => {
    const el = content.current; if (!el) return;
    const on = (e: FocusEvent) => {
      const f = e.target as HTMLElement;
      if (!(f instanceof HTMLInputElement || f instanceof HTMLTextAreaElement)) return;
      setTimeout(() => f.scrollIntoView({ block: "center", behavior: "smooth" }), 320);
    };
    el.addEventListener("focusin", on);
    return () => el.removeEventListener("focusin", on);
  }, []);

  const L = layout(geo), pw = geo.vw - P.leftShow - P.rightGap, ph = geo.vh - P.topGap - P.bottomKeep;
  // the page box: screen px (--k 1); the wizard reads its height for its own layout (MobileBookWizard)
  const pageBox = { width: pw + "px", height: ph + "px", "--k": "1", "--mbw-w": pw + "px" } as CSSProperties;
  const cls = "mcb" + (phase === "open" ? " is-open is-zoomed" : phase === "zoomed" ? " is-zoomed" : "") + (anim ? " is-anim" : "") + (b.instant && open ? " is-instant" : ""); // arriving already open: no motion

  return (
    <div ref={root} className={cls} style={L}>
      <div className="mcb-book">
        <div className="mcb-persp">
          <div ref={tilt} className="mcb-tilt">
            <div className="mcb-abs mcb-shadow-r" />
            <div className="mcb-abs mcb-shadow-l" />
            <div className="mcb-abs mcb-board mcb-linen" />
            <div className="mcb-abs mcb-thick" />

            {/* the right page: the real page, laid out at screen pixels */}
            {/* #bookRight: the desk buttons (DeskButtons.tsx) sit under this page */}
            <div id="bookRight" className="mcb-abs mcb-rpage mcb-paper">
              <div className="mcb-abs mcb-gutter-r" /><div className="mcb-abs mcb-edge-r" />
              <div ref={content} className="mcb-content" inert={!open} aria-hidden={!open || undefined}>
                <div className="mcb-pbox" style={pageBox}>
                  {b.view === "wizard" ? <MobileBookWizard sheet={sheet} /> : <RightPage onClose={b.close} />}
                </div>
              </div>
              <div ref={under} className="mcb-under" aria-hidden="true" />
              <div className="mcb-under-shade" />
            </div>

            {/* the AI tab sticks up from the page's head (mobile.css .ai-ftab-menu); not clipped by the page */}
            <div className="mcb-abs mcb-aibox" style={{ ["--k" as string]: "1" }} inert={!open}><AiTab variant="menu" /></div>
            <div className="mcb-abs mcb-ribbon mcb-linen" aria-hidden="true" />

            {/* the turning sheet: front = the page it carries, back = the left page */}
            <div className="mcb-abs mcb-sheet" aria-hidden="true">
              <div className="mcb-face mcb-front mcb-paper"><div className="mcb-abs mcb-gutter-r" /><div ref={front} className="mcb-copy" style={pageBox} /><div className="mcb-shade" /></div>
              <div className="mcb-face mcb-back mcb-paper">
                <div className="mcb-abs mcb-gutter-l" />
                <div className="mcb-left"><img src="/mobile/logo_gold.webp" alt="" /><p lang="en">a crochet pattern book</p></div>
                <div className="mcb-shade" />
              </div>
            </div>

            {/* the cover */}
            <div className="mcb-abs mcb-cover" aria-hidden="true">
              <div className="mcb-face mcb-front">
                <img className="mcb-art" src="/mobile/cover_bird.webp" alt="" />
                <div className="mcb-abs mcb-band mcb-linen" />
                <div className="mcb-abs mcb-lbl"><img src="/mobile/logo_gold.webp" alt="" /></div>
                <div className="mcb-abs mcb-gloss" />
              </div>
              <div className="mcb-face mcb-back mcb-linen"><div className="mcb-abs mcb-endpaper mcb-paper"><div className="mcb-abs mcb-gutter-l" /></div></div>
            </div>

            {!open && <button type="button" className="mcb-hit" aria-label="책 열기" onClick={tap} />}
          </div>
        </div>
      </div>
    </div>
  );
}
