// Phones: the screens that are pages of the open 3D book (besides the menu and 도안 만들기), and their order
// in it (the page turns forward to a later one, back to an earlier one). /mine is the same page as /library.
import { MOBILE_QUERY } from "./useMobile";

// (after the menu 0 and 도안 만들기's sheets, step x 2 + sheet: up to 9)
export const BOOK_PAGES: Record<string, number> = { "/library": 10, "/mine": 10, "/pattern": 11, "/track": 12 };
/** the page a path shows in the book on phones (/mine -> /library), or null */
export const bookPageOf = (path: string | null | undefined) => (path && path in BOOK_PAGES ? (path === "/mine" ? "/library" : path) : null);
export const isPhone = () => typeof window !== "undefined" && matchMedia(MOBILE_QUERY).matches;
