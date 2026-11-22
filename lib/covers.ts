// Girl's Diary book covers (Kim's designs, public/mobile/diary/bookcover/diary_cover_<id>.webp, 360px wide; the
// PNG originals stay out of git). Four sets of ten (Kim, 2026-11-22): a 꽃 자수 (a framed cloth cover, a flower in
// the corner), b 레이스와 리본, e 무늬 천 (printed fabric), h 금실 자수 (two-tone cloth, gold embroidery).
// A work picks one after its pattern is made; its name is written on the cover's blank name plate. `plate`: the
// plate's box in % of the picture [left, top, width, height], measured from the pictures (the pale, smooth plate
// among the woven cloth) and checked by eye on a contact sheet.
/** `ar`: the picture's width / height - the books are sized by height so they stand in a line (Kim) */
export interface Cover { id: string; ar: number; plate: [number, number, number, number]; dark?: boolean }

export const COVERS: Cover[] = [
  { id: "a_01", ar: 0.7031, plate: [27.8, 19.5, 52.8, 8.4] },
  { id: "a_02", ar: 0.7073, plate: [26.9, 18.7, 52.2, 8.8] },
  { id: "a_03", ar: 0.7171, plate: [26.9, 18.7, 52.5, 8.8] },
  { id: "a_04", ar: 0.7143, plate: [26.9, 18.7, 52.8, 8.5] },
  { id: "a_05", ar: 0.7143, plate: [26.9, 18.7, 52.5, 9.1] },
  { id: "a_06", ar: 0.7059, plate: [26.7, 17.3, 53.6, 9.0] },
  { id: "a_07", ar: 0.7073, plate: [27.2, 17.1, 52.5, 9.0] },
  { id: "a_08", ar: 0.7101, plate: [26.9, 17.2, 52.8, 9.3] },
  { id: "a_09", ar: 0.7143, plate: [27.2, 17.7, 53.3, 9.1] },
  { id: "a_10", ar: 0.7143, plate: [26.9, 17.5, 52.8, 9.1] },
  { id: "b_01", ar: 0.7362, plate: [36.7, 16.4, 46.4, 10.8] },
  { id: "b_02", ar: 0.7143, plate: [36.7, 17.1, 48.6, 10.9] },
  { id: "b_03", ar: 0.7214, plate: [33.9, 17.2, 49.2, 11.0] },
  { id: "b_04", ar: 0.7258, plate: [33.6, 16.9, 48.3, 10.9] },
  { id: "b_05", ar: 0.7273, plate: [37.2, 17.4, 47.8, 10.9] },
  { id: "b_06", ar: 0.75, plate: [37.8, 15.2, 47.2, 11.2] },
  { id: "b_07", ar: 0.7377, plate: [34.7, 15.8, 48.9, 11.3] },
  { id: "b_08", ar: 0.7392, plate: [33.3, 15.4, 50.0, 11.3] },
  { id: "b_09", ar: 0.7438, plate: [28.6, 14.7, 50.6, 11.2] },
  { id: "b_10", ar: 0.7469, plate: [33.6, 15.4, 49.7, 11.4] },
  { id: "e_01", ar: 0.7273, plate: [28.6, 18.8, 55.3, 10.9] },
  { id: "e_02", ar: 0.7171, plate: [29.2, 18.7, 54.2, 11.0] },
  { id: "e_03", ar: 0.7171, plate: [28.6, 18.7, 54.7, 11.0] },
  { id: "e_04", ar: 0.7273, plate: [29.2, 18.8, 54.2, 10.9] },
  { id: "e_05", ar: 0.7229, plate: [28.9, 18.9, 54.2, 10.8] },
  { id: "e_06", ar: 0.7157, plate: [28.6, 18.9, 55.0, 10.9] },
  { id: "e_07", ar: 0.7115, plate: [29.2, 19.0, 54.2, 10.7] },
  { id: "e_08", ar: 0.7115, plate: [28.9, 19.0, 54.7, 10.7] },
  { id: "e_09", ar: 0.7214, plate: [29.7, 19.0, 53.9, 10.6] },
  { id: "e_10", ar: 0.7157, plate: [28.9, 18.9, 54.7, 10.7] },
  { id: "h_01", ar: 0.6923, plate: [33.1, 17.1, 51.4, 10.2] },
  { id: "h_02", ar: 0.6729, plate: [33.3, 16.8, 51.9, 10.7] },
  { id: "h_03", ar: 0.6792, plate: [33.1, 17.2, 51.7, 10.4] },
  { id: "h_04", ar: 0.6792, plate: [32.5, 17.2, 52.2, 10.4] },
  { id: "h_05", ar: 0.6704, plate: [33.1, 17.1, 51.9, 10.4] },
  { id: "h_06", ar: 0.7031, plate: [33.1, 16.0, 50.6, 10.7] },
  { id: "h_07", ar: 0.6831, plate: [31.1, 16.3, 51.7, 10.4] },
  { id: "h_08", ar: 0.6897, plate: [33.1, 16.3, 51.4, 10.5] },
  { id: "h_09", ar: 0.6897, plate: [32.8, 16.3, 51.1, 10.5] },
  { id: "h_10", ar: 0.6805, plate: [32.8, 16.4, 51.9, 10.4] },
];

/** the widest cover's width / height: it fills its width, the narrower ones keep its height */
export const COVER_AR_MAX = 0.75;

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
