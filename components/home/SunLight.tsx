// Sunlight on the floor: soft beams from a window at the upper left, slanting ~24 degrees down to the
// right, with narrow darker gaps (the window bars' shadows). Irregular widths and spacing so it never
// reads as a window shape or regular stripes. Strongest at the upper left, gone by ~75% of the stage;
// dimmed ~40% behind the logo and the button so the gold foil stays legible. Each beam sways a little
// (transform/opacity only, 26s, different phases); still with reduced motion. Strength: --sun-strength.
//
// Built from CSS gradients, not SVG blur: each beam's soft edges are in its own gradient, so nothing is
// re-blurred while it moves (a blur filter per beam over a screen-sized layer stalled rendering), and
// the motion is compositor-only. Plain alpha compositing: .hero-stage is transformed (its own group),
// so mix-blend-mode in here could not see the floor colour; on this light floor, low-opacity cream gives
// the warm brightening that screen / soft-light would. Styles: .sun-* in globals.css.

// beams across the light: centre offset and width, in % of the stage height (stage = 1871 x 841).
// Target look: Kim's reference (wide bright beams over the whole floor, darker bands between them).
const BEAMS = [
  { y: -30, w: 16, a: 0.8 },
  { y: -9, w: 19, a: 1 },
  { y: 13, w: 14, a: 0.9 },
  { y: 33, w: 20, a: 0.95 },
  { y: 56, w: 13, a: 0.75 },
  { y: 76, w: 17, a: 0.65 },
  { y: 99, w: 12, a: 0.5 },
];
// window-bar shadows between some beams (irregular)
const BARS = [{ y: -19.5, w: 2.2 }, { y: 3.4, w: 1.6 }, { y: 22.5, w: 2.6 }, { y: 45.3, w: 1.9 }, { y: 66, w: 2.4 }];
// the window frame's cross bars: across the beams near the window (upper left), fading with distance;
// position along the light and width in % of the stage width
const CROSS = [{ x: 2, w: 2.6, a: 1 }, { x: 11.5, w: 2.2, a: 0.6 }];

export function SunLight() {
  return (
    <div className="hero-sun" aria-hidden="true">
      <div className="sun-rays">
        {BEAMS.map((b, i) => (
          <div key={i} className={`sun-beam sun-beam-${i}`} style={{ top: `${b.y - b.w / 2}%`, height: `${b.w}%`, ["--a" as string]: b.a }} />
        ))}
        {BARS.map((b, i) => <div key={i} className="sun-bar" style={{ top: `${b.y - b.w / 2}%`, height: `${b.w}%` }} />)}
        {CROSS.map((c, i) => <div key={i} className="sun-cross" style={{ left: `${c.x}%`, width: `${c.w}%`, opacity: c.a }} />)}
      </div>
    </div>
  );
}
