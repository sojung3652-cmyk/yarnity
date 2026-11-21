// A term's chart symbol, drawn as on a crochet chart (the same shapes the app's own charts use for ch, sc, sl,
// inc and the ring: lib/stitchSymbols.ts; the rest in that hand). A term without one shows the first letter
// of its name.
import { SYM_PATH } from "@/lib/stitchSymbols";
import type { GlossTerm } from "@/lib/glossary";

const T = "M0 0.45V-0.42M-0.24 -0.42H0.24"; // a post with its top bar (hdc, and the base of the taller stitches)
const PATH: Record<string, { d: string; fill?: boolean }> = {
  ch: { d: SYM_PATH.ch },
  sc: { d: SYM_PATH.sc },
  slst: { d: SYM_PATH.sl, fill: true },
  mr: { d: SYM_PATH.ring },
  inc: { d: SYM_PATH.inc },
  // two scs joined at the top
  dec: { d: "M0 -0.45L-0.27 0.42M0 -0.45L0.27 0.42M-0.31 0.05H-0.04M0.04 0.05H0.31" },
  hdc: { d: T },
  dc: { d: `${T}M-0.15 0.08L0.15 -0.1` },
  tr: { d: `${T}M-0.15 0.18L0.15 0M-0.15 -0.04L0.15 -0.22` },
  // a dc taken around the post: the hook at its foot
  fp: { d: `${T}M-0.15 0.06L0.15 -0.12M0 0.45C0.22 0.45 0.24 0.24 0.06 0.2` },
  // five dcs gathered at the top, closed
  popcorn: { d: "M0 0.45L-0.3 -0.3M0 0.45L-0.12 -0.36M0 0.45L0.12 -0.36M0 0.45L0.3 -0.3M-0.3 -0.3A0.31 0.16 0 0 1 0.3 -0.3" },
  // a puff: three dcs joined top and bottom
  bobble: { d: "M0 0.45Q-0.42 0 0 -0.42Q0.42 0 0 0.45M0 0.45V-0.42M-0.22 -0.42H0.22" },
  // an open mesh square
  filet: { d: "M-0.36 0.42V-0.42M0.36 0.42V-0.42M-0.36 -0.42H0.36M-0.36 0.42H0.36" },
};

export function GlossSymbol({ term, size }: { term: GlossTerm; size: number }) {
  const p = term.symbol ? PATH[term.symbol] : null;
  if (!p) return <span className="gl-sym-letter" style={{ fontSize: Math.round(size * 0.36) }} aria-hidden="true">{term.name.slice(0, 1)}</span>;
  return (
    <svg className="gl-sym" width={size * 0.56} height={size * 0.56} viewBox="-0.6 -0.6 1.2 1.2" aria-hidden="true">
      <path d={p.d} fill={p.fill ? "currentColor" : "none"} stroke={p.fill ? "none" : "currentColor"} strokeWidth={0.075} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
