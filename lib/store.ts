// localStorage wrapper, same keys and JSON shape as the prototype:
//   iyarn.theme    "light" | "dark"
//   iyarn.projects Project[]
//   iyarn.active   project id | null
//   iyarn.draft    Draft
export const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
