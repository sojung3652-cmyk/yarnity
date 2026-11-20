// Paints a book page's DOM onto a canvas, for the turning leaf (and the pages under it) while the real DOM
// is hidden. A small painter instead of a DOM-to-image library: it draws with the fonts the page already
// has loaded (the Korean serif included, no font embedding, no network), so a page is ready in a few ms.
// It covers what the book pages use: text (with letter spacing, upper-casing, underlines), input values and
// placeholders, background colours with rounded corners (+ a soft shadow), borders (solid / dashed),
// inline SVG (logo, ribbon, item art, the pattern drawing) and clipping by overflow (closed folds).
// Not covered (not needed for a 0.7s turn): gradients, transforms, pseudo-elements other than placeholders.
//
// The page is cloned into an off-screen box of a fixed size (the page laid out at zoom 1), so the result
// does not depend on where the live page is or whether it is visible / CSS-3D-transformed.
import { drawLeftPage, drawRightPage } from "./paperTextures";

export interface PaintBox { w: number; h: number; vars?: Record<string, string> }

let logoData: Promise<string> | null = null;
/** /pic/logo-mark.svg as a data URL: an SVG drawn as an image cannot load files of its own. */
function logoMark() {
  logoData ??= fetch("/pic/logo-mark.svg").then(r => r.text()).then(t => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t)).catch(() => "");
  return logoData;
}

/** An inert copy of a page as it looks now (typed values included, no ids). */
function clonePage(src: HTMLElement) {
  const c = src.cloneNode(true) as HTMLElement;
  const a = src.querySelectorAll<HTMLInputElement>("input,textarea"), b = c.querySelectorAll<HTMLInputElement>("input,textarea");
  a.forEach((s, i) => { b[i].value = s.value; });
  // no duplicate ids in the document - except inside SVGs, whose gradients / masks / filters refer to
  // their own ids (each SVG is drawn on its own, as an image, so they resolve inside it)
  [c, ...c.querySelectorAll("[id]")].forEach(e => { if (!e.closest("svg")) e.removeAttribute("id"); });
  return c;
}

const alphaOf = (col: string) => { const m = col.match(/rgba?\(([^)]+)\)/); if (!m) return 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };

