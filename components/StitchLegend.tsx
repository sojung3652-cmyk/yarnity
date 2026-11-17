// The chart's key: the symbols this work uses (lib/stitchSymbols.ts paths, as on a symbol table), then what
// the colours mean (this row / rows done).
import { SYM_FILL, SYM_KO, SYM_PATH, type StitchSym } from "@/lib/stitchSymbols";

export function SymIcon({ sym, size = 18 }: { sym: StitchSym; size?: number }) {
  return (
    <svg className="sym" width={size} height={size} viewBox="-0.6 -0.6 1.2 1.2" aria-hidden="true">
      <path d={SYM_PATH[sym]} fill={SYM_FILL[sym] ? "currentColor" : "none"} stroke={SYM_FILL[sym] ? "none" : "currentColor"} strokeWidth={0.09} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StitchLegend({ syms }: { syms: StitchSym[] }) {
  return (
    <div className="legend sym-legend">
      <div className="sym-keys">{syms.map(s => <span key={s}><SymIcon sym={s} />{SYM_KO[s]}</span>)}</div>
      <div className="sym-states">
        <span><i className="sw" style={{ background: "var(--dot-now)" }} />지금 뜨는 단</span>
        <span><i className="sw" style={{ background: "var(--dot)" }} />뜬 단</span>
        <span><i className="sw" style={{ background: "var(--dot-future)" }} />앞으로 뜰 단</span>
      </div>
    </div>
  );
}
