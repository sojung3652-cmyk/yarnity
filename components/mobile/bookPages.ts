// Phones: the screens that are pages of the open 3D book (besides the menu and 도안 만들기), and their order
// in it (the page turns forward to a later one, back to an earlier one). 나의 도안집 (/mine) is its own
// screen on phones, not a page of the book (MobileMine.tsx); /library sends there.
import { MOBILE_QUERY } from "./useMobile";

// (after the menu 0 and 도안 만들기's sheets, step x 2 + sheet: up to 9)
// (none for now: 나의 도안집, 완성 도안 and 따라 뜨기 are their own screens on phones)
export const BOOK_PAGES: Record<string, number> = {};
/** the page a path shows in the book on phones, or null */
export const bookPageOf = (path: string | null | undefined) => (path && path in BOOK_PAGES ? path : null);
export const isPhone = () => typeof window !== "undefined" && matchMedia(MOBILE_QUERY).matches;
