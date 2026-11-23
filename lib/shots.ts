// The finished piece seen from the front (Kim: 완성 모양 with the 3D's front view): a small JPEG per work, kept in
// this browser beside the works - never in the draft or the work itself (those go to the server and to the AI).
const K = (id: string) => "iyarn.shot." + id;
export const shots = {
  get(id: string): string | null { try { return localStorage.getItem(K(id)); } catch { return null; } },
  set(id: string, url: string) { try { localStorage.setItem(K(id), url); } catch { /* full or blocked: not kept */ } },
  /** the draft's picture becomes the saved work's */
  move(from: string, to: string) { const u = shots.get(from); if (u) { shots.set(to, u); try { localStorage.removeItem(K(from)); } catch { /* */ } } },
};
