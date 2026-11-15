"use client";
// "<" close button shown on the open book (top left of the stage). Esc does the same (useBookState).
export function CloseChevron({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <button type="button" className={"close-chevron" + (open ? " on" : "")} aria-label="책 닫기" tabIndex={open ? 0 : -1} aria-hidden={!open} onClick={onClose}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    </button>
  );
}
