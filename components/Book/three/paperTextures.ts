// Canvas textures for the paper: the open spread's two pages (blank paper; their content is real DOM laid
// on top, see PageSpread.tsx), the turning sheets and the page block edges. Browser-only.
import { BLOCK, SHEET_W } from "./geometry";

export const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

export const PAGE_D = BLOCK.z1 - BLOCK.z0;
/** The page's DOM box in CSS px (720 px = the page width) and its scale onto the page in cm. */
export const PAGE_PX = 720, PAGE_H_PX = Math.round(PAGE_PX * PAGE_D / SHEET_W), PX_CM = SHEET_W / PAGE_PX;

/** Paper: warm cream (#FBF3EA), very faint grain, a soft shadow over the inner 8% towards the gutter,
 *  the outer edge a touch brighter. u = 0 at the gutter when gutterAtLeft. */
function paperBase(ctx: CanvasRenderingContext2D, w: number, h: number, gutterAtLeft: boolean, web = false) {
  ctx.fillStyle = web ? "#FBF8F1" : "#FBF3EA"; ctx.fillRect(0, 0, w, h); // web (Kim): a brighter ivory
  for (let i = 0; i < 1400; i++) { ctx.fillStyle = `rgba(150,120,80,${Math.random() * 0.018})`; ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 2); }
  const gx = gutterAtLeft ? 0 : w, ox = gutterAtLeft ? w : 0, dir = gutterAtLeft ? 1 : -1;
  const g = ctx.createLinearGradient(gx, 0, gx + dir * w * 0.08, 0);
  g.addColorStop(0, "rgba(90,62,40,.26)"); g.addColorStop(0.45, "rgba(90,62,40,.09)"); g.addColorStop(1, "rgba(90,62,40,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const o = ctx.createLinearGradient(ox, 0, ox - dir * w * 0.12, 0);
  o.addColorStop(0, "rgba(255,255,255,.35)"); o.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = o; ctx.fillRect(0, 0, w, h);
}

/** Blank page (both sides of the turning sheets). u = 0 at the gutter. */
export function drawBlankPage(cv: HTMLCanvasElement, web = false) { paperBase(cv.getContext("2d")!, cv.width, cv.height, true, web); }

/** The spread's pages: paper plus 2-3 hairlines along the bottom and the outer edge, where the sheets
 *  below peek out. The right page has u = 0 at the gutter; the left one (back face of the last turned
 *  sheet) is drawn mirrored so it reads correctly. */
function spreadPage(cv: HTMLCanvasElement, gutterAtLeft: boolean, web = false) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height;
  paperBase(ctx, w, h, gutterAtLeft, web);
  const step = w * 0.0042;
  for (let i = 1; i <= 3; i++) {
    ctx.fillStyle = `rgba(120,95,70,${0.16 - i * 0.03})`;
    const y = h - i * step; ctx.fillRect(gutterAtLeft ? w * 0.08 : 0, y, w * 0.92, 1.2);
    const x = gutterAtLeft ? w - i * step : i * step; ctx.fillRect(x, 0, 1.2, h - i * step);
  }
}
export const drawRightPage = (cv: HTMLCanvasElement, web = false) => spreadPage(cv, true, web);
export const drawLeftPage = (cv: HTMLCanvasElement, web = false) => spreadPage(cv, false, web);

// ---- page block edges: hundreds of sheets, lines stacked along v ----
/** Page block edges: fine page lines stacked along v; darker where the edges meet the boards (top and
 *  bottom of v) and, on the head/tail faces, towards the spine (u = 0). */
export function drawPageEdges(cv: HTMLCanvasElement, spineSide: boolean, web = false) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height;
  if (web) return webPageEdges(ctx, w, h, spineSide);
  ctx.fillStyle = "#EFE4D2"; ctx.fillRect(0, 0, w, h);
  // dense, irregular page lines (spacing and darkness vary like real paper)
  let y = 0, i = 0;
  while (y < h) {
    const a = 0.05 + ((i * 7919) % 23) / 190;
    ctx.fillStyle = `rgba(140,108,78,${a})`; ctx.fillRect(0, y, w, 0.9 + ((i * 31) % 3) * 0.35);
    y += 2.6 + ((i * 104729) % 7) * 0.45; i++;
  }
  // brighter middle, darker where the block meets the boards (top and bottom of v)
  const mid = ctx.createLinearGradient(0, 0, 0, h);
  mid.addColorStop(0, "rgba(90,64,42,.3)"); mid.addColorStop(0.16, "rgba(90,64,42,0)"); mid.addColorStop(0.5, "rgba(255,250,240,.16)");
  mid.addColorStop(0.84, "rgba(90,64,42,0)"); mid.addColorStop(1, "rgba(90,64,42,.3)");
  ctx.fillStyle = mid; ctx.fillRect(0, 0, w, h);
  if (spineSide) { const g = ctx.createLinearGradient(0, 0, w * 0.14, 0); g.addColorStop(0, "rgba(90,64,42,.34)"); g.addColorStop(1, "rgba(90,64,42,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w * 0.14, h); }
}

/** Web (Kim): brighter ivory edges with faint paper-layer lines, and a thin AO-like shadow where the block
 *  meets the boards (top and bottom of v), narrower and darker than the phone's broad gradient. */
function webPageEdges(ctx: CanvasRenderingContext2D, w: number, h: number, spineSide: boolean) {
  ctx.fillStyle = "#F4EDE1"; ctx.fillRect(0, 0, w, h);
  let y = 0, i = 0;
  while (y < h) {
    const a = 0.035 + ((i * 7919) % 23) / 330;
    ctx.fillStyle = `rgba(150,120,90,${a})`; ctx.fillRect(0, y, w, 0.8 + ((i * 31) % 3) * 0.3);
    y += 2.4 + ((i * 104729) % 7) * 0.4; i++;
  }
  const ao = ctx.createLinearGradient(0, 0, 0, h);
  ao.addColorStop(0, "rgba(70,50,34,.46)"); ao.addColorStop(0.035, "rgba(70,50,34,.16)"); ao.addColorStop(0.09, "rgba(70,50,34,0)");
  ao.addColorStop(0.5, "rgba(255,252,246,.14)");
  ao.addColorStop(0.91, "rgba(70,50,34,0)"); ao.addColorStop(0.965, "rgba(70,50,34,.16)"); ao.addColorStop(1, "rgba(70,50,34,.46)");
  ctx.fillStyle = ao; ctx.fillRect(0, 0, w, h);
  if (spineSide) { const g = ctx.createLinearGradient(0, 0, w * 0.12, 0); g.addColorStop(0, "rgba(70,50,34,.36)"); g.addColorStop(1, "rgba(70,50,34,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w * 0.12, h); }
}
