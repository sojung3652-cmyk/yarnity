// The finished piece seen from the front (Kim: 완성 모양 with the 3D's front view): a small JPEG per work, kept in
// this browser beside the works - never in the draft or the work itself (those go to the server and to the AI).
// Each is kept with when it was taken and with the 3D's drawing version: a work changed after it (도안 고치기) or a
// 3D drawn differently since (V) takes a new one.
const K = (id: string) => "iyarn.shot." + id, V = 2;
type Kept = { u: string; at: number; v: number };
const read = (id: string): Kept | null => {
  try { const s = localStorage.getItem(K(id)); if (!s) return null; if (s.startsWith("data:")) return { u: s, at: 0, v: 1 }; return JSON.parse(s) as Kept; } catch { return null; }
};
export const shots = {
  /** the picture, if it is the 3D's current way of drawing and newer than `after` (the work's last change) */
  get(id: string, after = 0): string | null { const k = read(id); return k && k.v === V && k.at >= after ? k.u : null; },
  set(id: string, u: string) { try { localStorage.setItem(K(id), JSON.stringify({ u, at: Date.now(), v: V })); } catch { /* full or blocked: not kept */ } },
  /** the draft's picture becomes the saved work's (taken now, as the work is saved) */
  drop(id: string) { try { localStorage.removeItem(K(id)); } catch { /* */ } },
  move(from: string, to: string) { const k = read(from); if (k && k.v === V) shots.set(to, k.u); try { localStorage.removeItem(K(from)); } catch { /* */ } },
};
