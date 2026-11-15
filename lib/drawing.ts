// "완성 모양" SVG (top view + side view for bags). Pure string builder, ported from the prototype.
import type { Plan, PlanInput } from "./pattern";

export function drawing(p: PlanInput, pp: Plan): string {
  const ink = "var(--ink)", mute = "var(--muted)", line = "var(--muted)";
  const b = p.b as number;
  let top: string;
  if (p.shape === "circle") top = `<circle cx="80" cy="80" r="62" fill="none" stroke="${ink}" stroke-width="1"/><circle cx="80" cy="80" r="41" fill="none" stroke="${line}" stroke-dasharray="2 4"/><circle cx="80" cy="80" r="20" fill="none" stroke="${line}" stroke-dasharray="2 4"/><text x="80" y="166" text-anchor="middle" font-size="11" fill="${mute}">지름 ${p.a}cm</text>`;
  else { const h = Math.max(36, 140 * b / p.a), y = 80 - h / 2, rx = p.shape === "oval" ? h / 2 : 8; top = `<rect x="10" y="${y}" width="140" height="${h}" rx="${rx}" fill="none" stroke="${ink}"/><text x="80" y="166" text-anchor="middle" font-size="11" fill="${mute}">${p.a} × ${b}cm</text>`; }
  let side = "";
  if (p.object === "bag") side = `<g transform="translate(190,0)">${p.handle !== "none" ? `<path d="M40 44 Q80 ${p.handle === "long" ? -10 : 8} 120 44" fill="none" stroke="${ink}"/>` : ""}<rect x="14" y="44" width="132" height="104" fill="none" stroke="${ink}"/><line x1="14" y1="54" x2="146" y2="54" stroke="${line}" stroke-dasharray="2 4"/><line x1="14" y1="138" x2="146" y2="138" stroke="${line}" stroke-dasharray="2 4"/><text x="80" y="166" text-anchor="middle" font-size="11" fill="${mute}">높이 ${p.h}cm · 몸통 ${pp.bodyRows}단</text></g>`;
  return `<span class="small muted">완성 모양</span><svg viewBox="0 0 ${p.object === "bag" ? 360 : 160} 176" role="img" aria-label="완성 모양 도면">${top}${side}</svg>`;
}
