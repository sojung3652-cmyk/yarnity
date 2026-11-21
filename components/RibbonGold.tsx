"use client";
// Raised gold foil on the lavender bookmark ribbons: the logo's yarn ball (cut out of logo-mark.svg with a
// circular mask, not redrawn) and a thin gold line inside each edge. Gold = a dark -> mid -> light
// gradient with fine grain; raised (embossed, the opposite of the home logo's deboss) by lighting a
// positive height map from the upper left, plus a faint shadow down-right onto the ribbon.
// Sizes are in the ribbon's own units (w x h); the SVG fills the ribbon.
import { useId } from "react";

// the yarn ball in logo-mark.svg (1170 x 579 units)
const BALL = { cx: 1081, cy: 489, r: 87 };

/** `full`: the whole ribbon is gold leaf (raised edges, a fine cloth grain) with the yarn ball pressed into
 *  it; `notch` = where the V cut rises to (fraction of the height). */
export function RibbonGold({ w, h, ball, ballY, lineInset, lineEnd, full, notch = 0.82 }: { w: number; h: number; ball: number; ballY: number; lineInset: number; lineEnd: number; full?: boolean; notch?: number }) {
  if (full) return <RibbonGoldLeaf w={w} h={h} ball={ball} ballY={ballY} notch={notch} />;
  const id = useId().replace(/:/g, ""), g = `rg${id}`, m = `rm${id}`, c = `rc${id}`, f = `rf${id}`, wt = `rw${id}`;
  const s = ball / 2 / BALL.r, cx = w / 2;
  return (
    <svg className="rib-gold" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#927238" /><stop offset=".45" stopColor="#C4A15B" /><stop offset=".7" stopColor="#EDDCA6" /><stop offset="1" stopColor="#AF8947" />
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
          <feSpecularLighting in="bump" surfaceScale="2.2" specularConstant=".9" specularExponent="16" lightingColor="#FCF2D5" result="spec"><feDistantLight azimuth="225" elevation="42" /></feSpecularLighting>
          <feComposite in="gold" in2="diff" operator="arithmetic" k1="1.32" k2="0" k3="0" k4="0" result="shaded" />
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3=".85" k4="0" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" result="foil" />
          {/* standing off the ribbon: a faint shadow down-right */}
          <feOffset in="SourceAlpha" dx=".6" dy=".8" result="o" />
          <feGaussianBlur in="o" stdDeviation=".6" result="ob" />
          <feFlood floodColor="#46302A" floodOpacity=".38" />
          <feComposite in2="ob" operator="in" result="shadow" />
          <feMerge><feMergeNode in="shadow" /><feMergeNode in="foil" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${f})`}><rect width={w} height={h} fill={`url(#${g})`} mask={`url(#${m})`} /></g>
    </svg>
  );
}

/** The gold-leaf material shared by the ribbon and the AI index tab (AiTab.tsx): antique gold gradient,
 *  fine cloth grain and beaten-leaf mottling, raised edges lit from the upper left. Put the returned defs
 *  in an <svg>'s <defs> and paint a shape with fill={`url(#${ids.g})`} (and the weave) under filter ids.fr. */