export async function paintPage(src: HTMLElement, box: PaintBox, side: "left" | "right", res: number, paper = true): Promise<HTMLCanvasElement> {
  const W = Math.round(res), H = Math.round(res * box.h / box.w), S = W / box.w;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  if (paper) (side === "right" ? drawRightPage : drawLeftPage)(cv); // the same paper as the page it stands for

  const wrap = document.createElement("div");
  Object.assign(wrap.style, { position: "fixed", left: "-30000px", top: "0", width: box.w + "px", height: box.h + "px", pointerEvents: "none" });
  for (const [k, v] of Object.entries(box.vars ?? {})) wrap.style.setProperty(k, v);
  wrap.setAttribute("aria-hidden", "true"); wrap.inert = true;
  const page = clonePage(src); wrap.append(page); document.body.append(wrap);
  // a page scrolled inside (a long step) is pictured as it is scrolled: same structure, same scroll offsets
  { const from = [src, ...src.querySelectorAll("*")], to = [page, ...page.querySelectorAll("*")];
    from.forEach((e, i) => { if (e.scrollTop && to[i]) to[i].scrollTop = e.scrollTop; }); }
  try {
    const o = wrap.getBoundingClientRect();
    const X = (v: number) => (v - o.left) * S, Y = (v: number) => (v - o.top) * S;
    type Rect = { l: number; t: number; r: number; b: number };
    const ops: (() => void)[] = [], loads: Promise<unknown>[] = [];
    const opac = new Map<Element, number>(), clips = new Map<Element, Rect | null>();
    const opacity = (el: Element): number => {
      if (el === wrap) return 1;
      let v = opac.get(el); if (v !== undefined) return v;
      v = parseFloat(getComputedStyle(el).opacity) * opacity(el.parentElement!); opac.set(el, v); return v;
    };
    // the visible area of an element: its overflow-clipping ancestors intersected (closed folds are 0 high)
    const clipOf = (el: Element): Rect | null => {
      if (el === wrap || !el.parentElement) return null;
      if (clips.has(el)) return clips.get(el)!;
      const up = clipOf(el.parentElement), cs = getComputedStyle(el.parentElement);
      let c = up;
      if (el.parentElement !== wrap && (cs.overflowX !== "visible" || cs.overflowY !== "visible")) {
        const q = el.parentElement.getBoundingClientRect(), r = { l: X(q.left), t: Y(q.top), r: X(q.right), b: Y(q.bottom) };
        c = up ? { l: Math.max(up.l, r.l), t: Math.max(up.t, r.t), r: Math.min(up.r, r.r), b: Math.min(up.b, r.b) } : r;
      }
      clips.set(el, c); return c;
    };
    const clipped = (el: Element, draw: () => void) => () => {
      const c = clipOf(el); if (c && (c.r <= c.l || c.b <= c.t)) return;
      ctx.save(); if (c) { ctx.beginPath(); ctx.rect(c.l, c.t, c.r - c.l, c.b - c.t); ctx.clip(); }
      ctx.globalAlpha = opacity(el); draw(); ctx.restore();
    };
    const hidden = (el: Element) => { const cs = getComputedStyle(el); return cs.display === "none" || cs.visibility === "hidden" || !!el.closest(".sr") || opacity(el) < 0.01; };
    const fontOf = (cs: CSSStyleDeclaration) => `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * S}px ${cs.fontFamily}`;
    const spacing = (cs: CSSStyleDeclaration) => (cs.letterSpacing === "normal" ? "0px" : parseFloat(cs.letterSpacing) * S + "px");

    for (const el of [page, ...page.querySelectorAll("*")]) {
      if (el instanceof SVGElement && el.tagName.toLowerCase() !== "svg") continue; // drawn with its <svg>
      if (el.parentElement?.closest("svg")) continue;
      if (hidden(el)) continue;
      const cs = getComputedStyle(el), q = el.getBoundingClientRect();
      if (q.width < 0.5 || q.height < 0.5) continue;
      const x = X(q.left), y = Y(q.top), w = q.width * S, h = q.height * S;

      // background colour (rounded), with a soft shadow when the element has one (the woven labels).
      // Not for masked elements (the menu's yarn-ball ornament): without the mask it would be a square.
      if (alphaOf(cs.backgroundColor) > 0 && cs.backgroundColor !== "transparent" && (cs.maskImage || "none") === "none") {
        const rr = cs.borderTopLeftRadius.endsWith("%") ? Math.min(w, h) * parseFloat(cs.borderTopLeftRadius) / 100 : parseFloat(cs.borderTopLeftRadius) * S;
        ops.push(clipped(el, () => {
          if (cs.boxShadow !== "none") { ctx.shadowColor = "rgba(70,50,40,.18)"; ctx.shadowBlur = 6 * S; ctx.shadowOffsetY = 2 * S; }
          ctx.fillStyle = cs.backgroundColor; ctx.beginPath();
          // clip-path: polygon(...) in % (the wizard's notched ribbon tab), else the rounded box
          const poly = cs.clipPath.startsWith("polygon(") ? cs.clipPath.slice(8, -1).split(",").map(p => p.trim().split(/\s+/).map(parseFloat)) : null;
          if (poly && poly.every(p => p.length === 2)) poly.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x + w * px / 100, y + h * py / 100));
          else ctx.roundRect(x, y, w, h, Math.min(rr, w / 2, h / 2));
          ctx.fill();
        }));
      }
      // a border-image (the cloth patch labels, app/patches.css): the image in nine slices, as the browser draws
      // it (no shadow: drawn per slice it would leave seams) - and no line borders: their computed colour drew a
      // black frame around every patch on the turning leaf (Kim, 2026-11)
      const bis = cs.borderImageSource;
      if (bis && bis !== "none") {
        const url = bis.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
        const sl = parseFloat(cs.borderImageSlice) || 0, fill = cs.borderImageSlice.includes("fill");
        const bt = parseFloat(cs.borderTopWidth) * S, br = parseFloat(cs.borderRightWidth) * S, bb = parseFloat(cs.borderBottomWidth) * S, bl = parseFloat(cs.borderLeftWidth) * S;
        if (url) {
          const img = new Image(); img.src = url;
          loads.push(img.decode().catch(() => {}));
          ops.push(clipped(el, () => {
            if (!img.complete || !img.naturalWidth) return;
            const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.min(sl, iw / 2, ih / 2);
            const sx = [0, s, iw - s, iw], sy = [0, s, ih - s, ih], dx = [x, x + bl, x + w - br, x + w], dy = [y, y + bt, y + h - bb, y + h];
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
              if (r === 1 && c === 1 && !fill) continue;
              const sw = sx[c + 1] - sx[c], sh = sy[r + 1] - sy[r], dw = dx[c + 1] - dx[c], dh = dy[r + 1] - dy[r];
              if (sw > 0 && sh > 0 && dw > 0 && dh > 0) ctx.drawImage(img, sx[c], sy[r], sw, sh, dx[c], dy[r], dw, dh);
            }
          }));
        }
      }
      // borders
      if (!bis || bis === "none") for (const [sd, x0, y0, x1, y1] of [["Top", x, y, x + w, y], ["Bottom", x, y + h, x + w, y + h], ["Left", x, y, x, y + h], ["Right", x + w, y, x + w, y + h]] as const) {
        const bw = parseFloat(cs.getPropertyValue(`border-${sd.toLowerCase()}-width`)), st = cs.getPropertyValue(`border-${sd.toLowerCase()}-style`), col = cs.getPropertyValue(`border-${sd.toLowerCase()}-color`);
        if (!bw || st === "none" || st === "hidden" || alphaOf(col) === 0) continue;
        if (cs.borderTopLeftRadius !== "0px" && cs.borderTopLeftRadius === cs.borderBottomRightRadius && parseFloat(cs.borderTopLeftRadius) > 4 && sd !== "Top") continue; // round outline: drawn once below
        ops.push(clipped(el, () => {
          ctx.strokeStyle = col; ctx.lineWidth = bw * S; ctx.setLineDash(st === "dashed" ? [4 * S, 3 * S] : st === "dotted" ? [1.2 * S, 2.4 * S] : []);
          const r = parseFloat(cs.borderTopLeftRadius) * S;
          ctx.beginPath();
          if (r > 4 * S && cs.borderTopLeftRadius === cs.borderBottomRightRadius) { const i = bw * S / 2; ctx.roundRect(x + i, y + i, w - 2 * i, h - 2 * i, Math.min(r, w / 2, h / 2)); }
          else { const i = bw * S / 2, d = sd === "Top" || sd === "Left" ? i : -i; if (sd === "Top" || sd === "Bottom") { ctx.moveTo(x0, y0 + d); ctx.lineTo(x1, y1 + d); } else { ctx.moveTo(x0 + d, y0); ctx.lineTo(x1 + d, y1); } }
          ctx.stroke();
        }));
      }
      // inline SVG as an image (currentColor resolved, the logo mark inlined)
      if (el.tagName.toLowerCase() === "svg") {
        const svg = el.cloneNode(true) as SVGSVGElement;
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg"); svg.setAttribute("width", String(q.width)); svg.setAttribute("height", String(q.height));
        svg.style.color = cs.color;
        const img = new Image();
        loads.push(logoMark().then(mark => {
          if (mark) svg.querySelectorAll("image").forEach(i => { if ((i.getAttribute("href") ?? "").includes("logo-mark")) i.setAttribute("href", mark); });
          img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
          return img.decode();
        }).catch(() => {}));
        ops.push(clipped(el, () => { if (img.complete && img.naturalWidth) ctx.drawImage(img, x, y, w, h); }));
        continue;
      }
      if (el instanceof HTMLImageElement) { ops.push(clipped(el, () => { if (el.complete && el.naturalWidth) ctx.drawImage(el, x, y, w, h); })); continue; }
      // typed values and placeholders
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el instanceof HTMLInputElement && el.type === "color") continue;
        const text = el.value || el.placeholder; if (!text) continue;
        const col = el.value ? cs.color : getComputedStyle(el, "::placeholder").color;
        ops.push(clipped(el, () => {
          ctx.font = fontOf(cs); ctx.letterSpacing = spacing(cs); ctx.fillStyle = col; ctx.textBaseline = "middle";
          const pl = parseFloat(cs.paddingLeft) * S, center = cs.textAlign === "center";
          ctx.textAlign = center ? "center" : "left";
          ctx.fillText(text, center ? x + w / 2 : x + pl, y + h / 2);
        }));
      }
    }

    // text, word by word at the positions the browser laid it out
    const walk = document.createTreeWalker(page, NodeFilter.SHOW_TEXT), range = document.createRange();
    for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
      const el = n.parentElement!; const s = n.data;
      if (!s.trim() || el.closest("svg,textarea,input,style,script") || hidden(el)) continue;
      const cs = getComputedStyle(el), upper = cs.textTransform === "uppercase", under = cs.textDecorationLine.includes("underline");
      // a rotated glyph (the select box's chevron is a rotated "›"): drawn turned about its box's centre
      const tf = getComputedStyle(el).transform, mm = tf.startsWith("matrix(") ? tf.slice(7, -1).split(",").map(parseFloat) : null;
      const angle = mm ? Math.atan2(mm[1], mm[0]) : 0;
      const re = /\S+/g; let m: RegExpExecArray | null;
      while ((m = re.exec(s))) {
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        const rects = [...range.getClientRects()];
        // a word broken across lines: draw it a character at a time
        const parts = rects.length <= 1 ? [{ t: m[0], r: rects[0] }] : [...m[0]].map((ch, i) => { range.setStart(n, m!.index + i); range.setEnd(n, m!.index + i + 1); return { t: ch, r: range.getClientRects()[0] }; });
        for (const { t, r } of parts) {
          if (!r || r.width < 0.1) continue;
          const word = upper ? t.toUpperCase() : t;
          ops.push(clipped(el, () => {
            ctx.font = fontOf(cs); ctx.letterSpacing = spacing(cs); ctx.fillStyle = cs.color;
            if (Math.abs(angle) > 0.01) {
              ctx.translate(X(r.left + r.width / 2), Y(r.top + r.height / 2)); ctx.rotate(angle);
              ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(word, 0, 0); return;
            }
            ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
            const base = Y(r.bottom) - ctx.measureText(word).fontBoundingBoxDescent;
            ctx.fillText(word, X(r.left), base);
            if (under) { ctx.fillRect(X(r.left), base + 2.5 * S, r.width * S, Math.max(1, S)); }
          }));
        }
      }
    }
    await Promise.all(loads);
    for (const op of ops) op();
  } finally { wrap.remove(); }
  return cv;
}
