// Girl's Diary book covers (Kim's designs, public/mobile/diary/bookcover/diary_cover_<id>.webp, 360px wide; the
// PNG originals stay out of git). Four sets of ten (Kim, 2026-11-22): a 꽃 자수 (a framed cloth cover, a flower in
// the corner), b 레이스와 리본, e 무늬 천 (printed fabric), h 금실 자수 (two-tone cloth, gold embroidery).
// A work picks one after its pattern is made; its name is written on the cover's blank name plate. `plate`: the
// plate's box in % of the picture [left, top, width, height], measured from the pictures (the pale, smooth plate
// among the woven cloth) and checked by eye on a contact sheet.
export interface Cover { id: string; plate: [number, number, number, number]; dark?: boolean }

export const COVERS: Cover[] = [
  { id: "a_01", plate: [27.8, 19.3, 53.3, 8.7] },
  { id: "a_02", plate: [27.2, 18.4, 53.1, 8.9] },
  { id: "a_03", plate: [26.7, 18.6, 53.6, 8.7] },
  { id: "a_04", plate: [26.7, 18.6, 53.9, 9.0] },
  { id: "a_05", plate: [26.9, 18.7, 53.6, 8.8] },
  { id: "a_06", plate: [26.4, 17.1, 54.4, 9.1] },
  { id: "a_07", plate: [26.9, 17.0, 53.6, 9.2] },
  { id: "a_08", plate: [27.2, 16.9, 53.1, 9.3] },
  { id: "a_09", plate: [27.8, 17.4, 53.9, 9.2] },
  { id: "a_10", plate: [26.9, 17.3, 53.3, 9.2] },
  { id: "b_01", plate: [36.1, 16.7, 47.2, 11.2] },
  { id: "b_02", plate: [36.1, 17.4, 49.4, 11.3] },
  { id: "b_03", plate: [33.3, 17.7, 50.3, 11.0] },
  { id: "b_04", plate: [33.3, 17.3, 48.9, 11.3] },
  { id: "b_05", plate: [36.7, 17.4, 48.6, 11.1] },
  { id: "b_06", plate: [37.5, 15.8, 48.3, 11.4] },
  { id: "b_07", plate: [34.4, 16.1, 50.0, 11.4] },
  { id: "b_08", plate: [33.3, 15.5, 50.8, 11.7] },
  { id: "b_09", plate: [28.1, 15.0, 51.9, 11.5] },
  { id: "b_10", plate: [33.9, 15.8, 50.3, 11.5] },
  { id: "e_01", plate: [27.5, 18.3, 58.3, 11.3] },
  { id: "e_02", plate: [28.1, 18.4, 57.2, 11.4] },
  { id: "e_03", plate: [27.5, 18.5, 57.5, 11.2] },
  { id: "e_04", plate: [27.8, 18.5, 56.9, 11.2] },
  { id: "e_05", plate: [27.5, 18.5, 57.5, 11.2] },
  { id: "e_06", plate: [27.5, 18.7, 57.8, 11.0] },
  { id: "e_07", plate: [28.1, 18.5, 57.2, 11.3] },
  { id: "e_08", plate: [28.1, 18.8, 57.5, 11.0] },
  { id: "e_09", plate: [28.6, 18.6, 56.9, 11.3] },
  { id: "e_10", plate: [27.8, 18.6, 57.8, 11.2] },
  { id: "h_01", plate: [31.1, 15.6, 56.4, 11.3] },
  { id: "h_02", plate: [31.9, 15.8, 56.7, 11.1] },
  { id: "h_03", plate: [31.4, 15.8, 56.4, 11.2] },
  { id: "h_04", plate: [31.4, 15.8, 56.7, 11.2] },
  { id: "h_05", plate: [31.1, 15.6, 57.2, 11.4] },
  { id: "h_06", plate: [31.4, 14.9, 55.8, 11.6] },
  { id: "h_07", plate: [29.2, 15.2, 56.7, 11.3] },
  { id: "h_08", plate: [31.4, 15.1, 56.1, 11.2] },
  { id: "h_09", plate: [31.1, 15.3, 56.1, 11.0] },
  { id: "h_10", plate: [31.1, 15.3, 56.9, 11.3] },
];

/** the cover sets as the picker shows them */
export const COVER_SETS: { title: string; prefix: string }[] = [
  { title: "꽃 자수", prefix: "a_" },
  { title: "레이스와 리본", prefix: "b_" },
  { title: "무늬 천", prefix: "e_" },
  { title: "금실 자수", prefix: "h_" },
];

// works that picked one of the earlier covers (removed 2026-11-22) keep a cover from the set closest to it
const LEGACY: Record<string, string> = {
  "01": "b_01", "02": "b_02", "03": "b_03", "04": "b_04", "05": "b_05", "06": "b_06", "07": "b_07", "08": "b_08", "09": "b_09", "10": "b_10", "11": "b_01", "12": "b_03",
  dark_01: "h_05", dark_02: "h_06", dark_03: "h_09", dark_04: "h_10",
  simple_01: "a_01", simple_02: "a_02", simple_03: "a_03", simple_04: "a_04", simple_05: "a_05", simple_06: "a_06", simple_07: "a_07", simple_08: "a_08", simple_09: "a_09", simple_10: "a_10",
};

const BY_ID = new Map(COVERS.map(c => [c.id, c]));
export const coverOf = (id?: string | null) => (id ? BY_ID.get(id) ?? BY_ID.get(LEGACY[id] ?? "") ?? null : null);
export const coverSrc = (id: string) => `/mobile/diary/bookcover/diary_cover_${id}.webp`;
