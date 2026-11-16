"use client";
// A collapsible row for the book pages: one 44px line (label left, current value right, a small chevron),
// a hairline under it, no box. Opening it reveals its content under the line (0.2s; instant with reduced
// motion). The page keeps one row open at a time: pass `open` and `onToggle` from a shared state.
import { useId, useState, type ReactNode } from "react";

export function Fold({ label, value, open, onToggle, children }: { label: string; value?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  const id = useId();
  const empty = value == null || value === "" || (Array.isArray(value) && !value.length);
  return (
    <div className={"nb-fold" + (open ? " open" : "")}>
      <button type="button" className="nb-fold-row" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <span className="nb-fold-label">{label}</span>
        <span className={"nb-fold-value" + (empty ? " nb-none" : "")}>{empty ? "선택 안 함" : value}</span>
        <span className="nb-fold-chev" aria-hidden="true">›</span>
      </button>
      <div className="nb-fold-body" id={id} role="region" aria-label={label} inert={!open}>
        <div className="nb-fold-inner">{children}</div>
      </div>
    </div>
  );
}

/** Shared "one open at a time" state for a page: [openKey, toggle(key)]. */
export function useOneOpen(initial: string | null = null) {
  const [open, setOpen] = useState<string | null>(initial);
  return [open, (k: string) => setOpen(o => (o === k ? null : k))] as const;
}
