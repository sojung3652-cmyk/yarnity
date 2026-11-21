// Front cover art of the cloth hardcover (design "C"), shared by the WebGL book and the CSS fallback so the
// two look the same closed. One canvas, 4:5 like the cover:
//   lavender spine cloth turned 7% onto the cover -> a thin hinge groove -> the bird picture (cover-fit,
//   centred) -> a cream paper label lower left with the Yarnity wordmark.
// The 3D book draws the label as its own thin mesh (so it can sit proud and cast a shadow); the CSS book
// asks for it baked in. Browser-only.

export const COVER_W = 1600, COVER_H = 2000;
/** A CSS custom property from :root (globals.css), with a fallback for SSR / tests. */
export function cssVar(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
/** Book cloth lavender: --book-lav (pastel, matched against the photo's crochet motif). */
export const lavender = () => cssVar("--book-lav", "#EEBDC7");
export const BAND = 0.07;                       // spine cloth turned onto the cover (fraction of the width)
/** Label rect as fractions of the cover: 42% wide, height 38% of its width, 15% from the left, 8% from the bottom. */
export const LABEL = { x: 0.15, w: 0.42, aspect: 0.38, bottom: 0.08 };
export const labelRect = (w: number, h: number) => {
  const lw = LABEL.w * w, lh = lw * LABEL.aspect;
  return { x: LABEL.x * w, y: h - LABEL.bottom * h - lh, w: lw, h: lh };
};

let assets: Promise<{ bird: HTMLImageElement; logo: HTMLImageElement }> | null = null;
export function loadCoverAssets() {
  // a picture that fails to load must not leave the cover unpainted (black in 3D, Kim saw a "stone" book): it stands
  // in as an empty 1px image, so the cloth, the band and the label are still drawn
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const load = (src: string) => new Promise<HTMLImageElement>(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => { const b = new Image(); b.onload = () => ok(b); b.src = BLANK; }; i.src = src; });
  assets ??= Promise.all([load("/pic/bird.png"), load("/pic/logo-mark.svg")]).then(([bird, logo]) => ({ bird, logo }));
  return assets;
}

/** Cloth: a very fine woven grid, drawn faintly (the 3D book adds a matching normal map instead). */
function weave(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.globalAlpha = alpha; ctx.fillStyle = "#3A2E29";
  for (let i = 0; i < w; i += 3) ctx.fillRect(x + i, y, 1, h);
  for (let j = 0; j < h; j += 3) ctx.fillRect(x, y + j, w, 1);
  ctx.restore();
}

/** Cream paper label with the wordmark in dark brown, centred. */
export function drawLabel(cv: HTMLCanvasElement, logo: HTMLImageElement) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height;
  ctx.fillStyle = "#FAF4EA"; ctx.fillRect(0, 0, w, h);
  // a whisper of paper tooth
  for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(120,95,70,${Math.random() * 0.045})`; ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1); }
  // wordmark: draw the SVG, then recolour it to #3A2E29 (source-in keeps its shape)
  const lw = w * 0.66, lh = lw * logo.naturalHeight / logo.naturalWidth;
  const t = document.createElement("canvas"); t.width = Math.round(lw); t.height = Math.round(lh);
  const tc = t.getContext("2d")!; tc.drawImage(logo, 0, 0, t.width, t.height); tc.globalCompositeOperation = "source-in"; tc.fillStyle = "#3A2E29"; tc.fillRect(0, 0, t.width, t.height);
  ctx.drawImage(t, (w - lw) / 2, (h - lh) / 2);
  // fine edge
  ctx.strokeStyle = "rgba(90,70,55,.18)"; ctx.lineWidth = Math.max(1, w / 400); ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

/** The front cover. withLabel: bake the label in (CSS book); otherwise only its soft shadow is baked. */
export function drawCover(cv: HTMLCanvasElement, a: { bird: HTMLImageElement; logo: HTMLImageElement }, opts: { withLabel: boolean; weave: boolean }) {
  const ctx = cv.getContext("2d")!, w = cv.width, h = cv.height, bx = Math.round(BAND * w);
  ctx.fillStyle = lavender(); ctx.fillRect(0, 0, w, h);
  // picture: object-fit cover over the area right of the band, centred
  const pw = w - bx, ph = h, s = Math.max(pw / a.bird.naturalWidth, ph / a.bird.naturalHeight), iw = a.bird.naturalWidth * s, ih = a.bird.naturalHeight * s;
  // printed on cloth: a touch less saturated and warmer than the source picture, like the photo's tones
  ctx.save(); ctx.beginPath(); ctx.rect(bx, 0, pw, ph); ctx.clip(); ctx.filter = "saturate(0.95) sepia(0.05)"; ctx.drawImage(a.bird, bx + (pw - iw) / 2, (ph - ih) / 2, iw, ih); ctx.restore();
  if (opts.weave) { weave(ctx, 0, 0, bx, h, 0.07); weave(ctx, bx, 0, pw, h, 0.035); }
  // hinge groove where the cloth meets the picture: a thin dark line with a soft fall-off on both sides
  const g = ctx.createLinearGradient(bx - w * 0.012, 0, bx + w * 0.012, 0);
  g.addColorStop(0, "rgba(59,26,33,0)"); g.addColorStop(0.42, "rgba(59,26,33,.18)"); g.addColorStop(0.5, "rgba(59,26,33,.42)"); g.addColorStop(0.58, "rgba(59,26,33,.16)"); g.addColorStop(1, "rgba(59,26,33,0)");
  ctx.fillStyle = g; ctx.fillRect(bx - w * 0.012, 0, w * 0.024, h);
  ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(bx + w * 0.004, 0, Math.max(1, w * 0.0015), h); // lit lip of the groove
  // label: a thin paper sitting just above the cloth -> soft shadow down-right (light from the upper left)
  const L = labelRect(w, h);
  ctx.save(); ctx.shadowColor = "rgba(40,28,20,.32)"; ctx.shadowBlur = w * 0.012; ctx.shadowOffsetX = w * 0.004; ctx.shadowOffsetY = w * 0.005;
  ctx.fillStyle = opts.withLabel ? "#FAF4EA" : "rgba(250,244,234,1)"; ctx.fillRect(L.x, L.y, L.w, L.h); ctx.restore();
  if (opts.withLabel) {
    const lc = document.createElement("canvas"); lc.width = Math.round(L.w); lc.height = Math.round(L.h); drawLabel(lc, a.logo);
    ctx.drawImage(lc, L.x, L.y);
  }
}
