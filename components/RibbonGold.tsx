"use client";
// Raised gold foil on the lavender bookmark ribbons: the logo's yarn ball (cut out of logo-mark.svg with a
// circular mask, not redrawn) and a thin gold line inside each edge. Gold = a dark -> mid -> light
// gradient with fine grain; raised (embossed, the opposite of the home logo's deboss) by lighting a
// positive height map from the upper left, plus a faint shadow down-right onto the ribbon.
// Sizes are in the ribbon's own units (w x h); the SVG fills the ribbon.
import { useId } from "react";

// the yarn ball in logo-mark.svg (1170 x 579 units)
const BALL = { cx: 1081, cy: 489, r: 87 };

export function RibbonGold({ w, h, ball, ballY, lineInset, lineEnd }: { w: number; h: number; ball: number; ballY: number; lineInset: number; lineEnd: number }) {
  const id = useId().replace(/:/g, ""), g = `rg${id}`, m = `rm${id}`, c = `rc${id}`, f = `rf${id}`, wt = `rw${id}`;
  const s = ball / 2 / BALL.r, cx = w / 2;
  return (
    <svg className="rib-gold" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9A7430" /><stop offset=".45" stopColor="#CDA452" /><stop offset=".7" stopColor="#F3DFA0" /><stop offset="1" stopColor="#B88C3E" />
        </linearGradient>
        <filter id={wt}><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter>
        <clipPath id={c}><circle cx={cx} cy={ballY} r={ball / 2} /></clipPath>
        <mask id={m} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <image href="/pic/logo-mark.svg" x={cx - BALL.cx * s} y={ballY - BALL.cy * s} width={1170 * s} height={579 * s} clipPath={`url(#${c})`} filter={`url(#${wt})`} />
          <rect x={lineInset} y="0" width="1" height={lineEnd} fill="#fff" />
          <rect x={w - lineInset - 1} y="0" width="1" height={lineEnd} fill="#fff" />
        </mask>
        <filter id={f} x="-30%" y="-10%" width="160%" height="130%" colorInterpolationFilters="sRGB">
          {/* fine grain in the gold */}
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  .4 .4 0 0 -.3" result="grain" />
          <feComposite in="grain" in2="SourceAlpha" operator="in" result="grainIn" />
          <feBlend in="SourceGraphic" in2="grainIn" mode="overlay" result="gold" />
          {/* raised: positive height map lit from the upper left -> light upper-left edges, dark lower-right edges */}
          <feGaussianBlur in="SourceAlpha" stdDeviation=".45" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="2.2" diffuseConstant="1.05" lightingColor="#fff" result="diff"><feDistantLight azimuth="225" elevation="58" /></feDiffuseLighting>
          <feSpecularLighting in="bump" surfaceScale="2.2" specularConstant=".9" specularExponent="16" lightingColor="#FFF4D2" result="spec"><feDistantLight azimuth="225" elevation="42" /></feSpecularLighting>
          <feComposite in="gold" in2="diff" operator="arithmetic" k1="1.32" k2="0" k3="0" k4="0" result="shaded" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3=".85" k4="0" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" result="foil" />
          {/* standing off the ribbon: a faint shadow down-right */}
          <feOffset in="SourceAlpha" dx=".6" dy=".8" result="o" />
          <feGaussianBlur in="o" stdDeviation=".6" result="ob" />
          <feFlood floodColor="#3B2A55" floodOpacity=".38" />
          <feComposite in2="ob" operator="in" result="shadow" />
          <feMerge><feMergeNode in="shadow" /><feMergeNode in="foil" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${f})`}><rect width={w} height={h} fill={`url(#${g})`} mask={`url(#${m})`} /></g>
    </svg>
  );
}
