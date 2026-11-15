"use client";

export function OpenButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button className="open-btn" id="openBook" type="button" aria-expanded={open} aria-controls="book" onClick={onToggle}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5m0-13c2-1.5 5-2 8.5-1.5v13c-3.5-.5-6.5 0-8.5 1.5m0-13v13" /></svg>
      <span>{open ? "Close book" : "Open book"}</span>
    </button>
  );
}
