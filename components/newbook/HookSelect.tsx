"use client";
// Hook size as one select box ("5호 · 3.0mm ›"). The list opens below it (height capped so it stays on the
// page) with "직접 입력 (mm)" last. Keyboard: Enter/Space/ArrowDown opens, arrows move, Enter picks, Esc
// closes. Built as a button + listbox so the custom entry can live in the same list.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { HOOK_CHIPS } from "@/lib/yarn";

const CUSTOM = "__custom";

export function HookSelect({ value, custom, onPick, onCustom, invalid, describedBy }: { value: string; custom: boolean; onPick: (key: string, mm: number) => void; onCustom: () => void; invalid?: boolean; describedBy?: string }) {
  const id = useId(), [open, setOpen] = useState(false), [cur, setCur] = useState(0);
  const btn = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null);
  const opts = [...HOOK_CHIPS.map(([k, mm]) => ({ key: k, label: `${k} · ${mm.toFixed(1)}mm`, mm })), { key: CUSTOM, label: "직접 입력 (mm)", mm: NaN }];
  const sel = custom ? opts.length - 1 : opts.findIndex(o => o.key === value);
  const shown = custom ? "직접 입력" : sel >= 0 ? opts[sel].label : "고르기";

  useEffect(() => { if (open) { setCur(Math.max(0, sel)); requestAnimationFrame(() => list.current?.focus()); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!(e.target as Element).closest?.(`[data-hs="${id}"]`)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, [open, id]);

  const choose = (i: number) => {
    const o = opts[i]; setOpen(false); btn.current?.focus();
    if (o.key === CUSTOM) onCustom(); else onPick(o.key, o.mm);
  };
  const keyList = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCur(c => Math.min(opts.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCur(c => Math.max(0, c - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setCur(0); }
    else if (e.key === "End") { e.preventDefault(); setCur(opts.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); choose(cur); }
    else if (e.key === "Escape" || e.key === "Tab") { if (e.key === "Escape") e.preventDefault(); setOpen(false); btn.current?.focus(); }
  };
  useEffect(() => { list.current?.querySelector(`[data-i="${cur}"]`)?.scrollIntoView({ block: "nearest" }); }, [cur]);

  return (
    <div className="nb-select" data-hs={id}>
      <button ref={btn} type="button" className="nb-select-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={id + "l"} aria-invalid={invalid || undefined} aria-describedby={describedBy}
        aria-label={`코바늘 굵기: ${shown}`}
        onClick={() => setOpen(o => !o)} onKeyDown={e => { if (e.key === "ArrowDown" || ((e.key === "Enter" || e.key === " ") && !open)) { e.preventDefault(); e.stopPropagation(); setOpen(true); } }}>
        <span>{shown}</span><span className="nb-fold-chev" aria-hidden="true">›</span>
      </button>
      {open && (
        <ul ref={list} id={id + "l"} className="nb-select-list" role="listbox" tabIndex={-1} aria-label="코바늘 굵기" aria-activedescendant={`${id}o${cur}`} onKeyDown={keyList}>
          {opts.map((o, i) => (
            <li key={o.key} id={`${id}o${i}`} data-i={i} role="option" aria-selected={i === sel} className={(i === cur ? "cur " : "") + (o.key === CUSTOM ? "custom" : "")}
              onMouseEnter={() => setCur(i)} onClick={() => choose(i)}>{o.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
