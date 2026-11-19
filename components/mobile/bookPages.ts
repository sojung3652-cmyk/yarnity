// Phones: the screens that are pages of the open 3D book (besides the menu and 도안 만들기), and their order
// in it (the page turns forward to a later one, back to an earlier one). /mine is the same page as /library.
import { MOBILE_QUERY } from "./useMobile";

export const BOOK_PAGES: Record<string, number> = { "/library": 5, "/mine": 5, "/pattern": 6, "/track": 7 };
/** the page a path shows in the book on phones (/mine -> /library), or null */
export const bookPageOf = (path: string | null | undefined) => (path && path in BOOK_PAGES ? (path === "/mine" ? "/library" : path) : null);
export const isPhone = () => typeof window !== "undefined" && matchMedia(MOBILE_QUERY).matches;
