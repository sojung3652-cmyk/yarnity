"use client";
// Yarnity wordmark as debossed gold foil. Used on the home hero and on the open book's page.
import { useId } from "react";

/** The wordmark as debossed gold foil (hot-foil stamping): a gold gradient with fine grain, masked by the
 *  logo, pressed into the paper and lit from the upper left (the backdrop photo's light). Values are in
 *  the logo's 1170 x 579 units (~0.2-0.3 screen px). */
export function FoilLogo({ className = "pg-foil", shine }: { className?: string; shine?: boolean }) {
  const id = useId().replace(/:/g, "");
  const W = 1170, H = 579, g = `g${id}`, m = `m${id}`, f = `f${id}`, w = `w${id}`, s = `s${id}`;
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
          {/* Debossed: the foil lies flat at the bottom of the impression. Cues that read as "pressed in"
              (and not as a raised, rounded stroke): the paper edge casts a clear shadow into the groove along
              its upper-left side; only the lower-right inner wall, facing the light, catches a thin highlight;
              no shading on the paper outside the letters (that reads as a drop shadow = raised). */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="-3" diffuseConstant="1" lightingColor="#ffffff" result="diff">
            <feDistantLight azimuth="225" elevation="55" />
          </feDiffuseLighting>
          <feComposite in="gold" in2="diff" operator="arithmetic" k1="1.18" k2="0" k3="0" k4="0" result="shaded" />
          <feComposite in="shaded" in2="SourceAlpha" operator="in" result="foilIn" />
          {/* shadow cast into the groove by its upper-left paper edge */}
          <feOffset in="SourceAlpha" dx="7" dy="7" result="shifted" />
          <feComposite in="SourceAlpha" in2="shifted" operator="out" result="rimTL" />
          <feGaussianBlur in="rimTL" stdDeviation="3" result="rimTLb" />
          <feFlood floodColor="#3E2A12" floodOpacity="0.72" />
          <feComposite in2="rimTLb" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="innerShade" />
          {/* thin light on the lower-right inner wall */}
          <feOffset in="SourceAlpha" dx="-4" dy="-4" result="shifted2" />
          <feComposite in="SourceAlpha" in2="shifted2" operator="out" result="rimBR" />
          <feGaussianBlur in="rimBR" stdDeviation="1.2" result="rimBRb" />
          <feFlood floodColor="#FFF6DC" floodOpacity="0.75" />
          <feComposite in2="rimBRb" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="innerLight" />
          <feMerge><feMergeNode in="foilIn" /><feMergeNode in="innerShade" /><feMergeNode in="innerLight" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${f})`}><rect width={W} height={H} fill={`url(#${g})`} mask={`url(#${m})`} /></g>
      {/* shine (Kim's pick, corrected: "로고 외부에 윤곽선을 따라"): a soft gold light slides along the
          OUTLINE around the letters, left to right - a thin ring just outside the logo (the logo grown by a few
          units minus the logo itself, softly blurred) lit by a moving band. 2.4s ease-in-out, then rests 6s;
          hidden with reduced motion (globals.css .foil-shine) */}
      {shine && (
        <g className="foil-shine">
          <defs>
            <filter id={`o${id}`} x="-2%" y="-4%" width="104%" height="108%">
              <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" result="shape" />
              <feMorphology in="shape" operator="dilate" radius="7" result="grown" />
              <feComposite in="grown" in2="shape" operator="out" result="ring" />
              <feGaussianBlur in="ring" stdDeviation="2.2" />
            </filter>
            <mask id={`r${id}`} maskUnits="userSpaceOnUse" x="-30" y="-30" width={W + 60} height={H + 60}>
              <image href="/pic/logo-mark.svg" width={W} height={H} filter={`url(#o${id})`} />
            </mask>
            <linearGradient id={s} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="300" y2="120">
              <stop offset="0" stopColor="#E9C978" stopOpacity="0" />
              <stop offset=".4" stopColor="#E9C978" stopOpacity=".55" />
              <stop offset=".5" stopColor="#FFF1C4" stopOpacity="1" />
              <stop offset=".6" stopColor="#E9C978" stopOpacity=".55" />
              <stop offset="1" stopColor="#E9C978" stopOpacity="0" />
              <animateTransform attributeName="gradientTransform" type="translate" values="-420 0; 1270 0; 1270 0" keyTimes="0; .2857; 1"
                calcMode="spline" keySplines=".45 0 .55 1; 0 0 1 1" dur="8.4s" repeatCount="indefinite" />
            </linearGradient>
          </defs>
          <rect x="-30" y="-30" width={W + 60} height={H + 60} fill={`url(#${s})`} mask={`url(#r${id})`} />
        </g>
      )}
    </svg>
  );
}
