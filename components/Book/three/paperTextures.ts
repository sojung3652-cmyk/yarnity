// Canvas textures for the paper parts and the cloth label. Browser-only.
import { dots, plan } from "@/lib/pattern";

// ---- inside of the front cover: the 15cm coaster's stitch map (same drawing as HeroDots) ----
const heroPlan = plan({ shape: "circle", a: 15, hook: "5호", weight: "medium", object: "coaster" });
const heroDots = dots(heroPlan, "circle", heroPlan.bottomRounds);
export const heroCaption = `지름 15cm · ${heroPlan.bottomRounds}단 · ${heroPlan.last}코`;

/**
 * Draws the endpaper. `w x h` covers the visible paper (cover minus the flap); the CSS book centres an
 * 82%-wide square canvas in it and puts the caption at the bottom left.
 */
export function drawEndpaper(cv: HTMLCanvasElement, t: number, reduce: boolean) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height;
  ctx.fillStyle = "#FBF8F2"; ctx.fillRect(0, 0, w, h);
  // soft shade along the gutter (the CSS endpaper's inset shadow), here at the right edge = hinge side
  const g = ctx.createLinearGradient(w, 0, w * 0.86, 0); g.addColorStop(0, "rgba(0,0,0,.16)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(w * 0.86, 0, w * 0.14, h);
  const size = w * 0.82, R = heroPlan.bottomRounds, sc = (size / 2 - size * 0.033) / (R * heroPlan.g.h), r = size * 0.0061;
  ctx.save(); ctx.translate(w / 2, h * 0.47); ctx.rotate(reduce ? 0 : t * 0.04);
  for (const d of heroDots) {
    const a = reduce ? 0.9 : 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.9 - d.r * 0.45));
    for (const p of d.pts) {
      ctx.beginPath(); ctx.arc(p.x * sc, p.y * sc, r, 0, Math.PI * 2);
      if (p.inc) { ctx.lineWidth = r * 0.4; ctx.strokeStyle = `rgba(150,122,196,${a})`; ctx.stroke(); }
      else { ctx.fillStyle = `rgba(200,184,232,${a})`; ctx.fill(); }
    }
  }
  ctx.restore();
  ctx.fillStyle = "#7A706B"; ctx.font = `400 ${Math.round(w * 0.034)}px Newsreader, "Noto Serif KR", Georgia, serif`;
  ctx.fillText(heroCaption, w * 0.06, h - w * 0.05);
}

// ---- cloth label "Yarnity. / INTELLIGENT CROCHET" with stitched ends ----
export const LABEL_CM: [number, number] = [5.0, 1.75];
export function drawLabel(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height;
  ctx.fillStyle = "#F6F1E6"; ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.05; ctx.fillStyle = "#5A4632";
  for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
  for (let x = 0; x < w; x += 2) ctx.fillRect(x, 0, 1, h);
  ctx.globalAlpha = 1;
  // running stitch at both ends (lavender thread)
  ctx.strokeStyle = "rgba(140,118,175,.85)"; ctx.lineWidth = h * 0.028; ctx.setLineDash([h * 0.07, h * 0.05]);
  for (const x of [w * 0.035, w * 0.965]) { ctx.beginPath(); ctx.moveTo(x, h * 0.1); ctx.lineTo(x, h * 0.9); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.fillStyle = "#2B2523"; ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${Math.round(h * 0.4)}px Newsreader, Georgia, serif`;
  ctx.fillText("Yarnity.", w * 0.1, h * 0.52);
  ctx.fillStyle = "#4A413D"; ctx.font = `600 ${Math.round(h * 0.15)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const txt = "INTELLIGENT CROCHET"; let x = w * 0.1;
  for (const ch of txt) { ctx.fillText(ch, x, h * 0.78); x += ctx.measureText(ch).width + h * 0.024; } // letter-spacing .09em
}

// ---- page block ----
/** Fine page lines for the three cut edges (lines run along u, stacked along v). */
export function drawPageEdges(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height;
  ctx.fillStyle = "#FCF8F1"; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { ctx.fillStyle = `rgba(150,128,100,${0.18 + ((y * 7919) % 13) / 100})`; ctx.fillRect(0, y, w, 1); }
}
/** Top page: cream paper with a soft gutter shade at the spine side (u = 0). */
export function drawTopPage(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height;
  ctx.fillStyle = "#FBF8F2"; ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w * 0.12, 0); g.addColorStop(0, "rgba(0,0,0,.2)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w * 0.12, h);
}

export const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
