// "완성 모양" SVG (top view + side view for bags; a flat piece for rows; a ring for tubes).
// Pure string builder, ported from the prototype. `fill` (the yarn colour) tints the shapes lightly;
// without it the output is exactly the prototype's.
import type { Plan, PlanInput } from "./pattern";

export function drawing(p: PlanInput, pp: Plan, fill?: string): string {
  const ink = "var(--ink)", mute = "var(--muted)", line = "var(--muted)";
  const f = fill ? `fill="${fill}" fill-opacity=".38"` : `fill="none"`;
  const b = p.b as number;
  if (p.object === "rows") {
    // flat piece, width x length, rows stacked bottom to top
    const k = 140 / Math.max(p.a, b), w = Math.max(18, p.a * k), h = Math.max(18, b * k), x = 80 - w / 2, y = 78 - h / 2;
    let rows = ""; for (let i = 1; i < 6; i++) rows += `<line x1="${x}" y1="${y + (h * i) / 6}" x2="${x + w}" y2="${y + (h * i) / 6}" stroke="${line}" stroke-dasharray="2 4"/>`;
    return `<span class="small muted">완성 모양</span><svg viewBox="0 0 160 176" role="img" aria-label="완성 모양 도면"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ${f} stroke="${ink}"/>${rows}<text x="80" y="166" text-anchor="middle" font-size="11" fill="${mute}">${p.a} × ${b}cm · ${pp.bodyRows}단</text></svg>`;
  }
  if (p.object === "tube") {
    // a ring seen from the front: two ellipses joined
    const hh = Math.max(24, Math.min(110, ((p.h as number) / p.a) * 300)), y0 = 80 - hh / 2;
    return `<span class="small muted">완성 모양</span><svg viewBox="0 0 160 176" role="img" aria-label="완성 모양 도면"><path d="M20 ${y0} L20 ${y0 + hh} A60 14 0 0 0 140 ${y0 + hh} L140 ${y0}" ${f} stroke="${ink}"/><ellipse cx="80" cy="${y0}" rx="60" ry="14" ${f} stroke="${ink}"/><line x1="20" y1="${y0 + hh / 2}" x2="140" y2="${y0 + hh / 2}" stroke="${line}" stroke-dasharray="2 4"/><text x="80" y="166" text-anchor="middle" font-size="11" fill="${mute}">둘레 ${p.a}cm · 높이 ${p.h}cm · ${pp.bodyRows}단</text></svg>`;
  }
  let top: string;
  if (p.shape === "circle") top = `<circle cx="80" cy="80" r="62" ${f} stroke="${ink}" stroke-width="1"/><circle cx="80" cy="80" r="41" fill="none" stroke="${line}" stroke-dasharray="2 4"/><circle cx="80" cy="80" r="20" fill="none" stroke="${line}" stroke-dasharray="2 4"/><text x="80" y="166" text-anchor="middle" font-size="11" fill="${mute}">지름 ${p.a}cm</text>`;
  else { const h = Math.max(36, 140 * b / p.a), y = 80 - h / 2, rx = p.shape === "oval" ? h / 2 : 8; top = `<rect x="10" y="${y}" width="140" height="${h}" rx="${rx}" ${f} stroke="${ink}"/><text x="80" y="166" text-anchor="middle" font-size="11" fill="${mute}">${p.a} × ${b}cm</text>`; }
  let side = "";
  if (p.object === "bag" && !p.topA && !p.flapCm && !p.handleCm) side = `<g transform="translate(190,0)">${p.handle !== "none" ? `<path d="M40 44 Q80 ${p.handle === "long" ? -10 : 8} 120 44" fill="none" stroke="${ink}"/>` : ""}<rect x="14" y="44" width="132" height="104" ${f} stroke="${ink}"/><line x1="14" y1="54" x2="146" y2="54" stroke="${line}" stroke-dasharray="2 4"/><line x1="14" y1="138" x2="146" y2="138" stroke="${line}" stroke-dasharray="2 4"/><text x="80" y="166" text-anchor="middle" font-size="11" fill="${mute}">높이 ${p.h}cm · 몸통 ${pp.bodyRows}단</text></g>`;
  else if (p.object === "bag") {
    // side view with the bag options: a body wider at the top (trapezoid), a flap over the opening,
    // a handle whose arc rises with its length (25cm low ... 120cm+ high, clipped at the top)
    const wide = p.topA && p.topA > p.a ? Math.min(1.9, p.topA / p.a) : 1, bw = 132 / wide, x0 = 80 - bw / 2;
    const body = `<path d="M${x0} 148 L${80 + bw / 2} 148 L146 44 L14 44 Z" ${f} stroke="${ink}"/>`;
    const cm = p.handle === "none" ? 0 : p.handleCm || (p.handle === "long" ? 90 : 25), arc = Math.max(-40, 30 - cm * 0.6);
    const handle = cm ? `<path d="M38 44 Q80 ${arc} 122 44" fill="none" stroke="${ink}"/>` : "";
    const fh = p.flapCm ? Math.min(90, (p.flapCm / (p.h as number)) * 104) : 0;
    const flap = fh ? `<path d="M14 44 L146 44 L146 ${44 + fh * 0.75} Q80 ${44 + fh * 1.12} 14 ${44 + fh * 0.75} Z" fill="var(--paper, #FBF3EA)" fill-opacity=".85" stroke="${ink}"/><circle cx="80" cy="${44 + fh * 0.86}" r="2.6" fill="none" stroke="${ink}"/>` : "";
    const lab = [`높이 ${p.h}cm`, wide > 1 ? `입구 ${p.topA}cm` : "", p.flapCm ? `덮개 ${p.flapCm}cm` : "", cm ? `손잡이 ${cm}cm` : ""].filter(Boolean).join(" · ");
    side = `<g transform="translate(190,0)">${handle}${body}<line x1="${x0 + (14 - x0) * 0.1}" y1="138" x2="${146 - (146 - 80 - bw / 2) * 0.1}" y2="138" stroke="${line}" stroke-dasharray="2 4"/>${flap}<text x="80" y="166" text-anchor="middle" font-size="10.5" fill="${mute}">${lab}</text></g>`;
  }
  return `<span class="small muted">완성 모양</span><svg viewBox="0 0 ${p.object === "bag" ? 360 : 160} 176" role="img" aria-label="완성 모양 도면">${top}${side}</svg>`;
}
