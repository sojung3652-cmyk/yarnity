// Flat outlines (x, z) used for tubes lying on a cover.
export function roundedRectXZ(w: number, d: number, r: number, perCorner = 10): [number, number][] {
  const pts: [number, number][] = [];
  const cs: [number, number, number][] = [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, Math.PI / 2], [-w / 2 + r, -d / 2 + r, Math.PI], [w / 2 - r, -d / 2 + r, 1.5 * Math.PI]];
  for (const [cx, cz, a0] of cs) for (let i = 0; i <= perCorner; i++) { const a = a0 + (Math.PI / 2) * i / perCorner; pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); }
  return pts;
}
