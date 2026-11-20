// Girl's Diary book covers (Kim's designs, public/mobile/diary/bookcover/diary_cover_<id>.webp, 360px wide).
// A work picks one after its pattern is made; its name is written on the cover's blank name plate. `plate`:
// the plate's box in % of the picture [left, top, width, height], found from the pictures (the pale, smooth
// plate among the woven cloth) and checked by eye on a contact sheet.
export interface Cover { id: string; plate: [number, number, number, number]; dark?: boolean }

export const COVERS: Cover[] = [
  { id: "01", plate: [42.7, 64.1, 42.7, 11.0] },
  { id: "02", plate: [37.3, 67.5, 38.2, 10.8] },
  { id: "03", plate: [31.8, 64.4, 38.2, 11.5] },
  { id: "04", plate: [33.2, 67.4, 35.9, 11.3] },
  { id: "05", plate: [45.9, 65.5, 42.3, 11.5] },
  { id: "06", plate: [32.3, 70.8, 42.3, 10.9] },
  { id: "07", plate: [31.8, 68.8, 44.5, 12.5] },
  { id: "08", plate: [26.4, 69.7, 41.8, 12.3] },
  { id: "09", plate: [42.3, 67.3, 41.8, 12.8] },
  { id: "10", plate: [35.5, 67.2, 43.2, 12.9] },
  { id: "11", plate: [44.1, 67.4, 44.5, 12.9] },
  { id: "12", plate: [31.8, 67.6, 45.9, 13.4] }, // cropped: another book stood at its left edge
  { id: "dark_01", plate: [46.4, 73.4, 39.5, 11.3], dark: true },
  { id: "dark_02", plate: [39.1, 73.6, 38.2, 11.2], dark: true },
  { id: "dark_03", plate: [52.3, 73.1, 30.5, 10.7], dark: true },
  { id: "dark_04", plate: [26.4, 73.2, 40.5, 11.3], dark: true },
  { id: "simple_01", plate: [26.8, 70.7, 44.5, 11.5] },
  { id: "simple_02", plate: [28.2, 66.6, 44.1, 11.4] },
  { id: "simple_03", plate: [35.0, 67.6, 42.7, 11.5] },
  { id: "simple_04", plate: [26.8, 46.0, 48.6, 11.3] },
  { id: "simple_05", plate: [28.6, 69.6, 46.8, 11.5] },
  { id: "simple_06", plate: [26.8, 67.9, 47.3, 11.3] },
  { id: "simple_07", plate: [22.3, 56.9, 47.3, 11.2] },
  { id: "simple_08", plate: [30.5, 32.4, 48.2, 15.9] },
  { id: "simple_09", plate: [40.0, 65.3, 46.8, 11.7] },
  { id: "simple_10", plate: [25.0, 70.6, 46.8, 11.4] },
];

const BY_ID = new Map(COVERS.map(c => [c.id, c]));
export const coverOf = (id?: string | null) => (id ? BY_ID.get(id) ?? null : null);
export const coverSrc = (id: string) => `/mobile/diary/bookcover/diary_cover_${id}.webp`;
