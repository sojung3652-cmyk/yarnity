// While the 3D preview covers the screen, the book's own canvas stops drawing (Book3D reads this and sets
// its frameloop to "never"); closing the preview turns it back on.
let paused = false;
const subs = new Set<() => void>();
export const bookPause = {
  set(v: boolean) { if (paused !== v) { paused = v; subs.forEach(f => f()); } },
  get: () => paused,
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
};
