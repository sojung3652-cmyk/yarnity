// Crochet chart symbols (the standard ones, as on a Korean / Japanese symbol table), drawn as our own vector
// paths. One definition for both the canvas stitch map (Path2D) and the HTML legend (<svg><path>).
// Unit box: centred on (0, 0), about 1 tall; "up" (-y) is the direction the stitch grows (outward in a
// round chart, upward in rows).
//   ring  매직링                  a circle
//   ch    사슬뜨기                an open oval
//   sl    빼뜨기                  a filled oval
//   sc    짧은뜨기                a cross (+)
//   inc   짧은뜨기 2코 늘려뜨기   two crosses spreading from one base (V with a bar on each arm)
//   dc    한길긴뜨기              a T with one stroke across its post (a bag's stitch-pattern rounds)

export type StitchSym = "ring" | "ch" | "sl" | "sc" | "inc" | "dc";

export const SYM_PATH: Record<StitchSym, string> = {
  ring: "M0.45 0A0.45 0.45 0 1 0 -0.45 0A0.45 0.45 0 1 0 0.45 0",
  ch: "M-0.42 0A0.42 0.22 0 1 0 0.42 0A0.42 0.22 0 1 0 -0.42 0",
  sl: "M-0.36 0A0.36 0.19 0 1 0 0.36 0A0.36 0.19 0 1 0 -0.36 0",
  sc: "M0 -0.42V0.42M-0.3 0H0.3",
  inc: "M0 0.45L-0.27 -0.42M0 0.45L0.27 -0.42M-0.31 0H-0.03M0.03 0H0.31",
  dc: "M0 -0.46V0.46M-0.25 -0.46H0.25M-0.2 0.1L0.2 -0.1",
};
/** filled rather than stroked */
export const SYM_FILL: Partial<Record<StitchSym, boolean>> = { sl: true };
export const SYM_KO: Record<StitchSym, string> = { ring: "매직링", ch: "사슬뜨기", sl: "빼뜨기", sc: "짧은뜨기", inc: "짧은뜨기 2코 늘려뜨기", dc: "한길긴뜨기" };

const cache: Partial<Record<StitchSym, Path2D>> = {};
/** Draws a symbol on a canvas at (x, y), `size` px tall, rotated by `angle` (0 = growing upward). */
export function drawSym(ctx: CanvasRenderingContext2D, sym: StitchSym, x: number, y: number, size: number, angle: number, color: string, weight = 1.3) {
  const p = (cache[sym] ??= new Path2D(SYM_PATH[sym]));
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(size, size);
  if (SYM_FILL[sym]) { ctx.fillStyle = color; ctx.fill(p); }
  else { ctx.strokeStyle = color; ctx.lineWidth = weight / size; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(p); }
  ctx.restore();
}