export function leafIds(id: string) { return { g: `lg${id}`, weave: `lv${id}`, fr: `lf${id}` }; }
export function GoldLeafDefs({ ids }: { ids: ReturnType<typeof leafIds> }) {
  return (
    <>
      <linearGradient id={ids.g} x1="0" y1="0" x2="1" y2="1">
        {/* antique gold, matching the foil wordmark (FoilLogo) rather than brass */}
        <stop offset="0" stopColor="#846C40" /><stop offset=".3" stopColor="#B9A06D" /><stop offset=".52" stopColor="#E1D1A9" />
        <stop offset=".72" stopColor="#A98E56" /><stop offset="1" stopColor="#886E3F" />
      </linearGradient>
      <pattern id={ids.weave} width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height=".45" fill="#543D16" opacity=".14" /><rect width=".45" height="2" fill="#FBF1CC" opacity=".12" /></pattern>
      {/* the leaf: grain, raised edges */}
      <filter id={ids.fr} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        {/* fine grain (stronger) and a faint, larger mottling, like beaten leaf */}
        <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="5" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  .7 .7 0 0 -.5" result="grain" />
        <feComposite in="grain" in2="SourceAlpha" operator="in" result="grainIn" />
        <feBlend in="SourceGraphic" in2="grainIn" mode="overlay" result="g1" />
        <feTurbulence type="fractalNoise" baseFrequency=".18" numOctaves="2" seed="9" result="m" />
        <feColorMatrix in="m" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  .5 .5 0 0 -.35" result="mottle" />
        <feComposite in="mottle" in2="SourceAlpha" operator="in" result="mottleIn" />
        <feBlend in="g1" in2="mottleIn" mode="soft-light" result="g2" />
        {/* about 20% less saturated: quieter, more expensive-looking gold */}
        <feColorMatrix in="g2" type="saturate" values=".8" result="gold" />
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="bump" />
        <feDiffuseLighting in="bump" surfaceScale="3" diffuseConstant="1" lightingColor="#fff" result="diff"><feDistantLight azimuth="225" elevation="60" /></feDiffuseLighting>
        <feSpecularLighting in="bump" surfaceScale="3" specularConstant=".7" specularExponent="14" lightingColor="#FCF2D5" result="spec"><feDistantLight azimuth="225" elevation="45" /></feSpecularLighting>
        <feComposite in="gold" in2="diff" operator="arithmetic" k1="1.18" k2="0" k3="0" k4="0" result="shaded" />
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
        <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3=".6" k4="0" result="lit" />
        <feComposite in="lit" in2="SourceAlpha" operator="in" />
      </filter>
    </>
  );
}

/** The whole ribbon in gold leaf: gradient + fine cloth grain, raised at its edges (positive height map lit
 *  from the upper left), with the logo's yarn ball debossed into it (negative height map: shade on the
 *  upper-left inner walls, a lit lower-right lip). */
function RibbonGoldLeaf({ w, h, ball, ballY, notch }: { w: number; h: number; ball: number; ballY: number; notch: number }) {
  const id = useId().replace(/:/g, ""), L = leafIds(id), gb = `lb${id}`, m = `lm${id}`, c = `lc${id}`, fb = `ld${id}`, wt = `lw${id}`;
  const s = ball / 2 / BALL.r, cx = w / 2, shape = `M0 0H${w}V${h}L${cx} ${h * notch}L0 ${h}Z`;
  return (
    <svg className="rib-gold rib-gold-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <GoldLeafDefs ids={L} />
        <linearGradient id={gb} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#786138" /><stop offset="1" stopColor="#A28958" /></linearGradient>
        <filter id={wt}><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter>
        <clipPath id={c}><circle cx={cx} cy={ballY} r={ball / 2} /></clipPath>
        <mask id={m} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <image href="/pic/logo-mark.svg" x={cx - BALL.cx * s} y={ballY - BALL.cy * s} width={1170 * s} height={579 * s} clipPath={`url(#${c})`} filter={`url(#${wt})`} />
        </mask>
        {/* the ball pressed in: shade on its upper-left walls, a lit lower-right lip */}
        <filter id={fb} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceAlpha" dx=".9" dy=".9" result="sh" />
          <feComposite in="SourceAlpha" in2="sh" operator="out" result="rimTL" />
          <feGaussianBlur in="rimTL" stdDeviation=".5" result="rimTLb" />
          <feFlood floodColor="#463114" floodOpacity=".75" />
          <feComposite in2="rimTLb" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="inner" />
          <feOffset in="SourceAlpha" dx=".7" dy=".7" result="lipS" />
          <feComposite in="lipS" in2="SourceAlpha" operator="out" result="lip" />
          <feGaussianBlur in="lip" stdDeviation=".4" result="lipB" />
          <feFlood floodColor="#FAEEC5" floodOpacity=".9" />
          <feComposite in2="lipB" operator="in" result="lipLight" />
          <feMerge><feMergeNode in="lipLight" /><feMergeNode in="SourceGraphic" /><feMergeNode in="inner" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${L.fr})`}><path d={shape} fill={`url(#${L.g})`} /><path d={shape} fill={`url(#${L.weave})`} /></g>
      <g filter={`url(#${fb})`}><rect width={w} height={h} fill={`url(#${gb})`} mask={`url(#${m})`} /></g>
    </svg>
  );
}
