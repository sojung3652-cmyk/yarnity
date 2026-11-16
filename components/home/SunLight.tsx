// Sunlight on the floor: soft beams from a window at the upper left, slanting ~24 degrees down to the
// right, with narrow darker gaps (the window bars' shadows). Irregular widths and spacing so it never
// reads as a window shape or regular stripes. Strongest at the upper left, gone by ~75% of the stage;
// dimmed ~40% behind the logo and the button so the gold foil stays legible. Each beam sways a little
// (transform/opacity only, 26s, different phases); still with reduced motion. Strength: --sun-strength.
//
// Blend: plain alpha compositing. .hero-stage is transformed (its own compositing group), so
// mix-blend-mode in here could not see the floor colour (it is the parent's background); on this light
// floor, low-opacity cream gives the warm brightening that screen / soft-light would.

// beams across the light, in the rotated frame: centre offset and width (px of the 1871 x 841 stage)
const BEAMS = [
  { y: -150, w: 58, a: 0.72 },
  { y: -18, w: 112, a: 1 },
  { y: 128, w: 74, a: 0.82 },
  { y: 262, w: 118, a: 0.92 },
  { y: 418, w: 64, a: 0.66 },
  { y: 540, w: 96, a: 0.55 },
];
// window-bar shadows: between some beams, not all (irregular)
const BARS = [{ y: -84, w: 14 }, { y: 197, w: 11 }, { y: 342, w: 16 }];

export function SunLight() {
  return (
    <svg className="hero-sun" viewBox="0 0 1871 841" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
      <defs>
        <filter id="sunBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22" /></filter>
        <filter id="barBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="maskBlur"><feGaussianBlur stdDeviation="60" /></filter>
        {/* strongest at the upper left, nearly gone by 75% of the stage width */}
        <linearGradient id="sunFade" x1="0" y1="0" x2="1" y2="0.45">
          <stop offset="0" stopColor="#fff" /><stop offset=".35" stopColor="#bbb" /><stop offset=".6" stopColor="#444" /><stop offset=".75" stopColor="#000" />
        </linearGradient>
        <mask id="sunMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1871" height="841">
          <rect width="1871" height="841" fill="url(#sunFade)" />
          {/* ~40% less light behind the logo, caption and button */}
          <ellipse cx="388" cy="420" rx="290" ry="230" fill="#000" opacity=".4" filter="url(#maskBlur)" />
        </mask>
      </defs>
      <g mask="url(#sunMask)">
        <rect className="sun-shade" width="1871" height="841" />
        <g transform="rotate(24)">
          {BEAMS.map((b, i) => (
            <g key={i} className={`sun-beam sun-beam-${i}`}>
              <rect x="-400" y={b.y - b.w / 2} width="2600" height={b.w} filter="url(#sunBlur)" style={{ opacity: b.a }} />
            </g>
          ))}
          {BARS.map((b, i) => <rect key={i} className="sun-bar" x="-400" y={b.y - b.w / 2} width="2600" height={b.w} filter="url(#barBlur)" />)}
        </g>
      </g>
    </svg>
  );
}
