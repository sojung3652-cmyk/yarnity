"use client";
// Yarnity wordmark as debossed gold foil. Used on the home hero and on the open book's page.
import { useId } from "react";

/** The wordmark as debossed gold foil (hot-foil stamping): a gold gradient with fine grain, masked by the
 *  logo; the logo's alpha, blurred, is a height map with negative scale (pressed into the paper) lit from
 *  the upper left (the backdrop photo's light), so the upper-left inner walls fall into shade and the
 *  foil catches a highlight where it slopes towards the light; the paper's lower-right lip of each
 *  impression catches a thin light edge. Values are in the logo's 1170 x 579 units (~0.2 screen px). */
export function FoilLogo({ className = "pg-foil" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const W = 1170, H = 579, g = `g${id}`, m = `m${id}`, f = `f${id}`, w = `w${id}`;
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="0.6">
          {/* soft antique gold, not brassy: the foil should read as a quiet accent on cream paper */}
          <stop offset="0" stopColor="#8A6E3A" /><stop offset=".18" stopColor="#C0A266" /><stop offset=".34" stopColor="#E6D3A4" />
          <stop offset=".5" stopColor="#B0904F" /><stop offset=".68" stopColor="#D9C18A" /><stop offset=".84" stopColor="#A08045" /><stop offset="1" stopColor="#CDB37C" />
        </linearGradient>
        <filter id={w}><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter>
        <mask id={m} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <image href="/pic/logo-mark.svg" width={W} height={H} filter={`url(#${w})`} />
        </mask>
        <filter id={f} x="-3%" y="-6%" width="106%" height="112%" colorInterpolationFilters="sRGB">
          {/* metallic grain */}
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  .5 .5 0 0 -.38" result="grain" />
          <feComposite in="grain" in2="SourceAlpha" operator="in" result="grainIn" />
          <feBlend in="SourceGraphic" in2="grainIn" mode="overlay" result="gold" />
          {/* height map: pressed in (negative surface scale) */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="-6" diffuseConstant="1.05" lightingColor="#ffffff" result="diff">
            <feDistantLight azimuth="225" elevation="48" />
          </feDiffuseLighting>
          <feSpecularLighting in="bump" surfaceScale="-6" specularConstant="0.9" specularExponent="22" lightingColor="#FFF4D2" result="spec">
            <feDistantLight azimuth="225" elevation="48" />
          </feSpecularLighting>
          <feComposite in="gold" in2="diff" operator="arithmetic" k1="1.15" k2="0" k3="0" k4="0" result="shaded" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" result="foil" />
          <feComposite in="foil" in2="SourceAlpha" operator="in" result="foilIn" />
          {/* inner shadow along the upper-left walls of the impression */}
          <feOffset in="SourceAlpha" dx="5" dy="5" result="shifted" />
          <feComposite in="SourceAlpha" in2="shifted" operator="out" result="rimTL" />
          <feGaussianBlur in="rimTL" stdDeviation="2.2" result="rimTLb" />
          <feFlood floodColor="#4A3214" floodOpacity="0.55" />
          <feComposite in2="rimTLb" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="innerShade" />
          {/* the paper's lower-right lip, lit */}
          <feOffset in="SourceAlpha" dx="4" dy="4" result="lipShift" />
          <feComposite in="lipShift" in2="SourceAlpha" operator="out" result="lip" />
          <feGaussianBlur in="lip" stdDeviation="1.6" result="lipB" />
          <feFlood floodColor="#FFFFFF" floodOpacity="0.85" />
          <feComposite in2="lipB" operator="in" result="lipLight" />
          {/* and its upper-left paper edge, a hair darker */}
          <feOffset in="SourceAlpha" dx="-3" dy="-3" result="edgeShift" />
          <feComposite in="edgeShift" in2="SourceAlpha" operator="out" result="edge" />
          <feGaussianBlur in="edge" stdDeviation="1.4" result="edgeB" />
          <feFlood floodColor="#6B5136" floodOpacity="0.28" />
          <feComposite in2="edgeB" operator="in" result="edgeShade" />
          <feMerge><feMergeNode in="lipLight" /><feMergeNode in="edgeShade" /><feMergeNode in="foilIn" /><feMergeNode in="innerShade" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${f})`}><rect width={W} height={H} fill={`url(#${g})`} mask={`url(#${m})`} /></g>
    </svg>
  );
}
