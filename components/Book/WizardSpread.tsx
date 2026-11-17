"use client";
// 도안 만들기 inside the one 3D book: the very same two pages as the one-page /new (useNewBook in
// components/newbook/NewBook.tsx: progress, question, inputs, folds, woven labels, folios, the gold
// ribbon), laid on the book's left and right pages. Each page is its own <form> with the same submit /
// Enter handling, since the two pages are separate DOM trees.
// The page boxes are plain screen rectangles over the pages (Book3D FlatPages: the camera looks straight
// down, no CSS 3D transform). Each page is laid out at the original page's width (REF_W) and zoomed to its
// box (--z, --hz set by FlatPages): zoom re-lays the text at its final size, so it stays sharp and the
// composition is the same at any book size.
import { createPortal } from "react-dom";
import { useNewBook } from "@/components/newbook/NewBook";
import type { WizStep } from "./BookProvider";

/** the width each page is laid out at before zooming to the page: the original /new page on a 1440px
 *  screen ((1320 - 2 * 18) / 2), so the type is the original's on the page */
export const REF_W = 642;

/** `step`: the step whose pages are in the book now (during a page turn it can lag behind the address). */
export function WizardSpread({ step, left, right }: { step: WizStep; left: HTMLElement; right: HTMLElement }) {
  const v = useNewBook(step);
  if (!v.ready) return null;
  const form = (side: "l" | "r", children: React.ReactNode) => (
    <form className={"nb-book nb-in3d nb-in3d-" + side} noValidate onSubmit={v.onSubmit} onKeyDown={v.onKeyDown}>{children}</form>
  );
  return (
    <>
      {createPortal(form("l", v.left), left)}
      {createPortal(form("r", <>{v.ribbon}{v.right}</>), right)}
      {/* the AI sheet sits beside the book, on the screen (outside the page boxes) */}
      {createPortal(v.ai, document.body)}
    </>
  );
}
