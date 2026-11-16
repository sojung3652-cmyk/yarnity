// Canvas textures printed on the paper, plus the cloth label. Browser-only.
import { dots, plan } from "@/lib/pattern";
import { BLOCK, SHEET_W } from "./geometry";

export const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

export const PAGE_D = BLOCK.z1 - BLOCK.z0;
/** Page layout in CSS px (360 px = the page width), shared by the printed texture and the DOM button. */
export const PAGE_PX = 360, PAGE_H_PX = Math.round(PAGE_PX * PAGE_D / SHEET_W), PX_CM = SHEET_W / PAGE_PX;
const PAD = 40;
export const PAGE_LAYOUT = (() => {
  // same copy and sizes as the CSS book's right page; block vertically centred
  const eyebrow = 12, h1 = 25, h1Lead = 1.3, p = 13.5, pLead = 1.6, btnH = 42;
  const blockH = eyebrow + 14 + 3 * h1 * h1Lead + 14 + 2 * p * pLead + 22 + btnH;
  const top = Math.round((PAGE_H_PX - blockH) / 2);
  const button = { x: PAD, y: Math.round(top + blockH - btnH), w: 128, h: btnH };
  // the site's nav moved onto the page: a text link to "내 작품" beside the main button
  const mine = { x: button.x + button.w + 18, y: button.y, w: 92, h: btnH };
  return { pad: PAD, top, eyebrow, h1, h1Lead, p, pLead, button, mine };
})();

/** Paper base: warm cream, faint mottling, soft shade towards the gutter (u = 0). */
function paperBase(ctx: CanvasRenderingContext2D, w: number, h: number, gutterAtLeft: boolean) {
  ctx.fillStyle = "#F7EFE2"; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(150,120,80,${Math.random() * 0.02})`; ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 3); }
  // gutter shadow (ambient occlusion): darkest in the fold, brighter towards the outer edge
  const gx = gutterAtLeft ? 0 : w, g = ctx.createLinearGradient(gx, 0, gutterAtLeft ? w * 0.22 : w * 0.78, 0);
  g.addColorStop(0, "rgba(70,50,30,.30)"); g.addColorStop(0.35, "rgba(70,50,30,.10)"); g.addColorStop(1, "rgba(70,50,30,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

/** Blank page (both sides of the turning sheets). u = 0 at the gutter. */
export function drawBlankPage(cv: HTMLCanvasElement) { paperBase(cv.getContext("2d")!, cv.width, cv.height, true); }

/** Right page: the headline and description printed on the paper; the button itself is real DOM. */
export function drawRightPage(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height, k = w / PAGE_PX, L = PAGE_LAYOUT;
  paperBase(ctx, w, h, true);
  ctx.textBaseline = "top"; let y = L.top * k;
  const ink = (c: string, a = 0.92) => { ctx.fillStyle = c; ctx.globalAlpha = a; };
  ink("#776D68"); ctx.font = `400 ${L.eyebrow * k}px Newsreader, Georgia, serif`;
  let x = L.pad * k; for (const ch of "YARNITY / INTELLIGENT CROCHET") { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + 0.06 * L.eyebrow * k; }
  y += (L.eyebrow + 14) * k;
  ink("#2B2523"); ctx.font = `700 ${L.h1 * k}px Newsreader, Georgia, serif`;
  for (const line of ["Your creativity.", "Our intelligence.", "Every stitch, together."]) { ctx.fillText(line, L.pad * k, y); y += L.h1 * L.h1Lead * k; }
  y += 14 * k - (L.h1 * L.h1Lead - L.h1) * k;
  ink("#776D68"); ctx.font = `400 ${L.p * k}px Newsreader, Georgia, serif`;
  for (const line of ["Generate your patterns with AI. Track every", "stitch. Bring your ideas to life."]) { ctx.fillText(line, L.pad * k, y); y += L.p * L.pLead * k; }
  ctx.globalAlpha = 1;
}

// ---- left page: the 15cm coaster's stitch map, printed (ink at 90%) ----
const heroPlan = plan({ shape: "circle", a: 15, hook: "5호", weight: "medium", object: "coaster" });
const heroDots = dots(heroPlan, "circle", heroPlan.bottomRounds);
export const heroCaption = `지름 15cm · ${heroPlan.bottomRounds}단 · ${heroPlan.last}코`;
/** Left page; drawn so it reads correctly on the back face of the last turned sheet (u = 0 at the gutter, on the right). */
export function drawLeftPage(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height;
  paperBase(ctx, w, h, false);
  const size = w * 0.74, R = heroPlan.bottomRounds, sc = (size / 2) / (R * heroPlan.g.h), r = size * 0.0068;
  ctx.save(); ctx.translate(w * 0.48, h * 0.46); ctx.globalAlpha = 0.9;
  for (const d of heroDots) for (const p of d.pts) {
    ctx.beginPath(); ctx.arc(p.x * sc, p.y * sc, r, 0, Math.PI * 2);
    if (p.inc) { ctx.lineWidth = r * 0.45; ctx.strokeStyle = "#8E77BE"; ctx.stroke(); } else { ctx.fillStyle = "#BBA9DD"; ctx.fill(); }
  }
  ctx.restore();
  ctx.globalAlpha = 0.9; ctx.fillStyle = "#7A706B"; ctx.font = `400 ${Math.round(w * 0.032)}px Newsreader, "Noto Serif KR", Georgia, serif`;
  ctx.fillText(heroCaption, w * 0.09, h - w * 0.09); ctx.globalAlpha = 1;
}

// ---- page block edges: hundreds of sheets, lines stacked along v ----
/** Page block edges: fine page lines stacked along v; darker where the edges meet the boards (top and
 *  bottom of v) and, on the head/tail faces, towards the spine (u = 0). */
export function drawPageEdges(cv: HTMLCanvasElement, spineSide: boolean) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height;
  ctx.fillStyle = "#F6EFE2"; ctx.fillRect(0, 0, w, h);
  // ~150 visible lines over the block: finer than this only averages to grey on screen
  let y = 0, i = 0;
  while (y < h) {
    const a = 0.1 + ((i * 7919) % 17) / 120; // irregular, like real paper
    ctx.fillStyle = `rgba(150,120,85,${a})`; ctx.fillRect(0, y, w, 1.6);
    y += 5.5 + ((i * 104729) % 5) * 0.7; i++;
  }
  for (const [y0, y1] of [[0, h * 0.12], [h, h * 0.88]]) {
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, "rgba(70,50,35,.22)"); g.addColorStop(1, "rgba(70,50,35,0)");
    ctx.fillStyle = g; ctx.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0));
  }
  if (spineSide) { const g = ctx.createLinearGradient(0, 0, w * 0.1, 0); g.addColorStop(0, "rgba(70,50,35,.28)"); g.addColorStop(1, "rgba(70,50,35,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w * 0.1, h); }
}
